from fastapi import APIRouter, Depends

from app.dependencies import get_current_user
from app.models.product import ProductResponse
from app.models.wishlist import WishlistResponse
from app.services.wishlist_service import (
    add_to_wishlist,
    get_wishlist,
    get_wishlist_products,
    remove_from_wishlist,
)

router = APIRouter(prefix="/wishlist", tags=["wishlist"])


@router.get("", response_model=WishlistResponse)
async def fetch_wishlist(current_user: dict = Depends(get_current_user)):
    return get_wishlist(current_user["user_id"])


@router.get("/products", response_model=list[ProductResponse])
async def fetch_wishlist_products(current_user: dict = Depends(get_current_user)):
    return get_wishlist_products(current_user["user_id"])


@router.post("/{product_id}", response_model=WishlistResponse)
async def save_product(
    product_id: str,
    current_user: dict = Depends(get_current_user),
):
    return add_to_wishlist(current_user["user_id"], product_id)


@router.delete("/{product_id}", response_model=WishlistResponse)
async def unsave_product(
    product_id: str,
    current_user: dict = Depends(get_current_user),
):
    return remove_from_wishlist(current_user["user_id"], product_id)
