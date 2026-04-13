"""
Test cases for POST /checkout
Run with: pytest tests/test_checkout.py -v
"""

from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.utils.security import create_access_token

client = TestClient(app)

CUSTOMER_TOKEN = create_access_token(
    {"sub": "customer@example.com", "email": "customer@example.com", "role": "customer"}
)
AUTH = {"Authorization": f"Bearer {CUSTOMER_TOKEN}"}
USER_ID = "customer@example.com"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _product(pid: str = "prod-1", name: str = "Test Product", stock: int = 10, price: float = 100.0) -> dict:
    return {
        "id": pid,
        "name": name,
        "stock_quantity": stock,
        "price": price,
    }


def _cart_item(pid: str = "prod-1", qty: int = 1) -> dict:
    return {"product_id": pid, "quantity": qty}


def _cart(items: list | None = None) -> dict:
    return {"items": items or []}


def _order(order_id: str = "order-1") -> dict:
    return {
        "id": order_id,
        "customer_id": USER_ID,
        "customer_email": USER_ID,
        "customer_name": "Test Customer",
        "delivery_address": "123 Main St",
        "items": [{"product_id": "prod-1", "product_name": "Test Product", "quantity": 1, "unit_price": 100.0, "subtotal": 100.0}],
        "subtotal": 100.0,
        "tax": 8.0,
        "shipping": 45.0,
        "total_amount": 153.0,
        "status": "processing",
        "invoice_id": None,
        "created_at": "2026-01-01T00:00:00+00:00",
        "updated_at": "2026-01-01T00:00:00+00:00",
    }


def _invoice(invoice_id: str = "inv-1") -> dict:
    return {
        "id": invoice_id,
        "customer_id": USER_ID,
        "customer_email": USER_ID,
        "customer_name": "Test Customer",
        "delivery_address": "123 Main St",
        "items": [{"product_id": "prod-1", "product_name": "Test Product", "quantity": 1, "unit_price": 100.0, "subtotal": 100.0}],
        "subtotal": 100.0,
        "tax": 8.0,
        "shipping": 45.0,
        "total_amount": 153.0,
        "created_at": "2026-01-01T00:00:00+00:00",
    }


def _user() -> dict:
    return {"first_name": "Test", "last_name": "Customer", "email": USER_ID}


VALID_PAYLOAD = {
    "delivery_address": "123 Main St, Istanbul",
    "card_last4": "1234",
    "card_holder_name": "Test Customer",
}


def _patch_all(cart_items=None, product=None, order_id="order-1", invoice_id="inv-1"):
    """Patch all external dependencies for a successful checkout."""
    if cart_items is None:
        cart_items = [_cart_item()]
    if product is None:
        product = _product()

    return [
        patch("app.routers.checkout.get_cart", return_value=_cart(cart_items)),
        patch("app.routers.checkout.get_product_by_id", return_value=product),
        patch("app.routers.checkout.get_user_by_id", return_value=_user()),
        patch("app.routers.checkout.decrement_stock"),
        patch("app.routers.checkout.order_repository.create_order", return_value=order_id),
        patch("app.routers.checkout.order_repository.get_order_by_id", return_value=_order(order_id)),
        patch("app.routers.checkout.order_repository.set_invoice_id"),
        patch("app.routers.checkout.invoice_repository.create_invoice", return_value=invoice_id),
        patch("app.routers.checkout.invoice_repository.get_invoice_by_id", return_value=_invoice(invoice_id)),
        patch("app.routers.checkout.delivery_repository.create_delivery"),
        patch("app.routers.checkout.generate_invoice_pdf", return_value=b"%PDF"),
        patch("app.routers.checkout.send_invoice_email"),
        patch("app.routers.checkout.clear_cart"),
    ]


# ---------------------------------------------------------------------------
# Test 1 — Başarılı ödeme 201 döner ve order + invoice içerir
# ---------------------------------------------------------------------------
def test_checkout_success_returns_order_and_invoice():
    """
    GIVEN kimliği doğrulanmış müşteri, dolu sepet ve geçerli kart bilgisi
    WHEN  POST /checkout çağrıldığında
    THEN  201 döner ve yanıtta order ile invoice bulunur
    """
    patches = _patch_all()
    with patches[0], patches[1], patches[2], patches[3], patches[4], patches[5], \
         patches[6], patches[7], patches[8], patches[9], patches[10], patches[11], patches[12]:
        resp = client.post("/checkout", json=VALID_PAYLOAD, headers=AUTH)

    assert resp.status_code == 201
    body = resp.json()
    assert "order" in body
    assert "invoice" in body
    assert body["order"]["status"] == "processing"
    assert body["order"]["id"] == "order-1"
    assert body["invoice"]["id"] == "inv-1"


