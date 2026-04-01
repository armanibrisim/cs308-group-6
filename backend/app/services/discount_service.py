from fastapi import HTTPException, status

from app.models.product import DiscountApply, DiscountApplyResponse
from app.repositories import product_repository, wishlist_repository, notification_repository


def apply_discount_to_products(payload: DiscountApply) -> DiscountApplyResponse:
    """Apply discount_percent to each product, notify wishlist owners."""
    updated_products = []
    notified_user_ids: set[str] = set()

    for product_id in payload.product_ids:
        product_data = product_repository.get_product_by_id(product_id)
        if product_data is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product '{product_id}' not found.",
            )

        # Apply discount in Firestore
        try:
            product_repository.apply_discount(product_id, payload.discount_percent)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

        # Fetch fresh data and collect for response
        refreshed = product_repository.get_product_by_id(product_id)
        updated_products.append(refreshed)

        # Notify wishlist owners
        wishlists = wishlist_repository.get_wishlists_for_product(product_id)
        for wl in wishlists:
            user_id = wl.get("user_id")
            if user_id and user_id not in notified_user_ids:
                notified_user_ids.add(user_id)
                notification_repository.create_notification(
                    user_id=user_id,
                    message=(
                        f"Good news! '{product_data['name']}' in your wishlist "
                        f"is now {payload.discount_percent:.0f}% off — "
                        f"new price is ₺{refreshed['price']:.2f}."
                    ),
                    product_id=product_id,
                    product_name=product_data["name"],
                )

    from app.services.product_service import _to_product_response  # local import avoids circular
    return DiscountApplyResponse(
        updated_count=len(updated_products),
        notified_users=len(notified_user_ids),
        updated_products=[_to_product_response(p) for p in updated_products],
    )


def remove_discount_from_product(product_id: str) -> dict:
    """Restore a product's original price, removing the discount."""
    from app.services.product_service import _to_product_response
    data = product_repository.get_product_by_id(product_id)
    if data is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")
    if not data.get("original_price"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This product has no active discount.")
    try:
        product_repository.remove_discount(product_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    refreshed = product_repository.get_product_by_id(product_id)
    return _to_product_response(refreshed)
