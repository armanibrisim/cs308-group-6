from fastapi import HTTPException, status
from app.repositories.user_repository import get_user_by_email, create_user


def login_user(email: str, password: str) -> dict:
    result = get_user_by_email(email)

    if result is None or result[1].get("password") != password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email veya şifre hatalı",
        )

    doc_id, _ = result
    return {"success": True, "doc_id": doc_id, "email": email}


def register_user(email: str, password: str, first_name: str, last_name: str) -> dict:
    if get_user_by_email(email) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Bu email zaten kayıtlı",
        )

    doc_id = create_user(email, password, first_name, last_name)
    return {"success": True, "doc_id": doc_id, "email": email}
