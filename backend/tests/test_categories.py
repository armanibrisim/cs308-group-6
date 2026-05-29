"""
Unit tests for POST /categories (Category Creation)
Run with: pytest tests/test_categories.py -v
"""

import threading
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.main import app
from app.utils.security import create_access_token

client = TestClient(app)

PRODUCT_MANAGER_TOKEN = create_access_token({"sub": "pm@example.com", "email": "pm@example.com", "role": "product_manager"})
ADMIN_TOKEN = create_access_token({"sub": "admin@example.com", "email": "admin@example.com", "role": "admin"})
CUSTOMER_TOKEN = create_access_token({"sub": "c@example.com", "email": "c@example.com", "role": "customer"})
SALES_TOKEN = create_access_token({"sub": "sm@example.com", "email": "sm@example.com", "role": "sales_manager"})

PM_AUTH = {"Authorization": f"Bearer {PRODUCT_MANAGER_TOKEN}"}
ADMIN_AUTH = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
CUSTOMER_AUTH = {"Authorization": f"Bearer {CUSTOMER_TOKEN}"}
SALES_AUTH = {"Authorization": f"Bearer {SALES_TOKEN}"}


def _stored_category(
    category_id: str = "cat-1",
    name: str = "Test Category",
    slug: str = "test-category",
    description: str | None = None,
    parent_category_id: str | None = None,
) -> dict:
    return {
        "id": category_id,
        "name": name,
        "slug": slug,
        "description": description,
        "parent_category_id": parent_category_id,
    }


# ---------------------------------------------------------------------------
# Test 1 — Product manager creates a category; slug auto-generated from name
# ---------------------------------------------------------------------------
def test_create_category_slug_auto_generated():
    """
    GIVEN a product_manager and a CategoryCreate payload with no slug
    WHEN  POST /categories is called
    THEN  201 is returned and slug is derived from the name
    """
    stored = _stored_category(name="Ses Sistemleri", slug="ses-sistemleri")

    with patch("app.services.product_service.get_category_by_name", return_value=None), \
         patch("app.services.product_service.get_category_by_slug", return_value=None), \
         patch("app.services.product_service.create_category", return_value="cat-1"), \
         patch("app.services.product_service.get_category_by_id", return_value=stored):

        resp = client.post("/categories", json={"name": "Ses Sistemleri"}, headers=PM_AUTH)

    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "Ses Sistemleri"
    assert body["slug"] == "ses-sistemleri"


# ---------------------------------------------------------------------------
# Test 2 — Manual slug is preserved when provided
# ---------------------------------------------------------------------------
def test_create_category_manual_slug_preserved():
    """
    GIVEN a payload with an explicit slug
    WHEN  POST /categories is called
    THEN  the provided slug is stored as-is
    """
    stored = _stored_category(name="Kulaklıklar", slug="kulakliklar")

    with patch("app.services.product_service.get_category_by_name", return_value=None), \
         patch("app.services.product_service.get_category_by_slug", return_value=None), \
         patch("app.services.product_service.create_category", return_value="cat-1"), \
         patch("app.services.product_service.get_category_by_id", return_value=stored):

        resp = client.post("/categories", json={"name": "Kulaklıklar", "slug": "kulakliklar"}, headers=PM_AUTH)

    assert resp.status_code == 201
    assert resp.json()["slug"] == "kulakliklar"


# ---------------------------------------------------------------------------
# Test 3 — Admin can also create a category
# ---------------------------------------------------------------------------
def test_create_category_admin_allowed():
    """
    GIVEN an admin user
    WHEN  POST /categories is called
    THEN  201 is returned (admin role is authorized)
    """
    stored = _stored_category(name="Admin Category", slug="admin-category")

    with patch("app.services.product_service.get_category_by_name", return_value=None), \
         patch("app.services.product_service.get_category_by_slug", return_value=None), \
         patch("app.services.product_service.create_category", return_value="cat-1"), \
         patch("app.services.product_service.get_category_by_id", return_value=stored):

        resp = client.post("/categories", json={"name": "Admin Category"}, headers=ADMIN_AUTH)

    assert resp.status_code == 201


# ---------------------------------------------------------------------------
# Test 4 — Customer cannot create a category
# ---------------------------------------------------------------------------
def test_create_category_customer_forbidden():
    """
    GIVEN a customer token
    WHEN  POST /categories is called
    THEN  403 Forbidden is returned
    """
    resp = client.post("/categories", json={"name": "Forbidden"}, headers=CUSTOMER_AUTH)
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Test 5 — Sales manager cannot create a category
# ---------------------------------------------------------------------------
def test_create_category_sales_manager_forbidden():
    """
    GIVEN a sales_manager token
    WHEN  POST /categories is called
    THEN  403 Forbidden is returned
    """
    resp = client.post("/categories", json={"name": "Forbidden"}, headers=SALES_AUTH)
    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Test 6 — Unauthenticated request is rejected
# ---------------------------------------------------------------------------
def test_create_category_no_token_rejected():
    """
    GIVEN no Authorization header
    WHEN  POST /categories is called
    THEN  401 is returned (bearer scheme rejects missing token)
    """
    resp = client.post("/categories", json={"name": "No Auth"})
    assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Test 7 — Duplicate name returns 409
