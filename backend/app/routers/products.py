from typing import Optional

from fastapi import APIRouter, Depends, Query, status

from app.dependencies import require_role
from app.models.product import (
    CategoryCreate,
    CategoryResponse,
    ProductCreate,
    ProductListResponse,
    ProductResponse,
    ProductUpdate,
    StockUpdate,
)
from app.services.product_service import (
    add_category,
    add_product,
    fetch_categories,
    fetch_featured_products,
    fetch_product,
    fetch_products,
    modify_product,
    remove_product,
    search_products,
    update_stock_quantity,
)

router = APIRouter(prefix="/products", tags=["products"])


# ── Static sub-routes must come before /{product_id} ──────────────────────────

@router.get("/featured", response_model=ProductListResponse)
async def get_featured_products(limit: int = Query(default=8, ge=1, le=50)):
    return fetch_featured_products(limit)


@router.get("/search", response_model=list[ProductResponse])
async def search_products_endpoint(q: str = Query(..., min_length=1)):
    return search_products(q)


# ── Main product list ──────────────────────────────────────────────────────────

@router.get("", response_model=ProductListResponse)
async def list_products(
    category_id: Optional[str] = None,
    category: Optional[str] = None,        # filter by category name/slug
    search: Optional[str] = None,
    sort_by: Optional[str] = None,         # legacy: price_asc | price_desc | name_asc
    sortBy: Optional[str] = None,          # new: price | name | newest
    sortOrder: Optional[str] = None,       # new: asc | desc
    page: int = 1,
    limit: int = 20,
):
    return fetch_products(
        category_id=category_id,
        category=category,
        search=search,
        sort_by=sort_by,
        sort_by_field=sortBy,
        sort_order=sortOrder,
        page=page,
        limit=limit,
    )


# ── Single product ─────────────────────────────────────────────────────────────

@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str):
    return fetch_product(product_id)


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    body: ProductCreate,
    current_user: dict = Depends(require_role("product_manager", "sales_manager")),
):
    return add_product(body)


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    body: ProductUpdate,
    current_user: dict = Depends(require_role("product_manager")),
):
    return modify_product(product_id, body)


@router.patch("/{product_id}/stock", response_model=ProductResponse)
async def update_stock(
    product_id: str,
    body: StockUpdate,
    current_user: dict = Depends(require_role("product_manager")),
):
    return update_stock_quantity(product_id, body)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product_endpoint(
    product_id: str,
    current_user: dict = Depends(require_role("product_manager")),
):
    remove_product(product_id)


# ── Categories ─────────────────────────────────────────────────────────────────

categories_router = APIRouter(prefix="/categories", tags=["categories"])


@categories_router.get("", response_model=list[CategoryResponse])
async def list_categories():
    return fetch_categories()


@categories_router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    body: CategoryCreate,
    current_user: dict = Depends(require_role("product_manager")),
):
    return add_category(body)
