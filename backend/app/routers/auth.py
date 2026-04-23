from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_current_user
from app.models.user import AddressCreate, AddressResponse, AuthResponse, LoginRequest, RegisterRequest, SavedCardCreate, SavedCardResponse
from app.repositories import notification_repository
from app.repositories.user_repository import (
    add_address,
    add_saved_card,
    delete_address,
    delete_saved_card,
    get_addresses,
    get_saved_cards,
    get_user_by_id,
    set_default_address,
    set_default_card,
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


# ── Saved card endpoints ──────────────────────────────────────────────────────

@router.get("/me/cards", response_model=list[SavedCardResponse])
async def list_cards(current_user: dict = Depends(get_current_user)):
    return get_saved_cards(current_user["user_id"])


@router.post("/me/cards", response_model=SavedCardResponse, status_code=status.HTTP_201_CREATED)
async def create_card(
    body: SavedCardCreate,
    current_user: dict = Depends(get_current_user),
):
    existing = get_saved_cards(current_user["user_id"])
    if len(existing) >= 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum of 10 saved cards allowed",
        )
    return add_saved_card(
        current_user["user_id"], body.label, body.last4,
        body.card_holder_name, body.expiry, body.is_default,
    )


@router.delete("/me/cards/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_card(
    card_id: str,
    current_user: dict = Depends(get_current_user),
):
    found = delete_saved_card(current_user["user_id"], card_id)
    if not found:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")


@router.patch("/me/cards/{card_id}/default", response_model=list[SavedCardResponse])
async def make_default_card(
    card_id: str,
    current_user: dict = Depends(get_current_user),
):
    found = set_default_card(current_user["user_id"], card_id)
    if not found:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")
    return get_saved_cards(current_user["user_id"])


# ── Notification endpoints ────────────────────────────────────────────────────

@router.get("/me/notifications")
async def list_notifications(current_user: dict = Depends(get_current_user)):
    return notification_repository.get_notifications_for_user(current_user["user_id"])


@router.patch("/me/notifications/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def read_notification(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
):
    notification_repository.mark_notification_read(current_user["user_id"], notification_id)


@router.patch("/me/notifications/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def read_all_notifications(current_user: dict = Depends(get_current_user)):
    notification_repository.mark_all_read(current_user["user_id"])
