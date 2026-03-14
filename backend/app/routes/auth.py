from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from firebase_admin import firestore
from app.firebase import get_firebase_app

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
async def login(body: LoginRequest):
    get_firebase_app()
    db = firestore.client()

    users = db.collection("users").stream()

    for doc in users:
        data = doc.to_dict()
        if data.get("email") == body.email and data.get("password") == body.password:
            return {
                "success": True,
                "doc_id": doc.id,
                "email": data.get("email"),
            }

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Email veya şifre hatalı",
    )
