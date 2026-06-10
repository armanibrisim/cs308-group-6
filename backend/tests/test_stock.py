"""
Test cases for PATCH /products/{product_id}/stock
Run with: pytest tests/test_stock.py -v
"""

from unittest.mock import patch
from fastapi.testclient import TestClient

from app.main import app
from app.utils.security import create_access_token

client = TestClient(app)

PM_TOKEN = create_access_token({"sub": "pm@lumen.com", "email": "pm@lumen.com", "role": "product_manager"})
CUSTOMER_TOKEN = create_access_token({"sub": "cust@test.com", "email": "cust@test.com", "role": "customer"})
PM_AUTH = {"Authorization": f"Bearer {PM_TOKEN}"}
CUSTOMER_AUTH = {"Authorization": f"Bearer {CUSTOMER_TOKEN}"}


def _product(pid: str = "prod-1", stock: int = 10) -> dict:
    return {
        "id": pid,
        "name": "Test Product",
        "model": "M1",
        "serial_number": "SN001",
        "description": "A great product",
        "stock_quantity": stock,
        "price": 100.0,
        "warranty": "1 year",
        "distributor": "Dist Co",
        "category_id": "cat1",
        "image_url": None,
        "created_at": "2024-01-01T00:00:00+00:00",
        "updated_at": "2024-01-01T00:00:00+00:00",
    }


def test_update_stock_success_for_product_manager():
    """
    GIVEN a product_manager JWT and an existing product
    WHEN  PATCH /products/{id}/stock is called with stock_quantity=25
    THEN  200 is returned with updated stock_quantity and in_stock=true
    """
    updated = _product(stock=25)

    with patch("app.services.product_service.get_product_by_id") as mock_get, \
         patch("app.services.product_service.update_product") as mock_update:
        mock_get.side_effect = [_product(stock=10), updated]

        resp = client.patch(
            "/products/prod-1/stock",
            json={"stock_quantity": 25},
            headers=PM_AUTH,
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["stock_quantity"] == 25
    assert body["in_stock"] is True
    mock_update.assert_called_once_with("prod-1", {"stock_quantity": 25})


def test_update_stock_zero_sets_out_of_stock():
    """
    GIVEN a product_manager JWT
    WHEN  stock_quantity is set to 0
    THEN  in_stock is false in the response
    """
    updated = _product(stock=0)

    with patch("app.services.product_service.get_product_by_id") as mock_get, \
         patch("app.services.product_service.update_product"):
        mock_get.side_effect = [_product(stock=5), updated]

        resp = client.patch(
            "/products/prod-1/stock",
            json={"stock_quantity": 0},
            headers=PM_AUTH,
        )

    assert resp.status_code == 200
    assert resp.json()["stock_quantity"] == 0
    assert resp.json()["in_stock"] is False


def test_update_stock_forbidden_for_customer():
    """
    GIVEN a customer JWT
    WHEN  PATCH /products/{id}/stock is called
    THEN  403 is returned
    """
    resp = client.patch(
        "/products/prod-1/stock",
        json={"stock_quantity": 5},
        headers=CUSTOMER_AUTH,
    )

    assert resp.status_code == 403


def test_update_stock_not_found():
    """
    GIVEN a product_manager JWT and a missing product
    WHEN  PATCH /products/{id}/stock is called
    THEN  404 is returned
    """
    with patch("app.services.product_service.get_product_by_id", return_value=None):
        resp = client.patch(
            "/products/missing-id/stock",
            json={"stock_quantity": 5},
            headers=PM_AUTH,
        )

    assert resp.status_code == 404
    assert resp.json()["detail"] == "Product not found"


def test_update_stock_negative_quantity_returns_422():
    """
    GIVEN a product_manager JWT
    WHEN  stock_quantity is negative
    THEN  422 validation error is returned
    """
    resp = client.patch(
        "/products/prod-1/stock",
        json={"stock_quantity": -1},
        headers=PM_AUTH,
    )

    assert resp.status_code == 422
