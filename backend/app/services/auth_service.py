from fastapi import HTTPException, status

from app.repositories.user_repository import create_user, get_user_by_email
from app.utils.security import create_access_token, verify_password


def login_user(email: str, password: str) -> dict:
    result = get_user_by_email(email)

    if result is None or not verify_password(password, result[1].get("password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    doc_id, data = result
    role = data.get("role", "customer")
    token = create_access_token({"sub": doc_id, "email": email, "role": role})

    return {"success": True, "doc_id": doc_id, "email": email, "role": role, "token": token}


def register_user(email: str, password: str, first_name: str, last_name: str) -> dict:
    if get_user_by_email(email) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email is already registered.",
        )

    doc_id = create_user(email, password, first_name, last_name)
    token = create_access_token({"sub": doc_id, "email": email, "role": "customer"})

    return {"success": True, "doc_id": doc_id, "email": email, "role": "customer", "token": token}
