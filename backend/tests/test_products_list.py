"""
Test cases for GET /products list resilience
Run with: pytest tests/test_products_list.py -v
"""

from unittest.mock import patch
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _complete_product(pid: str = "prod-1", name: str = "Test Product") -> dict:
    return {
        "id": pid,
        "name": name,
        "model": "M1",
        "serial_number": "SN001",
        "description": "A great product",
        "stock_quantity": 10,
        "price": 100.0,
        "warranty": "1 year",
        "distributor": "Dist Co",
        "category_id": "cat1",
        "image_url": None,
        "created_at": "2024-01-01T00:00:00+00:00",
        "updated_at": "2024-01-01T00:00:00+00:00",
    }


def test_list_products_skips_incomplete_product_without_500():
    """
    GIVEN a product list that includes a document missing required fields
    WHEN  GET /products is called
    THEN  response is 200 and only complete products are returned
    """
    products = [
        _complete_product("prod-1", "Good Product"),
        {"id": "prod-bad", "price": 50.0},
        _complete_product("prod-2", "Another Product"),
    ]

    with patch("app.services.product_service.list_products", return_value=(products, 2)):
        resp = client.get("/products?page=1&limit=100")

    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 2
    assert len(body["products"]) == 2
    names = {p["name"] for p in body["products"]}
    assert names == {"Good Product", "Another Product"}


def test_list_products_page_2_with_mixed_catalog_returns_200():
    """
    GIVEN paginated results that may include incomplete legacy documents
    WHEN  GET /products?page=2 is called
    THEN  response is 200 (no KeyError / 500)
    """
    page_two = [_complete_product("prod-101", "Paged Product")]

    with patch("app.services.product_service.list_products", return_value=(page_two, 101)):
        resp = client.get("/products?page=2&limit=100")

    assert resp.status_code == 200
    assert resp.json()["products"][0]["name"] == "Paged Product"
