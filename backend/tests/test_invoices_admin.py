"""
Test cases for the /invoices router (admin access)
  GET  /invoices
  GET  /invoices/{id}
  GET  /invoices/{id}/pdf
Run with: pytest tests/test_invoices_admin.py -v
"""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.utils.security import create_access_token

client = TestClient(app)

SM_TOKEN = create_access_token({"sub": "sm@lumen.com", "email": "sm@lumen.com", "role": "sales_manager"})
PM_TOKEN = create_access_token({"sub": "pm@lumen.com", "email": "pm@lumen.com", "role": "product_manager"})
SM_AUTH = {"Authorization": f"Bearer {SM_TOKEN}"}
PM_AUTH = {"Authorization": f"Bearer {PM_TOKEN}"}

SAMPLE_INVOICE = {
    "id": "inv-001",
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
    "created_at": "2026-03-15T10:00:00+00:00",
}


# ---------------------------------------------------------------------------
# Test 1 — GET /invoices returns list for sales_manager
# ---------------------------------------------------------------------------
def test_list_invoices_sales_manager():
    """
    GIVEN a sales_manager JWT
    WHEN  GET /invoices is called
    THEN  response is 200 and returns a list of invoices
    """
    with patch("app.routers.invoices.fetch_invoices", return_value=[SAMPLE_INVOICE]):
        resp = client.get("/invoices", headers=SM_AUTH)

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["id"] == "inv-001"


# ---------------------------------------------------------------------------
# Test 2 — GET /invoices returns list for product_manager
# ---------------------------------------------------------------------------
def test_list_invoices_product_manager():
    """
    GIVEN a product_manager JWT
    WHEN  GET /invoices is called
    THEN  response is 200 (both roles have access)
    """
    with patch("app.routers.invoices.fetch_invoices", return_value=[SAMPLE_INVOICE]):
        resp = client.get("/invoices", headers=PM_AUTH)

    assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Test 3 — GET /invoices/{id} returns single invoice
# ---------------------------------------------------------------------------
def test_get_invoice_by_id():
    """
    GIVEN an existing invoice id
    WHEN  GET /invoices/{id} is called
    THEN  response is 200 and invoice data matches
    """
    with patch("app.routers.invoices.fetch_invoice", return_value=SAMPLE_INVOICE):
        resp = client.get("/invoices/inv-001", headers=SM_AUTH)

    assert resp.status_code == 200
    assert resp.json()["customer_name"] == "Alice Smith"
    assert resp.json()["total_amount"] == 1080.0


# ---------------------------------------------------------------------------
# Test 4 — GET /invoices/{id}/pdf returns PDF bytes
# ---------------------------------------------------------------------------
def test_download_invoice_pdf():
    """
    GIVEN an existing invoice
    WHEN  GET /invoices/{id}/pdf is called
    THEN  response is 200 with content-type application/pdf
    """
    fake_pdf = b"%PDF-1.4 fake content"

    with patch("app.routers.invoices.fetch_invoice", return_value=SAMPLE_INVOICE), \
         patch("app.routers.invoices.generate_invoice_pdf", return_value=fake_pdf):

        resp = client.get("/invoices/inv-001/pdf", headers=SM_AUTH)

    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content == fake_pdf


# ---------------------------------------------------------------------------
# Test 5 — GET /invoices/{id}/pdf has correct filename in Content-Disposition
# ---------------------------------------------------------------------------
def test_download_invoice_pdf_filename():
    """
    GIVEN an existing invoice
    WHEN  GET /invoices/{id}/pdf is called
    THEN  Content-Disposition header contains the invoice id as filename
    """
    fake_pdf = b"%PDF-1.4 fake content"

    with patch("app.routers.invoices.fetch_invoice", return_value=SAMPLE_INVOICE), \
         patch("app.routers.invoices.generate_invoice_pdf", return_value=fake_pdf):

        resp = client.get("/invoices/inv-001/pdf", headers=SM_AUTH)

    assert "inv-001" in resp.headers.get("content-disposition", "")


# ---------------------------------------------------------------------------
# Test 6 — 403 for customer role on all invoice endpoints
# ---------------------------------------------------------------------------
def test_invoice_endpoints_forbidden_for_customer():
    """
    GIVEN a JWT with role=customer
    WHEN  GET /invoices is called
    THEN  response is 403 Forbidden
    """
    customer_token = create_access_token({"sub": "c@c.com", "email": "c@c.com", "role": "customer"})
    resp = client.get(
        "/invoices",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Test 7 — 401 when no token provided
# ---------------------------------------------------------------------------
def test_invoice_list_unauthorized():
    """
    GIVEN no Authorization header
    WHEN  GET /invoices is called
    THEN  response is 403 (HTTPBearer returns 403 when no token is provided)
    """
    resp = client.get("/invoices")
    assert resp.status_code == 403