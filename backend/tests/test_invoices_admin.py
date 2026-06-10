"""
Test cases for the /invoices router
  GET  /invoices
  GET  /invoices/{id}
  GET  /invoices/{id}/pdf  (managers + invoice owner)
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

# Customer tokens — "alice" owns inv-001, "bob" does not
ALICE_TOKEN = create_access_token({"sub": "user-1", "email": "alice@test.com", "role": "customer"})
BOB_TOKEN   = create_access_token({"sub": "user-2", "email": "bob@test.com",   "role": "customer"})
ALICE_AUTH  = {"Authorization": f"Bearer {ALICE_TOKEN}"}
BOB_AUTH    = {"Authorization": f"Bearer {BOB_TOKEN}"}


def _invoice_mock(customer_id: str = "user-1"):
    """Return a MagicMock that looks like an InvoiceResponse with a customer_id attribute."""
    m = MagicMock()
    m.customer_id = customer_id
    return m

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
    THEN  response is 403 (HTTPBearer raises 403 when no credentials are provided)
    """
    resp = client.get("/invoices")
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Test 8 — Customer can download their own invoice PDF
# ---------------------------------------------------------------------------
def test_customer_can_download_own_invoice_pdf():
    """
    GIVEN a customer JWT whose user_id matches the invoice's customer_id
    WHEN  GET /invoices/{id}/pdf is called
    THEN  response is 200 and the PDF bytes are returned
    """
    fake_pdf = b"%PDF-1.4 customer invoice"

    with patch("app.routers.invoices.fetch_invoice", return_value=_invoice_mock("user-1")), \
         patch("app.routers.invoices.generate_invoice_pdf", return_value=fake_pdf):
        resp = client.get("/invoices/inv-001/pdf", headers=ALICE_AUTH)

    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content == fake_pdf


# ---------------------------------------------------------------------------
# Test 9 — Customer cannot download another customer's invoice PDF
# ---------------------------------------------------------------------------
def test_customer_cannot_download_other_customers_invoice_pdf():
    """
    GIVEN a customer JWT whose user_id does NOT match the invoice's customer_id
    WHEN  GET /invoices/{id}/pdf is called
    THEN  response is 403 Forbidden
    """
    with patch("app.routers.invoices.fetch_invoice", return_value=_invoice_mock("user-1")), \
         patch("app.routers.invoices.generate_invoice_pdf", return_value=b"pdf"):
        resp = client.get("/invoices/inv-001/pdf", headers=BOB_AUTH)

    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Test 10 — Sales manager can download any customer's invoice PDF
# ---------------------------------------------------------------------------
def test_manager_can_download_any_invoice_pdf():
    """
    GIVEN a sales_manager JWT
    WHEN  GET /invoices/{id}/pdf is called for an invoice belonging to another user
    THEN  response is 200 (managers bypass the ownership check)
    """
    fake_pdf = b"%PDF-1.4 manager access"

    with patch("app.routers.invoices.fetch_invoice", return_value=_invoice_mock("user-1")), \
         patch("app.routers.invoices.generate_invoice_pdf", return_value=fake_pdf):
        resp = client.get("/invoices/inv-001/pdf", headers=SM_AUTH)

    assert resp.status_code == 200
    assert resp.content == fake_pdf