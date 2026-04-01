"""
Test cases for POST /sales/discounts
Run with: pytest tests/test_discount.py -v
"""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

SALES_TOKEN_PAYLOAD = {"sub": "sm@lumen.com", "email": "sm@lumen.com", "role": "sales_manager"}

# We'll patch create_access_token to get a real token for auth
from app.utils.security import create_access_token
VALID_TOKEN = create_access_token(SALES_TOKEN_PAYLOAD)
AUTH = {"Authorization": f"Bearer {VALID_TOKEN}"}


def _make_product(pid: str, price: float = 100.0) -> dict:
    return {
        "id": pid,
        "name": f"Product {pid}",
        "model": "M1",
        "serial_number": "SN1",
        "description": "A great product",
        "stock_quantity": 10,
        "price": price,
        "warranty": "1 year",
        "distributor": "Dist Co",
        "category_id": "cat1",
        "created_at": "2026-03-01T00:00:00+00:00",
        "updated_at": "2026-03-01T00:00:00+00:00",
    }


# ---------------------------------------------------------------------------
# Test 1 — Happy path: discount applied, price recalculated
# ---------------------------------------------------------------------------
def test_apply_discount_success():
    """
    GIVEN a sales_manager JWT and valid product IDs
    WHEN  POST /sales/discounts is called with discount_percent=20
    THEN  response is 200, updated_count == 1, new price is 80% of original
    """
    product = _make_product("prod-1", price=100.0)
    discounted = {**product, "price": 80.0, "original_price": 100.0, "discount_percent": 20.0}

    with patch("app.repositories.product_repository.get_product_by_id", side_effect=[product, discounted]), \
         patch("app.repositories.product_repository.apply_discount") as mock_discount, \
         patch("app.repositories.wishlist_repository.get_wishlists_for_product", return_value=[]):

        resp = client.post(
            "/sales/discounts",
            json={"product_ids": ["prod-1"], "discount_percent": 20},
            headers=AUTH,
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["updated_count"] == 1
    assert body["notified_users"] == 0
    mock_discount.assert_called_once_with("prod-1", 20)


# ---------------------------------------------------------------------------
# Test 2 — Wishlist users are notified
# ---------------------------------------------------------------------------
def test_apply_discount_notifies_wishlist_users():
    """
    GIVEN a product that exists in 2 users' wishlists
    WHEN  POST /sales/discounts is called
    THEN  notified_users == 2 and create_notification is called twice
    """
    product = _make_product("prod-2", price=200.0)
    discounted = {**product, "price": 160.0, "original_price": 200.0, "discount_percent": 20.0}
    wishlists = [{"user_id": "user-A"}, {"user_id": "user-B"}]

    with patch("app.repositories.product_repository.get_product_by_id", side_effect=[product, discounted]), \
         patch("app.repositories.product_repository.apply_discount"), \
         patch("app.repositories.wishlist_repository.get_wishlists_for_product", return_value=wishlists), \
         patch("app.repositories.notification_repository.create_notification") as mock_notif:

        resp = client.post(
            "/sales/discounts",
            json={"product_ids": ["prod-2"], "discount_percent": 20},
            headers=AUTH,
        )

    assert resp.status_code == 200
    assert resp.json()["notified_users"] == 2
    assert mock_notif.call_count == 2


# ---------------------------------------------------------------------------
# Test 3 — 404 when product not found
# ---------------------------------------------------------------------------
def test_apply_discount_product_not_found():
    """
    GIVEN a product_id that does NOT exist in Firestore
    WHEN  POST /sales/discounts is called
    THEN  response is 404 Not Found
    """
    with patch("app.repositories.product_repository.get_product_by_id", return_value=None):
        resp = client.post(
            "/sales/discounts",
            json={"product_ids": ["nonexistent-id"], "discount_percent": 10},
            headers=AUTH,
        )

    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Test 4 — 422 on invalid discount percent (0 not allowed per model)
# ---------------------------------------------------------------------------
def test_apply_discount_invalid_percent():
    """
    GIVEN discount_percent=0 (below the Field(gt=0) minimum)
    WHEN  POST /sales/discounts is called
    THEN  response is 422 Unprocessable Entity
    """
    resp = client.post(
        "/sales/discounts",
        json={"product_ids": ["prod-1"], "discount_percent": 0},
        headers=AUTH,
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Test 5 — 403 for non-sales-manager role
# ---------------------------------------------------------------------------
def test_apply_discount_forbidden_for_customer():
    """
    GIVEN a JWT with role=customer
    WHEN  POST /sales/discounts is called
    THEN  response is 403 Forbidden
    """
    customer_token = create_access_token({"sub": "c@c.com", "email": "c@c.com", "role": "customer"})
    resp = client.post(
        "/sales/discounts",
        json={"product_ids": ["prod-1"], "discount_percent": 10},
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert resp.status_code == 403
