from fastapi import APIRouter, Depends, status

from app.dependencies import get_current_user
from app.models.cart import (
    CartClearResponse,
    CartItemAdd,
    CartItemUpdate,
    CartResponse,
)
from app.services.cart_service import (
    add_item_to_cart,
    clear_user_cart,
    get_user_cart,
    remove_item_from_cart,
    update_cart_item,
)

router = APIRouter(prefix="/cart", tags=["cart"])


@router.get("", response_model=CartResponse)
async def get_cart(current_user: dict = Depends(get_current_user)):
    return get_user_cart(current_user["user_id"])


@router.post("/items", response_model=CartResponse, status_code=status.HTTP_200_OK)
async def add_item(
    body: CartItemAdd,
    current_user: dict = Depends(get_current_user),
):
    return add_item_to_cart(current_user["user_id"], body)


@router.put("/items/{product_id}", response_model=CartResponse)
async def update_item(
    product_id: str,
    body: CartItemUpdate,
    current_user: dict = Depends(get_current_user),
):
    return update_cart_item(current_user["user_id"], product_id, body)


@router.delete("/items/{product_id}", response_model=CartResponse)
async def remove_item(
    product_id: str,
    current_user: dict = Depends(get_current_user),
):
    return remove_item_from_cart(current_user["user_id"], product_id)


@router.delete("", response_model=CartClearResponse)
async def clear_cart(current_user: dict = Depends(get_current_user)):
    return clear_user_cart(current_user["user_id"])
