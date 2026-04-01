from typing import Optional

from fastapi import APIRouter, Depends

from app.dependencies import require_role
from app.models.product import DiscountApply, DiscountApplyResponse, ProductResponse
from app.models.invoice import InvoiceResponse
from app.services.discount_service import apply_discount_to_products, remove_discount_from_product
from app.services.analytics_service import get_analytics, get_invoices_in_range

router = APIRouter(prefix="/sales", tags=["sales"])

_sm = require_role("sales_manager")


@router.post("/discounts", response_model=DiscountApplyResponse)
async def apply_discount(
    body: DiscountApply,
    _: dict = Depends(_sm),
):
    """Apply a discount percentage to a list of products and notify wishlist users."""
    return apply_discount_to_products(body)


@router.delete("/discounts/{product_id}", response_model=ProductResponse)
async def remove_discount(
    product_id: str,
    _: dict = Depends(_sm),
):
    """Remove the discount from a product and restore its original price."""
    return remove_discount_from_product(product_id)


@router.get("/invoices", response_model=list[InvoiceResponse])
async def list_invoices_filtered(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    _: dict = Depends(_sm),
):
    """List invoices, optionally filtered to a date range (YYYY-MM-DD)."""
    return get_invoices_in_range(start_date, end_date)


@router.get("/analytics")
async def revenue_analytics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    _: dict = Depends(_sm),
):
    """Return revenue, cost, profit totals and a daily chart timeseries."""
    return get_analytics(start_date, end_date)