# ---------------------------------------------------------------------------
# Test 2 — Boş sepet 400 döner
# ---------------------------------------------------------------------------
def test_checkout_empty_cart_returns_400():
    """
    GIVEN kimliği doğrulanmış müşteri ve boş sepet
    WHEN  POST /checkout çağrıldığında
    THEN  400 Bad Request döner
    """
    with patch("app.routers.checkout.get_cart", return_value=_cart([])):
        resp = client.post("/checkout", json=VALID_PAYLOAD, headers=AUTH)

    assert resp.status_code == 400
    assert "empty" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Test 3 — Var olmayan ürün 400 döner
# ---------------------------------------------------------------------------
def test_checkout_nonexistent_product_returns_400():
    """
    GIVEN sepette artık DB'de bulunmayan bir ürün
    WHEN  POST /checkout çağrıldığında
    THEN  400 Bad Request döner
    """
    with patch("app.routers.checkout.get_cart", return_value=_cart([_cart_item()])), \
         patch("app.routers.checkout.get_product_by_id", return_value=None):
        resp = client.post("/checkout", json=VALID_PAYLOAD, headers=AUTH)

    assert resp.status_code == 400
    assert "no longer exists" in resp.json()["detail"]


# ---------------------------------------------------------------------------
# Test 4 — Yetersiz stok 409 döner
# ---------------------------------------------------------------------------
def test_checkout_insufficient_stock_returns_409():
    """
    GIVEN sepette stoktan fazla miktarda ürün olan bir sipariş
    WHEN  POST /checkout çağrıldığında
    THEN  409 Conflict döner
    """
    product = _product(stock=2)

    with patch("app.routers.checkout.get_cart", return_value=_cart([_cart_item(qty=5)])), \
         patch("app.routers.checkout.get_product_by_id", return_value=product):
        resp = client.post("/checkout", json=VALID_PAYLOAD, headers=AUTH)

    assert resp.status_code == 409
    assert "insufficient stock" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Test 5 — Reddedilen kart (last4="0000") 402 döner
# ---------------------------------------------------------------------------
def test_checkout_declined_card_returns_402():
    """
    GIVEN card_last4="0000" olan bir ödeme isteği (test-decline tetikleyici)
    WHEN  POST /checkout çağrıldığında
    THEN  402 Payment Required döner
    """
    payload = {**VALID_PAYLOAD, "card_last4": "0000"}

    with patch("app.routers.checkout.get_cart", return_value=_cart([_cart_item()])), \
         patch("app.routers.checkout.get_product_by_id", return_value=_product()), \
         patch("app.routers.checkout.get_user_by_id", return_value=_user()):
        resp = client.post("/checkout", json=payload, headers=AUTH)

    assert resp.status_code == 402
    assert "declined" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Test 6 — Ücretsiz kargo eşiği (subtotal >= 5000)
# ---------------------------------------------------------------------------
def test_checkout_free_shipping_above_threshold():
    """
    GIVEN subtotal'ı 5000 TL'yi geçen bir sipariş
    WHEN  POST /checkout çağrıldığında
    THEN  fatura shipping=0.0 olarak döner
    """
    product = _product(price=5000.0)
    free_order = {**_order(), "subtotal": 5000.0, "tax": 400.0, "shipping": 0.0, "total_amount": 5400.0}
    free_invoice = {**_invoice(), "subtotal": 5000.0, "tax": 400.0, "shipping": 0.0, "total_amount": 5400.0}

    with patch("app.routers.checkout.get_cart", return_value=_cart([_cart_item()])), \
         patch("app.routers.checkout.get_product_by_id", return_value=product), \
         patch("app.routers.checkout.get_user_by_id", return_value=_user()), \
         patch("app.routers.checkout.decrement_stock"), \
         patch("app.routers.checkout.order_repository.create_order", return_value="order-1"), \
         patch("app.routers.checkout.order_repository.get_order_by_id", return_value=free_order), \
         patch("app.routers.checkout.order_repository.set_invoice_id"), \
         patch("app.routers.checkout.invoice_repository.create_invoice", return_value="inv-1"), \
         patch("app.routers.checkout.invoice_repository.get_invoice_by_id", return_value=free_invoice), \
         patch("app.routers.checkout.delivery_repository.create_delivery"), \
         patch("app.routers.checkout.generate_invoice_pdf", return_value=b"%PDF"), \
         patch("app.routers.checkout.send_invoice_email"), \
         patch("app.routers.checkout.clear_cart"):
        resp = client.post("/checkout", json=VALID_PAYLOAD, headers=AUTH)

    assert resp.status_code == 201
    assert resp.json()["invoice"]["shipping"] == 0.0


