from fastapi import APIRouter, Depends, status
from app.dependencies import get_current_user
from app.models.user import LoginRequest, RegisterRequest, AuthResponse
from app.repositories.user_repository import get_user_by_id
from app.services.auth_service import login_user, register_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    return login_user(body.email, body.password)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest):
    return register_user(body.email, body.password, body.first_name, body.last_name)


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    user = get_user_by_id(current_user["user_id"])
    if not user:
        return {}
    return {
        "first_name": user.get("first_name", ""),
        "last_name": user.get("last_name", ""),
        "email": user.get("email", ""),
        "role": user.get("role", "customer"),
    }
