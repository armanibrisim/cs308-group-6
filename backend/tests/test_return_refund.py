"""
Unit tests for return/refund functionality.

Endpoints covered:
  PATCH /return-requests/{id}/approve
  PATCH /return-requests/{id}/reject
  GET   /return-requests
  GET   /return-requests/my
  POST  /orders/{order_id}/items/{product_id}/return

Run with: pytest tests/test_return_refund.py -v
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.utils.security import create_access_token

client = TestClient(app)

SM_TOKEN = create_access_token({"sub": "sm@lumen.com", "email": "sm@lumen.com", "role": "sales_manager"})
CUSTOMER_TOKEN = create_access_token({"sub": "cust@test.com", "email": "cust@test.com", "role": "customer"})
SM_AUTH = {"Authorization": f"Bearer {SM_TOKEN}"}
CUSTOMER_AUTH = {"Authorization": f"Bearer {CUSTOMER_TOKEN}"}


def _make_return(rid: str, status: str = "pending", product_id: str = "p1") -> dict:
    return {
        "id": rid,
        "order_id": "ord-1",
        "customer_id": "cust@test.com",
        "customer_email": "cust@test.com",
        "customer_name": "Test User",
        "product_id": product_id,
        "product_name": "Laptop",
        "quantity": 2,
        "total_price": 999.99,
        "reason": "Defective",
        "status": status,
        "created_at": "2026-03-01T10:00:00+00:00",
    }


def _make_order(
    oid: str,
    status: str = "delivered",
    customer_id: str = "cust@test.com",
    delivered_at: str | None = None,
) -> dict:
    if delivered_at is None:
        delivered_at = (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()
    return {
        "id": oid,
        "customer_id": customer_id,
        "customer_email": "cust@test.com",
        "customer_name": "Test User",
        "delivery_address": "123 Main St",
        "items": [
            {
                "product_id": "p1",
                "product_name": "Laptop",
                "quantity": 2,
                "unit_price": 499.99,
                "subtotal": 999.99,
            }
        ],
        "subtotal": 999.99,
        "tax": 80.0,
        "shipping": 0.0,
        "total_amount": 1079.99,
        "status": status,
        "delivered_at": delivered_at,
        "created_at": "2026-02-20T10:00:00+00:00",
        "updated_at": "2026-02-25T10:00:00+00:00",
    }


# ---------------------------------------------------------------------------
# Test 1 — Approve a pending return → 200, status becomes "approved"
# ---------------------------------------------------------------------------
def test_approve_return_success():
    """
    GIVEN a sales_manager JWT and a pending return request
    WHEN  PATCH /return-requests/{id}/approve is called
    THEN  response is 200 and the returned status is "approved"
    """
    row = _make_return("ret-1")

    with patch("app.services.return_request_service.return_request_repository.get_return_by_id", return_value=row), \
         patch("app.services.return_request_service.increment_stock"), \
         patch("app.services.return_request_service.return_request_repository.update_return_status"), \
         patch("app.services.return_request_service.order_repository.mark_item_refunded"), \
         patch("app.services.return_request_service.notification_repository.create_notification"):

        resp = client.patch("/return-requests/ret-1/approve", headers=SM_AUTH)

    assert resp.status_code == 200
    assert resp.json()["status"] == "approved"


# ---------------------------------------------------------------------------
# Test 2 — Approve a non-existent return → 404
# ---------------------------------------------------------------------------
def test_approve_return_not_found():
    """
    GIVEN a return_id that does not exist in the database
    WHEN  PATCH /return-requests/{id}/approve is called
    THEN  response is 404 Not Found
    """
    with patch("app.services.return_request_service.return_request_repository.get_return_by_id", return_value=None):
        resp = client.patch("/return-requests/nonexistent/approve", headers=SM_AUTH)

    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Test 3 — Approve an already-approved return → 400
# ---------------------------------------------------------------------------
def test_approve_return_already_approved():
    """
    GIVEN a return request that is already "approved"
    WHEN  PATCH /return-requests/{id}/approve is called again
    THEN  response is 400 Bad Request
    """
    row = _make_return("ret-1", status="approved")

    with patch("app.services.return_request_service.return_request_repository.get_return_by_id", return_value=row):
        resp = client.patch("/return-requests/ret-1/approve", headers=SM_AUTH)

    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Test 4 — Approve a rejected return → 400
# ---------------------------------------------------------------------------
def test_approve_return_already_rejected():
    """
    GIVEN a return request with status "rejected"
    WHEN  PATCH /return-requests/{id}/approve is called
    THEN  response is 400 Bad Request (only pending requests can be approved)
    """
    row = _make_return("ret-1", status="rejected")

    with patch("app.services.return_request_service.return_request_repository.get_return_by_id", return_value=row):
        resp = client.patch("/return-requests/ret-1/approve", headers=SM_AUTH)

    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Test 5 — Approving a return increments product stock
# ---------------------------------------------------------------------------
def test_approve_return_increments_stock():
    """
    GIVEN a pending return for 2 units of product "p1"
    WHEN  approve is called
    THEN  increment_stock is called with ("p1", 2)
    """
    row = _make_return("ret-1")

    with patch("app.services.return_request_service.return_request_repository.get_return_by_id", return_value=row), \
         patch("app.services.return_request_service.increment_stock") as mock_stock, \
         patch("app.services.return_request_service.return_request_repository.update_return_status"), \
         patch("app.services.return_request_service.order_repository.mark_item_refunded"), \
         patch("app.services.return_request_service.notification_repository.create_notification"):

        client.patch("/return-requests/ret-1/approve", headers=SM_AUTH)

    mock_stock.assert_called_once_with("p1", 2)


# ---------------------------------------------------------------------------
# Test 6 — Approving a return updates the order record
# ---------------------------------------------------------------------------
def test_approve_return_marks_order_refunded():
    """
    GIVEN a pending return with total_price=999.99
    WHEN  approve is called
    THEN  order_repository.mark_item_refunded is called with the correct order_id,
          product_id, and refund_amount
    """
    row = _make_return("ret-1")

    with patch("app.services.return_request_service.return_request_repository.get_return_by_id", return_value=row), \
         patch("app.services.return_request_service.increment_stock"), \
         patch("app.services.return_request_service.return_request_repository.update_return_status"), \
         patch("app.services.return_request_service.order_repository.mark_item_refunded") as mock_refund, \
         patch("app.services.return_request_service.notification_repository.create_notification"):

        client.patch("/return-requests/ret-1/approve", headers=SM_AUTH)

    mock_refund.assert_called_once_with("ord-1", "p1", 999.99)


# ---------------------------------------------------------------------------
# Test 7 — Approving a return sends a notification to the customer
# ---------------------------------------------------------------------------
def test_approve_return_sends_notification():
    """
    GIVEN a pending return for customer "cust@test.com"
    WHEN  approve is called
    THEN  notification_repository.create_notification is called once with
          user_id="cust@test.com" and the refund amount in the message
    """
    row = _make_return("ret-1")

    with patch("app.services.return_request_service.return_request_repository.get_return_by_id", return_value=row), \
         patch("app.services.return_request_service.increment_stock"), \
         patch("app.services.return_request_service.return_request_repository.update_return_status"), \
         patch("app.services.return_request_service.order_repository.mark_item_refunded"), \
         patch("app.services.return_request_service.notification_repository.create_notification") as mock_notify:

        client.patch("/return-requests/ret-1/approve", headers=SM_AUTH)

    mock_notify.assert_called_once()
    call_kwargs = mock_notify.call_args.kwargs
    assert call_kwargs["user_id"] == "cust@test.com"
    assert "999.99" in call_kwargs["message"]


# ---------------------------------------------------------------------------
# Test 8 — Approve endpoint is forbidden for customer role
# ---------------------------------------------------------------------------
def test_approve_return_forbidden_for_customer():
    """
    GIVEN a JWT with role=customer
    WHEN  PATCH /return-requests/{id}/approve is called
    THEN  response is 403 Forbidden
    """
    resp = client.patch("/return-requests/ret-1/approve", headers=CUSTOMER_AUTH)
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Test 9 — Reject a pending return → 200, status becomes "rejected"
# ---------------------------------------------------------------------------
def test_reject_return_success():
    """
    GIVEN a sales_manager JWT and a pending return request
    WHEN  PATCH /return-requests/{id}/reject is called
    THEN  response is 200 and the returned status is "rejected"
    """
    row = _make_return("ret-1")

    with patch("app.services.return_request_service.return_request_repository.get_return_by_id", return_value=row), \
         patch("app.services.return_request_service.return_request_repository.update_return_status"):

        resp = client.patch("/return-requests/ret-1/reject", headers=SM_AUTH)

    assert resp.status_code == 200
    assert resp.json()["status"] == "rejected"


# ---------------------------------------------------------------------------
# Test 10 — Reject a non-existent return → 404
# ---------------------------------------------------------------------------
def test_reject_return_not_found():
    """
    GIVEN a return_id that does not exist
    WHEN  PATCH /return-requests/{id}/reject is called
    THEN  response is 404 Not Found
    """
    with patch("app.services.return_request_service.return_request_repository.get_return_by_id", return_value=None):
        resp = client.patch("/return-requests/nonexistent/reject", headers=SM_AUTH)

    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Test 11 — Reject an already-resolved return → 400
# ---------------------------------------------------------------------------
def test_reject_return_already_resolved():
    """
    GIVEN a return request that is already "approved"
    WHEN  PATCH /return-requests/{id}/reject is called
    THEN  response is 400 Bad Request
    """
    row = _make_return("ret-1", status="approved")

    with patch("app.services.return_request_service.return_request_repository.get_return_by_id", return_value=row):
        resp = client.patch("/return-requests/ret-1/reject", headers=SM_AUTH)

    assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Test 12 — Rejecting a return does NOT update the order or send notification
# ---------------------------------------------------------------------------
def test_reject_return_no_order_update_no_notification():
    """
    GIVEN a pending return request
    WHEN  reject is called
    THEN  mark_item_refunded and create_notification are never called
    """
    row = _make_return("ret-1")

    with patch("app.services.return_request_service.return_request_repository.get_return_by_id", return_value=row), \
         patch("app.services.return_request_service.return_request_repository.update_return_status"), \
         patch("app.services.return_request_service.order_repository.mark_item_refunded") as mock_refund, \
         patch("app.services.return_request_service.notification_repository.create_notification") as mock_notify:

        client.patch("/return-requests/ret-1/reject", headers=SM_AUTH)

    mock_refund.assert_not_called()
    mock_notify.assert_not_called()


# ---------------------------------------------------------------------------
# Test 13 — GET /return-requests returns all requests for sales_manager
# ---------------------------------------------------------------------------
def test_list_all_returns_sales_manager():
    """
    GIVEN a sales_manager JWT
    WHEN  GET /return-requests is called
    THEN  response is 200 and all return requests are returned
    """
    rows = [_make_return("ret-1"), _make_return("ret-2", status="approved")]

    with patch("app.services.return_request_service.return_request_repository.list_all_returns", return_value=rows):
        resp = client.get("/return-requests", headers=SM_AUTH)

    assert resp.status_code == 200
    assert len(resp.json()) == 2


# ---------------------------------------------------------------------------
# Test 14 — GET /return-requests is forbidden for customer role
# ---------------------------------------------------------------------------
def test_list_all_returns_forbidden_for_customer():
    """
    GIVEN a JWT with role=customer
    WHEN  GET /return-requests is called
    THEN  response is 403 Forbidden
    """
    resp = client.get("/return-requests", headers=CUSTOMER_AUTH)
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Test 15 — POST return request for an item with an existing pending request → 409
# ---------------------------------------------------------------------------
def test_create_return_duplicate_pending_request():
    """
    GIVEN a delivered order within the return window
      AND a return request for "p1" is already pending
    WHEN  POST /orders/{id}/items/{product_id}/return is called again for "p1"
    THEN  response is 409 Conflict
    """
    order = _make_order("ord-1")
    existing_request = _make_return("ret-1", status="pending")

    with patch("app.services.return_request_service.order_repository.get_order_by_id", return_value=order), \
         patch("app.services.return_request_service.return_request_repository.any_return_for_line",
               return_value=existing_request):

        resp = client.post(
            "/orders/ord-1/items/p1/return",
            json={"reason": "Damaged"},
            headers=CUSTOMER_AUTH,
        )

    assert resp.status_code == 409
