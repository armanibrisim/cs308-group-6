"""
Test cases for POST /auth/register
Run with: pytest tests/test_register.py -v
"""

from unittest.mock import patch
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

VALID_PAYLOAD = {
    "email": "newuser@example.com",
    "password": "SecurePass123",
    "first_name": "John",
    "last_name": "Doe",
}


# ---------------------------------------------------------------------------
# Test Case 1 — Successful registration with valid data
# ---------------------------------------------------------------------------
def test_register_success():
    """
    GIVEN a new user with a unique email and all required fields
    WHEN  POST /auth/register is called
    THEN  response is 201 Created, success=True, role=customer, and a token is returned
    """
    with patch("app.services.auth_service.get_user_by_email", return_value=None), \
         patch("app.services.auth_service.create_user", return_value="newuser@example.com"):

        response = client.post("/auth/register", json=VALID_PAYLOAD)

    assert response.status_code == 201
    body = response.json()
    assert body["success"] is True
    assert body["email"] == VALID_PAYLOAD["email"]
    assert body["role"] == "customer"
    assert "token" in body and len(body["token"]) > 0


# ---------------------------------------------------------------------------
# Test Case 2 — Registration fails when email already exists
# ---------------------------------------------------------------------------
def test_register_duplicate_email():
    """
    GIVEN a user that already exists in Firestore with the same email
    WHEN  POST /auth/register is called with that email
    THEN  response is 409 Conflict with a descriptive error message
    """
    existing_user = ("newuser@example.com", {"email": "newuser@example.com", "role": "customer"})

    with patch("app.services.auth_service.get_user_by_email", return_value=existing_user):
        response = client.post("/auth/register", json=VALID_PAYLOAD)

    assert response.status_code == 409
    assert response.json()["detail"] == "This email is already registered."


# ---------------------------------------------------------------------------
# Test Case 3 — Registration fails when a required field is missing
# ---------------------------------------------------------------------------
def test_register_missing_first_name():
    """
    GIVEN a request body missing the 'first_name' field
    WHEN  POST /auth/register is called
    THEN  response is 422 Unprocessable Entity (Pydantic validation error)
    """
    payload = {k: v for k, v in VALID_PAYLOAD.items() if k != "first_name"}
    response = client.post("/auth/register", json=payload)

    assert response.status_code == 422
    errors = response.json()["detail"]
    field_names = [e["loc"][-1] for e in errors]
    assert "first_name" in field_names


# ---------------------------------------------------------------------------
# Test Case 4 — Registration fails when password is missing
# ---------------------------------------------------------------------------
def test_register_missing_password():
    """
    GIVEN a request body missing the 'password' field
    WHEN  POST /auth/register is called
    THEN  response is 422 Unprocessable Entity (Pydantic validation error)
    """
    payload = {k: v for k, v in VALID_PAYLOAD.items() if k != "password"}
    response = client.post("/auth/register", json=payload)

    assert response.status_code == 422
    errors = response.json()["detail"]
    field_names = [e["loc"][-1] for e in errors]
    assert "password" in field_names


# ---------------------------------------------------------------------------
# Test Case 5 — Newly registered user always gets role="customer"
# ---------------------------------------------------------------------------
def test_register_new_user_always_gets_customer_role():
    """
    GIVEN a successful registration request
    WHEN  POST /auth/register is called
    THEN  the role in the response is always 'customer' regardless of any other factors
          (no privilege escalation possible through registration)
    """
    with patch("app.services.auth_service.get_user_by_email", return_value=None), \
         patch("app.services.auth_service.create_user", return_value="admin@example.com"):

        response = client.post("/auth/register", json={
            "email": "admin@example.com",
            "password": "TryToBeAdmin123",
            "first_name": "Hacker",
            "last_name": "Guy",
        })

    assert response.status_code == 201
    assert response.json()["role"] == "customer"
