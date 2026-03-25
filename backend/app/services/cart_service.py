from fastapi import HTTPException, status

from app.models.cart import (
    CartClearResponse,
    CartItemAdd,
    CartItemResponse,
    CartItemUpdate,
    CartResponse,
)
from app.repositories.cart_repository import (
    add_or_update_item,
    clear_cart,
    get_cart,
    remove_item,
)
from app.repositories.product_repository import get_product_by_id

SHIPPING_COST = 45.00
FREE_SHIPPING_THRESHOLD = 5000.00
TAX_RATE = 0.08


def _calculate_totals(subtotal: float) -> tuple[float, float, float]:
    """Return (shipping, tax, total)."""
    shipping = 0.0 if subtotal == 0 or subtotal >= FREE_SHIPPING_THRESHOLD else SHIPPING_COST
    tax = round(subtotal * TAX_RATE, 2)
    total = round(subtotal + shipping + tax, 2)
    return shipping, tax, total


def _enrich_cart_items(raw_items: list[dict]) -> list[CartItemResponse]:
    """Fetch product details for each cart item and build response objects."""
    enriched = []
    for item in raw_items:
        product = get_product_by_id(item["product_id"])
        if product is None:
            # Product was deleted; skip silently
            continue
        enriched.append(CartItemResponse(
            product_id=item["product_id"],
            quantity=item["quantity"],
            name=product["name"],
            price=product["price"],
            image_url=product.get("image_url"),
            description=product["description"],
            stock_quantity=product["stock_quantity"],
        ))
    return enriched


def get_user_cart(user_id: str) -> CartResponse:
    cart = get_cart(user_id)
    items = _enrich_cart_items(cart.get("items", []))
    subtotal = round(sum(i.price * i.quantity for i in items), 2)
    shipping, tax, total = _calculate_totals(subtotal)
    return CartResponse(
        user_id=user_id,
        items=items,
        subtotal=subtotal,
        shipping=shipping,
        tax=tax,
        total=total,
    )


def add_item_to_cart(user_id: str, payload: CartItemAdd) -> CartResponse:
    product = get_product_by_id(payload.product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    if product["stock_quantity"] < payload.quantity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Requested quantity exceeds available stock",
        )

    # Check if item already in cart and compute new quantity
    cart = get_cart(user_id)
    existing_qty = next(
        (i["quantity"] for i in cart.get("items", []) if i["product_id"] == payload.product_id),
        0,
    )
    new_quantity = existing_qty + payload.quantity
    if product["stock_quantity"] < new_quantity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Total cart quantity exceeds available stock",
        )

    add_or_update_item(user_id, payload.product_id, new_quantity)
    return get_user_cart(user_id)


def update_cart_item(user_id: str, product_id: str, payload: CartItemUpdate) -> CartResponse:
    product = get_product_by_id(product_id)
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    if product["stock_quantity"] < payload.quantity:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Requested quantity exceeds available stock",
        )

    cart = get_cart(user_id)
    item_exists = any(i["product_id"] == product_id for i in cart.get("items", []))
    if not item_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not in cart",
        )

    add_or_update_item(user_id, product_id, payload.quantity)
    return get_user_cart(user_id)


def remove_item_from_cart(user_id: str, product_id: str) -> CartResponse:
    cart = get_cart(user_id)
    item_exists = any(i["product_id"] == product_id for i in cart.get("items", []))
    if not item_exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not in cart",
        )
    remove_item(user_id, product_id)
    return get_user_cart(user_id)


def clear_user_cart(user_id: str) -> CartClearResponse:
    clear_cart(user_id)
    return CartClearResponse(success=True, message="Cart cleared")
