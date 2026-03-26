"""
Test cases for POST /auth/login
Run with: pytest tests/test_login.py -v
"""

import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_user_doc(role: str = "customer", password_hash: str = "") -> tuple[str, dict]:
    """Return a (doc_id, data) tuple that mimics get_user_by_email output."""
    return (
        "test@example.com",
        {
            "email": "test@example.com",
            "password": password_hash,
            "first_name": "Test",
            "last_name": "User",
            "role": role,
        },
    )


# ---------------------------------------------------------------------------
# Test Case 1 — Successful login with valid credentials
# ---------------------------------------------------------------------------
def test_login_success_valid_credentials():
    """
    GIVEN a registered user with correct email & password
    WHEN  POST /auth/login is called
    THEN  response is 200 OK and body contains success=True, a token, and correct role
    """
    with patch("app.services.auth_service.get_user_by_email") as mock_get, \
         patch("app.services.auth_service.verify_password", return_value=True):

        mock_get.return_value = _make_user_doc(role="customer", password_hash="hashed_pw")

        response = client.post("/auth/login", json={
            "email": "test@example.com",
            "password": "correct_password"
        })

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["email"] == "test@example.com"
    assert body["role"] == "customer"
    assert "token" in body and len(body["token"]) > 0


# ---------------------------------------------------------------------------
# Test Case 2 — Login fails with wrong password
# ---------------------------------------------------------------------------
def test_login_failure_wrong_password():
    """
    GIVEN a registered user
    WHEN  POST /auth/login is called with an incorrect password
    THEN  response is 401 Unauthorized with a descriptive error message
    """
    with patch("app.services.auth_service.get_user_by_email") as mock_get, \
         patch("app.services.auth_service.verify_password", return_value=False):

        mock_get.return_value = _make_user_doc(password_hash="hashed_pw")

        response = client.post("/auth/login", json={
            "email": "test@example.com",
            "password": "wrong_password"
        })

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password."


# ---------------------------------------------------------------------------
# Test Case 3 — Login fails with non-existent email
# ---------------------------------------------------------------------------
def test_login_failure_email_not_found():
    """
    GIVEN no user exists with the provided email
    WHEN  POST /auth/login is called
    THEN  response is 401 Unauthorized (same message to prevent user enumeration)
    """
    with patch("app.services.auth_service.get_user_by_email", return_value=None):
        response = client.post("/auth/login", json={
            "email": "ghost@example.com",
            "password": "any_password"
        })

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid email or password."


# ---------------------------------------------------------------------------
# Test Case 4 — Login with missing required fields (email omitted)
# ---------------------------------------------------------------------------
def test_login_failure_missing_email():
    """
    GIVEN a request body that is missing the 'email' field
    WHEN  POST /auth/login is called
    THEN  response is 422 Unprocessable Entity (Pydantic validation error)
    """
    response = client.post("/auth/login", json={
        "password": "some_password"
        # 'email' intentionally omitted
    })

    assert response.status_code == 422
    errors = response.json()["detail"]
    field_names = [e["loc"][-1] for e in errors]
    assert "email" in field_names


# ---------------------------------------------------------------------------
# Test Case 5 — Successful login returns correct role for a product manager
# ---------------------------------------------------------------------------
def test_login_success_product_manager_role():
    """
    GIVEN a user whose role in Firestore is 'product_manager'
    WHEN  POST /auth/login is called with valid credentials
    THEN  the response body contains role='product_manager'
    """
    with patch("app.services.auth_service.get_user_by_email") as mock_get, \
         patch("app.services.auth_service.verify_password", return_value=True):

        mock_get.return_value = _make_user_doc(role="product_manager", password_hash="hashed_pw")

        response = client.post("/auth/login", json={
            "email": "pm@example.com",
            "password": "correct_password"
        })

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["role"] == "product_manager"
    assert "token" in body
