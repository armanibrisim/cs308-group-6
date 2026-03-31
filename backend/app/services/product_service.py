from typing import Optional

from fastapi import HTTPException, status

from app.models.product import (
    CategoryCreate,
    CategoryResponse,
    ProductCreate,
    ProductListResponse,
    ProductResponse,
    ProductUpdate,
)
from app.repositories.product_repository import (
    create_category,
    create_product,
    delete_product,
    get_category_by_id,
    get_category_by_slug,
    get_product_by_id,
    list_categories,
    list_featured_products,
    list_products,
    update_product,
)

VALID_SORT_FIELDS = {"price", "name", "newest"}
VALID_SORT_ORDERS = {"asc", "desc"}

# Legacy combined sort_by values kept for backward compatibility
_LEGACY_SORT_MAP = {
    "price_asc": ("price", "asc"),
    "price_desc": ("price", "desc"),
    "name_asc": ("name", "asc"),
}


def _resolve_sort(sort_by: Optional[str], sort_by_field: Optional[str], sort_order: Optional[str]):
    """Return (sort_field, sort_order) from either legacy combined or new separate params."""
    # New separate params take precedence over legacy combined
    if sort_by_field:
        field = sort_by_field if sort_by_field in VALID_SORT_FIELDS else None
        order = sort_order if sort_order in VALID_SORT_ORDERS else "asc"
        return field, order

    # Legacy combined format
    if sort_by:
        if sort_by in _LEGACY_SORT_MAP:
            return _LEGACY_SORT_MAP[sort_by]
        # If the caller already passes just "price" or "name" without order
        if sort_by in VALID_SORT_FIELDS:
            return sort_by, sort_order if sort_order in VALID_SORT_ORDERS else "asc"
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"sort_by must be one of {set(_LEGACY_SORT_MAP) | VALID_SORT_FIELDS}",
        )

    return None, "asc"


def _resolve_category_id(category_slug: str) -> Optional[str]:
    """Resolve a category name/slug string to a Firestore document ID.

    First tries an exact slug match, then falls back to case-insensitive
    substring match against category names.
    """
    # 1. Exact slug match
    cat = get_category_by_slug(category_slug)
    if cat:
        return cat["id"]

    # 2. Partial name match (e.g. "gaming" matches "Gaming & Consoles")
    lower = category_slug.lower().replace("-", " ")
    for cat in list_categories():
        if lower in cat.get("name", "").lower():
            return cat["id"]

    return None


def _to_product_response(data: dict) -> ProductResponse:
    return ProductResponse(
        id=data["id"],
        name=data["name"],
        model=data["model"],
        serial_number=data["serial_number"],
        description=data["description"],
        stock_quantity=data["stock_quantity"],
        in_stock=data.get("stock_quantity", 0) > 0,
        price=data["price"],
        warranty=data["warranty"],
        distributor=data["distributor"],
        category_id=data["category_id"],
        image_url=data.get("image_url"),
        all_images=data.get("all_images"),
        created_at=data.get("created_at"),
        updated_at=data.get("updated_at"),
    )


def fetch_products(
    category_id: Optional[str],
    category: Optional[str],
    search: Optional[str],
    sort_by: Optional[str],
    sort_by_field: Optional[str],
    sort_order: Optional[str],
    page: int,
    limit: int,
) -> ProductListResponse:
    sort_field, resolved_order = _resolve_sort(sort_by, sort_by_field, sort_order)

    resolved_category_id = category_id
    if category and not category_id:
        resolved_category_id = _resolve_category_id(category)

    products, total = list_products(
        category_id=resolved_category_id,
        search=search,
        sort_field=sort_field,
        sort_order=resolved_order,
        page=page,
        limit=limit,
    )
    return ProductListResponse(
        products=[_to_product_response(p) for p in products],
        total=total,
    )


def fetch_featured_products(limit: int = 8) -> ProductListResponse:
    """Return newest products for the homepage featured section."""
    products, total = list_featured_products(limit)
    return ProductListResponse(
        products=[_to_product_response(p) for p in products],
        total=total,
    )


def search_products(q: str) -> list[ProductResponse]:
    """Full-text search across product names and descriptions."""
    products, _ = list_products(search=q, page=1, limit=50)
    return [_to_product_response(p) for p in products]


def fetch_product(product_id: str) -> ProductResponse:
    data = get_product_by_id(product_id)
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    return _to_product_response(data)


def add_product(payload: ProductCreate) -> ProductResponse:
    data = payload.model_dump()
    product_id = create_product(data)
    created = get_product_by_id(product_id)
    return _to_product_response(created)


def modify_product(product_id: str, payload: ProductUpdate) -> ProductResponse:
    if get_product_by_id(product_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    update_product(product_id, updates)
    updated = get_product_by_id(product_id)
    return _to_product_response(updated)


def remove_product(product_id: str) -> None:
    if get_product_by_id(product_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )
    delete_product(product_id)


# ── Category service ──────────────────────────────────────────────────────────

def fetch_categories() -> list[CategoryResponse]:
    categories = list_categories()
    return [
        CategoryResponse(
            id=c["id"],
            name=c["name"],
            slug=c.get("slug"),
            description=c.get("description"),
            parent_category_id=c.get("parent_category_id"),
        )
        for c in categories
    ]


def add_category(payload: CategoryCreate) -> CategoryResponse:
    data = payload.model_dump()
    category_id = create_category(data)
    created = get_category_by_id(category_id)
    return CategoryResponse(
        id=created["id"],
        name=created["name"],
        slug=created.get("slug"),
        description=created.get("description"),
        parent_category_id=created.get("parent_category_id"),
    )
