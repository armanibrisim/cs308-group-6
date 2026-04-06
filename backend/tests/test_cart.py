"""
Test cases for POST /cart/items (Add to Cart)
Run with: pytest tests/test_cart.py -v
"""

from unittest.mock import patch
from fastapi.testclient import TestClient

from app.main import app
from app.utils.security import create_access_token

client = TestClient(app)

CUSTOMER_TOKEN = create_access_token({"sub": "u@example.com", "email": "u@example.com", "role": "customer"})
AUTH = {"Authorization": f"Bearer {CUSTOMER_TOKEN}"}

USER_ID = "u@example.com"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _product(pid: str = "prod-1", stock: int = 10, price: float = 100.0) -> dict:
    return {
        "id": pid,
        "name": "Test Product",
        "model": "M1",
        "serial_number": "SN001",
        "description": "A great product",
        "stock_quantity": stock,
        "price": price,
        "warranty": "1 year",
        "distributor": "Dist Co",
        "category_id": "cat1",
        "image_url": None,
    }


def _cart(items: list | None = None) -> dict:
    return {"items": items or []}


def _cart_item(pid: str = "prod-1", qty: int = 1) -> dict:
    return {"product_id": pid, "quantity": qty}


# ---------------------------------------------------------------------------
# Test 1 — Successfully add a new item to an empty cart
# ---------------------------------------------------------------------------
def test_add_item_to_empty_cart():
    """
    GIVEN an authenticated customer and an in-stock product
    WHEN  POST /cart/items is called with quantity=1
    THEN  response is 200 with 1 item and correct totals
    """
    product = _product(stock=10, price=100.0)

    with patch("app.services.cart_service.get_product_by_id", return_value=product), \
         patch("app.services.cart_service.get_cart", side_effect=[
             _cart(),                                       # qty check: cart is empty
             _cart([_cart_item("prod-1", qty=1)]),          # get_user_cart: after add
         ]), \
         patch("app.services.cart_service.add_or_update_item") as mock_add:

        resp = client.post("/cart/items", json={"product_id": "prod-1", "quantity": 1}, headers=AUTH)

    assert resp.status_code == 200
    body = resp.json()
    assert len(body["items"]) == 1
    assert body["items"][0]["product_id"] == "prod-1"
    assert body["items"][0]["quantity"] == 1
    mock_add.assert_called_once_with(USER_ID, "prod-1", 1)


# ---------------------------------------------------------------------------
# Test 2 — Adding an item already in cart accumulates quantity
# ---------------------------------------------------------------------------
def test_add_item_accumulates_with_existing_quantity():
    """
    GIVEN a cart that already has 2 units of a product
    WHEN  POST /cart/items is called with quantity=3
    THEN  add_or_update_item is called with the combined quantity of 5
    """
    product = _product(stock=10, price=50.0)

    with patch("app.services.cart_service.get_product_by_id", return_value=product), \
         patch("app.services.cart_service.get_cart", side_effect=[
             _cart([_cart_item("prod-1", qty=2)]),          # qty check: existing 2
             _cart([_cart_item("prod-1", qty=5)]),          # get_user_cart: after add
         ]), \
         patch("app.services.cart_service.add_or_update_item") as mock_add:

        resp = client.post("/cart/items", json={"product_id": "prod-1", "quantity": 3}, headers=AUTH)

    assert resp.status_code == 200
    mock_add.assert_called_once_with(USER_ID, "prod-1", 5)


# ---------------------------------------------------------------------------
# Test 3 — Correct tax (8%) and shipping ($45) applied to subtotal
# ---------------------------------------------------------------------------
def test_add_item_totals_calculated_correctly():
    """
    GIVEN a product priced at $100 added with quantity=1
    WHEN  POST /cart/items is called
    THEN  subtotal=100, tax=8.0 (8%), shipping=45.0, total=153.0
    """
    product = _product(stock=10, price=100.0)

    with patch("app.services.cart_service.get_product_by_id", return_value=product), \
         patch("app.services.cart_service.get_cart", side_effect=[
             _cart(),
             _cart([_cart_item("prod-1", qty=1)]),
         ]), \
         patch("app.services.cart_service.add_or_update_item"):

        resp = client.post("/cart/items", json={"product_id": "prod-1", "quantity": 1}, headers=AUTH)

    body = resp.json()
    assert body["subtotal"] == 100.0
    assert body["tax"] == 8.0
    assert body["shipping"] == 45.0
    assert body["total"] == 153.0


# ---------------------------------------------------------------------------
# Test 4 — Free shipping when subtotal meets the threshold ($5,000)
# ---------------------------------------------------------------------------
def test_add_item_free_shipping_at_threshold():
    """
    GIVEN a product priced at $5,000 added with quantity=1
    WHEN  POST /cart/items is called
    THEN  shipping=0.0 (free shipping threshold met)
    """
    product = _product(stock=5, price=5000.0)

    with patch("app.services.cart_service.get_product_by_id", return_value=product), \
         patch("app.services.cart_service.get_cart", side_effect=[
             _cart(),
             _cart([_cart_item("prod-1", qty=1)]),
         ]), \
         patch("app.services.cart_service.add_or_update_item"):

        resp = client.post("/cart/items", json={"product_id": "prod-1", "quantity": 1}, headers=AUTH)

    assert resp.status_code == 200
    assert resp.json()["shipping"] == 0.0