# ---------------------------------------------------------------------------
def test_create_category_duplicate_name_conflict():
    """
    GIVEN a category with the same name already exists
    WHEN  POST /categories is called
    THEN  409 Conflict is returned
    """
    existing = _stored_category(name="Electronics", slug="electronics")

    with patch("app.services.product_service.get_category_by_name", return_value=existing):
        resp = client.post("/categories", json={"name": "Electronics"}, headers=PM_AUTH)

    assert resp.status_code == 409
    assert "name" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Test 8 — Duplicate slug returns 409
# ---------------------------------------------------------------------------
def test_create_category_duplicate_slug_conflict():
    """
    GIVEN a different category already uses the same slug
    WHEN  POST /categories is called with a name that generates the same slug
    THEN  409 Conflict is returned
    """
    existing_slug_owner = _stored_category(name="Other Category", slug="electronics")

    with patch("app.services.product_service.get_category_by_name", return_value=None), \
         patch("app.services.product_service.get_category_by_slug", return_value=existing_slug_owner):

        resp = client.post("/categories", json={"name": "Electronics"}, headers=PM_AUTH)

    assert resp.status_code == 409
    assert "slug" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Test 9 — Description and parent_category_id are stored correctly
# ---------------------------------------------------------------------------
def test_create_category_with_optional_fields():
    """
    GIVEN a payload with description and parent_category_id
    WHEN  POST /categories is called
    THEN  201 is returned with all fields populated in the response
    """
    stored = _stored_category(
        name="Wireless",
        slug="wireless",
        description="All wireless products",
        parent_category_id="cat-parent",
    )

    with patch("app.services.product_service.get_category_by_name", return_value=None), \
         patch("app.services.product_service.get_category_by_slug", return_value=None), \
         patch("app.services.product_service.create_category", return_value="cat-1"), \
         patch("app.services.product_service.get_category_by_id", return_value=stored):

        resp = client.post("/categories", json={
            "name": "Wireless",
            "description": "All wireless products",
            "parent_category_id": "cat-parent",
        }, headers=PM_AUTH)

    assert resp.status_code == 201
    body = resp.json()
    assert body["description"] == "All wireless products"
    assert body["parent_category_id"] == "cat-parent"


# ---------------------------------------------------------------------------
# Test 10 — Missing required field `name` returns 422
# ---------------------------------------------------------------------------
def test_create_category_missing_name_unprocessable():
    """
    GIVEN a payload with no name field
    WHEN  POST /categories is called
    THEN  422 Unprocessable Entity is returned (Pydantic validation)
    """
    resp = client.post("/categories", json={"description": "No name given"}, headers=PM_AUTH)
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Test 11 — DB-level duplicate: create_category raises ValueError → 409
# ---------------------------------------------------------------------------
def test_create_category_db_level_duplicate_returns_409():
    """
    GIVEN the pre-checks pass (get_category_by_name and get_category_by_slug
          both return None) BUT create_category raises ValueError because the
          atomic transaction found the slug document already exists
          (a concurrent request won the race)
    WHEN  POST /categories is called
    THEN  409 Conflict is returned
    """
    with patch("app.services.product_service.get_category_by_name", return_value=None), \
         patch("app.services.product_service.get_category_by_slug", return_value=None), \
         patch("app.services.product_service.create_category",
               side_effect=ValueError("A category with this slug already exists.")):

        resp = client.post("/categories", json={"name": "Electronics"}, headers=PM_AUTH)

    assert resp.status_code == 409
    assert "slug" in resp.json()["detail"].lower()


# ---------------------------------------------------------------------------
# Test 12 — Concurrent category creation with same name: only one succeeds
# ---------------------------------------------------------------------------
def test_concurrent_category_creation_only_one_succeeds():
    """
    GIVEN two concurrent POST /categories requests with the same name
    WHEN  both threads fire at the same time
    THEN  exactly 1 returns 201 and 1 returns 409
          (the atomic slug-as-doc-ID transaction rejects the second)
    """
    lock = threading.Lock()
    call_count = {"n": 0}

    def create_category_side_effect(data):
        with lock:
            call_count["n"] += 1
            n = call_count["n"]
        if n > 1:
            raise ValueError("A category with this slug already exists.")
        return data.get("slug", "electronics")

    stored = _stored_category(name="Electronics", slug="electronics")
    results = []
    results_lock = threading.Lock()

    with patch("app.services.product_service.get_category_by_name", return_value=None), \
         patch("app.services.product_service.get_category_by_slug", return_value=None), \
         patch("app.services.product_service.create_category",
               side_effect=create_category_side_effect), \
         patch("app.services.product_service.get_category_by_id", return_value=stored):

        def do_create():
            resp = client.post("/categories", json={"name": "Electronics"}, headers=PM_AUTH)
            with results_lock:
                results.append(resp.status_code)

        threads = [threading.Thread(target=do_create) for _ in range(2)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

    assert results.count(201) == 1, f"Expected 1 success, got: {results}"
    assert results.count(409) == 1, f"Expected 1 conflict, got: {results}"