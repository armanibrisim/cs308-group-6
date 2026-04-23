from fastapi import HTTPException, status

from app.models.wishlist import WishlistResponse
from app.repositories import wishlist_repository
from app.repositories.product_repository import get_product_by_id
from app.services.product_service import fetch_product


def get_wishlist(user_id: str) -> WishlistResponse:
    wishlist = wishlist_repository.get_wishlist_by_user(user_id)
    product_ids = wishlist.get("product_ids", []) if wishlist else []
    return WishlistResponse(product_ids=product_ids)


def add_to_wishlist(user_id: str, product_id: str) -> WishlistResponse:
    if not get_product_by_id(product_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    wishlist_repository.add_to_wishlist(user_id, product_id)
    return get_wishlist(user_id)


def remove_from_wishlist(user_id: str, product_id: str) -> WishlistResponse:
    wishlist_repository.remove_from_wishlist(user_id, product_id)
    return get_wishlist(user_id)


def get_wishlist_products(user_id: str) -> list:
    wishlist = wishlist_repository.get_wishlist_by_user(user_id)
    product_ids = wishlist.get("product_ids", []) if wishlist else []
    results = []
    for pid in product_ids:
        try:
            results.append(fetch_product(pid))
        except HTTPException:
            pass  # product was deleted — skip silently
    return results