# ---------------------------------------------------------------------------
# Test 7 — Vergi %8 doğru hesaplanır
# ---------------------------------------------------------------------------
def test_checkout_tax_is_8_percent():
    """
    GIVEN fiyatı 100 TL olan bir ürün
    WHEN  POST /checkout çağrıldığında
    THEN  vergi 8.0 TL (subtotal'ın %8'i) olarak döner
    """
    patches = _patch_all()
    with patches[0], patches[1], patches[2], patches[3], patches[4], patches[5], \
         patches[6], patches[7], patches[8], patches[9], patches[10], patches[11], patches[12]:
        resp = client.post("/checkout", json=VALID_PAYLOAD, headers=AUTH)

    assert resp.status_code == 201
    assert resp.json()["invoice"]["tax"] == 8.0
    assert resp.json()["invoice"]["subtotal"] == 100.0


# ---------------------------------------------------------------------------
# Test 8 — Kimlik doğrulama olmadan 403 döner
# ---------------------------------------------------------------------------
def test_checkout_unauthenticated_returns_403():
    """
    GIVEN Authorization header'ı olmayan bir istek
    WHEN  POST /checkout çağrıldığında
    THEN  403 Forbidden döner
    """
    resp = client.post("/checkout", json=VALID_PAYLOAD)

    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Test 9 — Eksik alan 422 döner (card_last4 olmadan)
# ---------------------------------------------------------------------------
def test_checkout_missing_card_last4_returns_422():
    """
    GIVEN card_last4 alanı eksik olan bir istek
    WHEN  POST /checkout çağrıldığında
    THEN  422 Unprocessable Entity döner (Pydantic doğrulama hatası)
    """
    payload = {"delivery_address": "123 Main St", "card_holder_name": "Test"}
    resp = client.post("/checkout", json=payload, headers=AUTH)

    assert resp.status_code == 422
    field_names = [e["loc"][-1] for e in resp.json()["detail"]]
    assert "card_last4" in field_names


# ---------------------------------------------------------------------------
# Test 10 — Birden fazla ürünle başarılı ödeme, sipariş toplamı doğru
# ---------------------------------------------------------------------------
def test_checkout_multiple_items_total_is_correct():
    """
    GIVEN sepette 2 farklı ürün olan bir sipariş (100 + 200 = 300 TL subtotal)
    WHEN  POST /checkout çağrıldığında
    THEN  201 döner; order total_amount = subtotal + tax + shipping ile uyuşur
    """
    product1 = _product("prod-1", "Product A", stock=5, price=100.0)
    product2 = _product("prod-2", "Product B", stock=5, price=200.0)
    cart_items = [_cart_item("prod-1", 1), _cart_item("prod-2", 1)]

    multi_order = {
        **_order(),
        "items": [
            {"product_id": "prod-1", "product_name": "Product A", "quantity": 1, "unit_price": 100.0, "subtotal": 100.0},
            {"product_id": "prod-2", "product_name": "Product B", "quantity": 1, "unit_price": 200.0, "subtotal": 200.0},
        ],
        "subtotal": 300.0,
        "tax": 24.0,
        "shipping": 45.0,
        "total_amount": 369.0,
    }
    multi_invoice = {**_invoice(), "subtotal": 300.0, "tax": 24.0, "shipping": 45.0, "total_amount": 369.0}

    def get_product_side_effect(pid):
        return product1 if pid == "prod-1" else product2

    with patch("app.routers.checkout.get_cart", return_value=_cart(cart_items)), \
         patch("app.routers.checkout.get_product_by_id", side_effect=get_product_side_effect), \
         patch("app.routers.checkout.get_user_by_id", return_value=_user()), \
         patch("app.routers.checkout.decrement_stock"), \
         patch("app.routers.checkout.order_repository.create_order", return_value="order-1"), \
         patch("app.routers.checkout.order_repository.get_order_by_id", return_value=multi_order), \
         patch("app.routers.checkout.order_repository.set_invoice_id"), \
         patch("app.routers.checkout.invoice_repository.create_invoice", return_value="inv-1"), \
         patch("app.routers.checkout.invoice_repository.get_invoice_by_id", return_value=multi_invoice), \
         patch("app.routers.checkout.delivery_repository.create_delivery"), \
         patch("app.routers.checkout.generate_invoice_pdf", return_value=b"%PDF"), \
         patch("app.routers.checkout.send_invoice_email"), \
         patch("app.routers.checkout.clear_cart"):
        resp = client.post("/checkout", json=VALID_PAYLOAD, headers=AUTH)

    assert resp.status_code == 201
    body = resp.json()
    assert body["order"]["subtotal"] == 300.0
    assert body["order"]["total_amount"] == 369.0
    assert len(body["order"]["items"]) == 2
