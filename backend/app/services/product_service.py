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
    get_product_by_id,
    list_categories,
    list_products,
    update_product,
)

VALID_SORT_OPTIONS = {"price_asc", "price_desc", "name_asc"}


def _to_product_response(data: dict) -> ProductResponse:
    return ProductResponse(
        id=data["id"],
        name=data["name"],
        model=data["model"],
        serial_number=data["serial_number"],
        description=data["description"],
        stock_quantity=data["stock_quantity"],
        price=data["price"],
        warranty=data["warranty"],
        distributor=data["distributor"],
        category_id=data["category_id"],
        image_url=data.get("image_url"),
        created_at=data.get("created_at"),
        updated_at=data.get("updated_at"),
    )


def fetch_products(
    category_id: Optional[str],
    search: Optional[str],
    sort_by: Optional[str],
    page: int,
    limit: int,
) -> ProductListResponse:
    if sort_by and sort_by not in VALID_SORT_OPTIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"sort_by must be one of {VALID_SORT_OPTIONS}",
        )

    products, total = list_products(
        category_id=category_id,
        search=search,
        sort_by=sort_by,
        page=page,
        limit=limit,
    )
    return ProductListResponse(
        products=[_to_product_response(p) for p in products],
        total=total,
    )


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
        description=created.get("description"),
        parent_category_id=created.get("parent_category_id"),
    )
