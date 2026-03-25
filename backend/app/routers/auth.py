from fastapi import APIRouter, status
from app.models.user import LoginRequest, RegisterRequest, AuthResponse
from app.services.auth_service import login_user, register_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    return login_user(body.email, body.password)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest):
    return register_user(body.email, body.password, body.first_name, body.last_name)
