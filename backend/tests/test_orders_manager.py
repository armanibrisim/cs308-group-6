"""
Test cases for order management endpoints (sales_manager / product_manager)
  GET  /orders/all
  PATCH /orders/{id}/status
Run with: pytest tests/test_orders_manager.py -v
"""

from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.utils.security import create_access_token

client = TestClient(app)

SM_TOKEN = create_access_token({"sub": "sm@lumen.com", "email": "sm@lumen.com", "role": "sales_manager"})
PM_TOKEN = create_access_token({"sub": "pm@lumen.com", "email": "pm@lumen.com", "role": "product_manager"})
SM_AUTH = {"Authorization": f"Bearer {SM_TOKEN}"}
PM_AUTH = {"Authorization": f"Bearer {PM_TOKEN}"}


def _make_order(oid: str, status: str = "processing") -> dict:
    return {
        "id": oid,
        "customer_id": "user-1",
        "customer_email": "alice@test.com",
        "customer_name": "Alice Smith",
        "delivery_address": "123 Main St",
        "items": [
            {"product_id": "p1", "product_name": "Laptop", "quantity": 1, "unit_price": 1000.0, "subtotal": 1000.0}
        ],
        "subtotal": 1000.0,
        "tax": 80.0,
        "shipping": 0.0,
        "total_amount": 1080.0,
        "status": status,
        "invoice_id": "inv-1",
        "created_at": "2026-03-15T10:00:00+00:00",
        "updated_at": "2026-03-15T10:00:00+00:00",
    }


# ---------------------------------------------------------------------------
# Test 1 — GET /orders/all returns all orders for sales_manager
# ---------------------------------------------------------------------------
def test_list_all_orders_sales_manager():
    """
    GIVEN a sales_manager JWT
    WHEN  GET /orders/all is called
    THEN  response is 200 and returns all orders
    """
    orders = [_make_order("ord-1"), _make_order("ord-2", "delivered")]

    with patch("app.routers.orders.fetch_all_orders", return_value=orders):
        resp = client.get("/orders/all", headers=SM_AUTH)

    assert resp.status_code == 200
    assert len(resp.json()) == 2


# ---------------------------------------------------------------------------
# Test 2 — GET /orders/all with status filter
# ---------------------------------------------------------------------------
def test_list_all_orders_status_filter():
    """
    GIVEN a sales_manager JWT and status=processing query param
    WHEN  GET /orders/all?status=processing is called
    THEN  response is 200 and fetch_all_orders is called with status="processing"
    """
    orders = [_make_order("ord-1", "processing")]

    with patch("app.routers.orders.fetch_all_orders", return_value=orders) as mock_fetch:
        resp = client.get("/orders/all?status=processing", headers=SM_AUTH)

    assert resp.status_code == 200
    mock_fetch.assert_called_once_with("processing")


# ---------------------------------------------------------------------------
# Test 3 — GET /orders/all with invalid status returns 422
# ---------------------------------------------------------------------------
def test_list_all_orders_invalid_status():
    """
    GIVEN status=shipped (not a valid status value)
    WHEN  GET /orders/all?status=shipped is called
    THEN  response is 422 Unprocessable Entity
    """
    resp = client.get("/orders/all?status=shipped", headers=SM_AUTH)
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Test 4 — PATCH /orders/{id}/status (sales_manager uses free transitions)
# ---------------------------------------------------------------------------
def test_update_order_status_sales_manager_free_transition():
    """
    GIVEN a sales_manager JWT and an order in 'delivered' status
    WHEN  PATCH /orders/{id}/status is called with status='processing' (backwards)
    THEN  response is 200 (sales_manager allows free transitions)
    """
    updated = _make_order("ord-1", "processing")

    with patch("app.routers.orders.update_order_status_free", return_value=updated) as mock_free, \
         patch("app.routers.orders.update_order_status") as mock_linear:

        resp = client.patch(
            "/orders/ord-1/status",
            json={"status": "processing"},
            headers=SM_AUTH,
        )

    assert resp.status_code == 200
    assert resp.json()["status"] == "processing"
    mock_free.assert_called_once()
    mock_linear.assert_not_called()


# ---------------------------------------------------------------------------
# Test 5 — PATCH /orders/{id}/status (product_manager uses linear transitions)
# ---------------------------------------------------------------------------
def test_update_order_status_product_manager_linear_transition():
    """
    GIVEN a product_manager JWT
    WHEN  PATCH /orders/{id}/status is called
    THEN  update_order_status (linear) is called, not update_order_status_free
    """
    updated = _make_order("ord-1", "in-transit")

    with patch("app.routers.orders.update_order_status", return_value=updated) as mock_linear, \
         patch("app.routers.orders.update_order_status_free") as mock_free:

        resp = client.patch(
            "/orders/ord-1/status",
            json={"status": "in-transit"},
            headers=PM_AUTH,
        )

    assert resp.status_code == 200
    mock_linear.assert_called_once()
    mock_free.assert_not_called()


# ---------------------------------------------------------------------------
# Test 6 — PATCH /orders/{id}/status with invalid status returns 422
# ---------------------------------------------------------------------------
def test_update_order_status_invalid_value():
    """
    GIVEN status='cancelled' (not in the allowed enum)
    WHEN  PATCH /orders/{id}/status is called
    THEN  response is 422 Unprocessable Entity
    """
    resp = client.patch(
        "/orders/ord-1/status",
        json={"status": "cancelled"},
        headers=SM_AUTH,
    )
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Test 7 — 403 for customer role on /orders/all
# ---------------------------------------------------------------------------
def test_list_all_orders_forbidden_for_customer():
    """
    GIVEN a JWT with role=customer
    WHEN  GET /orders/all is called
    THEN  response is 403 Forbidden
    """
    customer_token = create_access_token({"sub": "c@c.com", "email": "c@c.com", "role": "customer"})
    resp = client.get(
        "/orders/all",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Test 8 — 403 for customer role on PATCH /orders/{id}/status
# ---------------------------------------------------------------------------
def test_update_order_status_forbidden_for_customer():
    """
    GIVEN a JWT with role=customer
    WHEN  PATCH /orders/{id}/status is called
    THEN  response is 403 Forbidden
    """
    customer_token = create_access_token({"sub": "c@c.com", "email": "c@c.com", "role": "customer"})
    resp = client.patch(
        "/orders/ord-1/status",
        json={"status": "in-transit"},
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert resp.status_code == 403