# ---------------------------------------------------------------------------
# Test 5 — 404 when product does not exist
# ---------------------------------------------------------------------------
def test_add_item_product_not_found():
    """
    GIVEN a product_id that does not exist in the database
    WHEN  POST /cart/items is called
    THEN  response is 404 Not Found
    """
    with patch("app.services.cart_service.get_product_by_id", return_value=None):
        resp = client.post("/cart/items", json={"product_id": "ghost-id", "quantity": 1}, headers=AUTH)

    assert resp.status_code == 404
    assert resp.json()["detail"] == "Product not found"


# ---------------------------------------------------------------------------
# Test 6 — 409 when requested quantity exceeds available stock
# ---------------------------------------------------------------------------
def test_add_item_exceeds_stock():
    """
    GIVEN a product with only 3 units in stock
    WHEN  POST /cart/items is called with quantity=5
    THEN  response is 409 Conflict
    """
    product = _product(stock=3, price=100.0)

    with patch("app.services.cart_service.get_product_by_id", return_value=product):
        resp = client.post("/cart/items", json={"product_id": "prod-1", "quantity": 5}, headers=AUTH)

    assert resp.status_code == 409
    assert "stock" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Test 7 — 409 when accumulated cart quantity would exceed stock
# ---------------------------------------------------------------------------
def test_add_item_accumulated_quantity_exceeds_stock():
    """
    GIVEN a product with 5 units in stock and 3 already in the cart
    WHEN  POST /cart/items is called with quantity=3 (3+3=6 > 5)
    THEN  response is 409 Conflict
    """
    product = _product(stock=5, price=100.0)

    with patch("app.services.cart_service.get_product_by_id", return_value=product), \
         patch("app.services.cart_service.get_cart", return_value=_cart([_cart_item("prod-1", qty=3)])):

        resp = client.post("/cart/items", json={"product_id": "prod-1", "quantity": 3}, headers=AUTH)

    assert resp.status_code == 409
    assert "stock" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Test 8 — 422 when quantity is 0 (below Field(ge=1) minimum)
# ---------------------------------------------------------------------------
def test_add_item_invalid_quantity_zero():
    """
    GIVEN a request body with quantity=0
    WHEN  POST /cart/items is called
    THEN  response is 422 Unprocessable Entity (Pydantic validation error)
    """
    resp = client.post("/cart/items", json={"product_id": "prod-1", "quantity": 0}, headers=AUTH)

    assert resp.status_code == 422
    field_names = [e["loc"][-1] for e in resp.json()["detail"]]
    assert "quantity" in field_names


# ---------------------------------------------------------------------------
# Test 9 — 422 when product_id is missing from request body
# ---------------------------------------------------------------------------
def test_add_item_missing_product_id():
    """
    GIVEN a request body with no product_id field
    WHEN  POST /cart/items is called
    THEN  response is 422 Unprocessable Entity
    """
    resp = client.post("/cart/items", json={"quantity": 1}, headers=AUTH)

    assert resp.status_code == 422
    field_names = [e["loc"][-1] for e in resp.json()["detail"]]
    assert "product_id" in field_names


# ---------------------------------------------------------------------------
# Test 10 — 403 when no auth token is provided
# ---------------------------------------------------------------------------
def test_add_item_unauthenticated():
    """
    GIVEN no Authorization header
    WHEN  POST /cart/items is called
    THEN  response is 403 Forbidden (FastAPI returns 403 for missing credentials)
    """
    resp = client.post("/cart/items", json={"product_id": "prod-1", "quantity": 1})

    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Test 11 — Product manager can also add to cart (no role restriction on cart)
# ---------------------------------------------------------------------------
def test_add_item_accessible_to_product_manager():
    """
    GIVEN a JWT with role=product_manager
    WHEN  POST /cart/items is called with a valid product
    THEN  response is 200 (cart endpoint uses get_current_user, not require_role)
    """
    pm_token = create_access_token({"sub": "pm@example.com", "email": "pm@example.com", "role": "product_manager"})
    product = _product(stock=10, price=100.0)

    with patch("app.services.cart_service.get_product_by_id", return_value=product), \
         patch("app.services.cart_service.get_cart", side_effect=[
             _cart(),
             _cart([_cart_item("prod-1", qty=1)]),
         ]), \
         patch("app.services.cart_service.add_or_update_item"):

        resp = client.post(
            "/cart/items",
            json={"product_id": "prod-1", "quantity": 1},
            headers={"Authorization": f"Bearer {pm_token}"},
        )

    assert resp.status_code == 200
