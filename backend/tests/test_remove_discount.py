"""
Test cases for DELETE /sales/discounts/{product_id}
Run with: pytest tests/test_remove_discount.py -v
"""

from unittest.mock import patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.utils.security import create_access_token

client = TestClient(app)

SM_TOKEN = create_access_token({"sub": "sm@lumen.com", "email": "sm@lumen.com", "role": "sales_manager"})
AUTH = {"Authorization": f"Bearer {SM_TOKEN}"}


def _make_product(pid: str, price: float = 80.0, original_price: float = 100.0) -> dict:
    return {
        "id": pid,
        "name": f"Product {pid}",
        "model": "M1",
        "serial_number": "SN1",
        "description": "desc",
        "stock_quantity": 5,
        "price": price,
        "original_price": original_price,
        "discount_percent": 20.0,
        "warranty": "1 year",
        "distributor": "Dist",
        "category_id": "cat1",
        "created_at": "2026-01-01T00:00:00+00:00",
        "updated_at": "2026-01-01T00:00:00+00:00",
    }


# ---------------------------------------------------------------------------
# Test 1 — Happy path: discount removed, original price restored
# ---------------------------------------------------------------------------
def test_remove_discount_success():
    """
    GIVEN a product with an active discount
    WHEN  DELETE /sales/discounts/{product_id} is called by a sales_manager
    THEN  response is 200 and remove_discount repository method is called
    """
    product = _make_product("prod-1")
    restored = {**product, "price": 100.0, "original_price": None, "discount_percent": None}

    with patch("app.repositories.product_repository.get_product_by_id", side_effect=[product, restored]), \
         patch("app.repositories.product_repository.remove_discount") as mock_remove:

        resp = client.delete("/sales/discounts/prod-1", headers=AUTH)

    assert resp.status_code == 200
    mock_remove.assert_called_once_with("prod-1")
    assert resp.json()["price"] == 100.0


# ---------------------------------------------------------------------------
# Test 2 — 404 when product does not exist
# ---------------------------------------------------------------------------
def test_remove_discount_product_not_found():
    """
    GIVEN a product_id that does not exist
    WHEN  DELETE /sales/discounts/{product_id} is called
    THEN  response is 404 Not Found
    """
    with patch("app.repositories.product_repository.get_product_by_id", return_value=None):
        resp = client.delete("/sales/discounts/nonexistent", headers=AUTH)

    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Test 3 — 400 when product has no active discount
# ---------------------------------------------------------------------------
def test_remove_discount_no_discount_set():
    """
    GIVEN a product without an active discount (no original_price)
    WHEN  DELETE /sales/discounts/{product_id} is called
    THEN  response is 400 Bad Request
    """
    product_no_discount = {
        "id": "prod-2",
        "name": "Product prod-2",
        "model": "M1",
        "serial_number": "SN2",
        "description": "desc",
        "stock_quantity": 5,
        "price": 100.0,
        "warranty": "1 year",
        "distributor": "Dist",
        "category_id": "cat1",
        "created_at": "2026-01-01T00:00:00+00:00",
        "updated_at": "2026-01-01T00:00:00+00:00",
    }

    with patch("app.repositories.product_repository.get_product_by_id", return_value=product_no_discount):
        resp = client.delete("/sales/discounts/prod-2", headers=AUTH)

    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Test 4 — 403 for customer role
# ---------------------------------------------------------------------------
def test_remove_discount_forbidden_for_customer():
    """
    GIVEN a JWT with role=customer
    WHEN  DELETE /sales/discounts/{product_id} is called
    THEN  response is 403 Forbidden
    """
    customer_token = create_access_token({"sub": "c@c.com", "email": "c@c.com", "role": "customer"})
    resp = client.delete(
        "/sales/discounts/prod-1",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Test 5 — 401 when no token provided
# ---------------------------------------------------------------------------
def test_remove_discount_unauthorized():
    """
    GIVEN no Authorization header
    WHEN  DELETE /sales/discounts/{product_id} is called
    THEN  response is 403 (HTTPBearer returns 403 when no token is provided)
    """
    resp = client.delete("/sales/discounts/prod-1")
    assert resp.status_code == 403