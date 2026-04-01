"""
Test cases for GET /sales/analytics and GET /sales/invoices
Run with: pytest tests/test_analytics.py -v
"""

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app
from app.utils.security import create_access_token

client = TestClient(app)

SM_TOKEN = create_access_token({"sub": "sm@lumen.com", "email": "sm@lumen.com", "role": "sales_manager"})
AUTH = {"Authorization": f"Bearer {SM_TOKEN}"}

SAMPLE_INVOICES = [
    {
        "id": "inv-1",
        "customer_id": "user-1",
        "customer_email": "a@b.com",
        "customer_name": "Alice",
        "delivery_address": "123 St",
        "items": [{"product_id": "p1", "product_name": "Laptop", "quantity": 1, "unit_price": 1000, "subtotal": 1000}],
        "subtotal": 1000.0,
        "tax": 80.0,
        "shipping": 0.0,
        "total_amount": 1080.0,
        "created_at": "2026-03-15T10:00:00+00:00",
    },
    {
        "id": "inv-2",
        "customer_id": "user-2",
        "customer_email": "b@c.com",
        "customer_name": "Bob",
        "delivery_address": "456 Ave",
        "items": [{"product_id": "p2", "product_name": "Mouse", "quantity": 2, "unit_price": 100, "subtotal": 200}],
        "subtotal": 200.0,
        "tax": 16.0,
        "shipping": 45.0,
        "total_amount": 261.0,
        "created_at": "2026-03-20T14:00:00+00:00",
    },
]


# ---------------------------------------------------------------------------
# Test 1 — Analytics returns correct totals
# ---------------------------------------------------------------------------
def test_analytics_correct_totals():
    """
    GIVEN two invoices with known amounts
    WHEN  GET /sales/analytics is called (no date filter)
    THEN  total_revenue == 1341.0 and total_profit is revenue - 70% of subtotal
    """
    with patch("app.services.analytics_service.list_invoices", return_value=SAMPLE_INVOICES):
        resp = client.get("/sales/analytics", headers=AUTH)

    assert resp.status_code == 200
    body = resp.json()
    expected_revenue = 1080.0 + 261.0
    assert body["total_revenue"] == expected_revenue
    expected_cost = round((1000.0 + 200.0) * 0.70, 2)
    assert body["total_cost"] == expected_cost
    assert body["total_profit"] == round(expected_revenue - expected_cost, 2)
    assert body["invoice_count"] == 2


# ---------------------------------------------------------------------------
# Test 2 — Analytics returns chart_data grouped by date
# ---------------------------------------------------------------------------
def test_analytics_chart_data_grouping():
    """
    GIVEN two invoices on different dates
    WHEN  GET /sales/analytics is called
    THEN  chart_data has 2 entries, one per date, ordered ascending
    """
    with patch("app.services.analytics_service.list_invoices", return_value=SAMPLE_INVOICES):
        resp = client.get("/sales/analytics", headers=AUTH)

    chart = resp.json()["chart_data"]
    assert len(chart) == 2
    assert chart[0]["date"] < chart[1]["date"]
    assert chart[0]["revenue"] == 1080.0


# ---------------------------------------------------------------------------
# Test 3 — Analytics with date range calls filtered list
# ---------------------------------------------------------------------------
def test_analytics_date_range_filter():
    """
    GIVEN a date range that contains only the first invoice
    WHEN  GET /sales/analytics?start_date=...&end_date=... is called
    THEN  service uses list_invoices_by_date_range (not list_invoices)
    """
    with patch("app.services.analytics_service.list_invoices_by_date_range", return_value=[SAMPLE_INVOICES[0]]) as mock_range, \
         patch("app.services.analytics_service.list_invoices") as mock_all:

        resp = client.get(
            "/sales/analytics?start_date=2026-03-01&end_date=2026-03-16",
            headers=AUTH,
        )

    assert resp.status_code == 200
    mock_range.assert_called_once()
    mock_all.assert_not_called()
    assert resp.json()["invoice_count"] == 1


# ---------------------------------------------------------------------------
# Test 4 — Invoice list returns filtered results
# ---------------------------------------------------------------------------
def test_invoices_filtered_by_date():
    """
    GIVEN invoices in the backend
    WHEN  GET /sales/invoices?start_date=X&end_date=Y is called
    THEN  response contains only invoices in that range
    """
    with patch("app.services.analytics_service.list_invoices_by_date_range", return_value=[SAMPLE_INVOICES[1]]):
        resp = client.get(
            "/sales/invoices?start_date=2026-03-18&end_date=2026-03-25",
            headers=AUTH,
        )

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["id"] == "inv-2"


# ---------------------------------------------------------------------------
# Test 5 — Analytics is forbidden for product_manager role
# ---------------------------------------------------------------------------
def test_analytics_forbidden_for_product_manager():
    """
    GIVEN a JWT with role=product_manager
    WHEN  GET /sales/analytics is called
    THEN  response is 403 Forbidden
    """
    pm_token = create_access_token({"sub": "pm@p.com", "email": "pm@p.com", "role": "product_manager"})
    resp = client.get(
        "/sales/analytics",
        headers={"Authorization": f"Bearer {pm_token}"},
    )
    assert resp.status_code == 403
