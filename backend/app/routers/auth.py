from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_current_user
from app.models.user import AddressCreate, AddressResponse, AuthResponse, LoginRequest, RegisterRequest
from app.repositories.user_repository import (
    add_address,
    delete_address,
    get_addresses,
    get_user_by_id,
    set_default_address,
)
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


# ── Address endpoints ─────────────────────────────────────────────────────────

@router.get("/me/addresses", response_model=list[AddressResponse])
async def list_addresses(current_user: dict = Depends(get_current_user)):
    return get_addresses(current_user["user_id"])


@router.post("/me/addresses", response_model=AddressResponse, status_code=status.HTTP_201_CREATED)
async def create_address(
    body: AddressCreate,
    current_user: dict = Depends(get_current_user),
):
    existing = get_addresses(current_user["user_id"])
    if len(existing) >= 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum of 10 addresses allowed",
        )
    return add_address(current_user["user_id"], body.label, body.full_address, body.is_default)


@router.delete("/me/addresses/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_address(
    address_id: str,
    current_user: dict = Depends(get_current_user),
):
    found = delete_address(current_user["user_id"], address_id)
    if not found:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")


@router.patch("/me/addresses/{address_id}/default", response_model=list[AddressResponse])
async def make_default_address(
    address_id: str,
    current_user: dict = Depends(get_current_user),
):
    found = set_default_address(current_user["user_id"], address_id)
    if not found:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")
    return get_addresses(current_user["user_id"])
