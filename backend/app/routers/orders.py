from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_current_user, require_role
from app.models.order import OrderResponse, OrderStatusUpdate
from app.services.order_service import (
    fetch_all_orders,
    fetch_my_orders,
    fetch_order,
    update_order_status,
)

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=list[OrderResponse])
async def list_my_orders(current_user: dict = Depends(get_current_user)):
    """Customer: list their own orders."""
    return fetch_my_orders(current_user["user_id"])


@router.get("/all", response_model=list[OrderResponse])
async def list_all_orders(
    status: Optional[str] = Query(default=None, pattern="^(processing|in-transit|delivered)$"),
    _: dict = Depends(require_role("product_manager")),
):
    """Product manager: list all orders with optional status filter."""
    return fetch_all_orders(status)


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Customer: get a specific order (must belong to them)."""
    return fetch_order(order_id, current_user["user_id"])


@router.patch("/{order_id}/status", response_model=OrderResponse)
async def set_order_status(
    order_id: str,
    payload: OrderStatusUpdate,
    _: dict = Depends(require_role("product_manager")),
):
    """Product manager: advance order status (processing → in-transit → delivered)."""
    return update_order_status(order_id, payload)
