from fastapi import HTTPException, status

from app.models.order import OrderResponse, OrderStatusUpdate
from app.repositories import order_repository


def fetch_my_orders(customer_id: str) -> list[OrderResponse]:
    orders = order_repository.list_orders_by_customer(customer_id)
    return [OrderResponse(**o) for o in orders]


def fetch_order(order_id: str, customer_id: str) -> OrderResponse:
    """Return the order only if it belongs to the requesting customer."""
    order = order_repository.get_order_by_id(order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if order["customer_id"] != customer_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return OrderResponse(**order)


def fetch_all_orders(order_status: str | None) -> list[OrderResponse]:
    """Product manager: list all orders with optional status filter."""
    orders = order_repository.list_all_orders(status=order_status)
    return [OrderResponse(**o) for o in orders]


def update_order_status(order_id: str, payload: OrderStatusUpdate) -> OrderResponse:
    """Product manager: advance order status (linear: processing → in-transit → delivered)."""
    order = order_repository.get_order_by_id(order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    allowed_transitions = {
        "processing": {"in-transit"},
        "in-transit": {"delivered"},
        "delivered": set(),
    }
    current = order["status"]
    if payload.status not in allowed_transitions.get(current, set()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from '{current}' to '{payload.status}'",
        )

    order_repository.update_order_status(order_id, payload.status)
    order["status"] = payload.status
    return OrderResponse(**order)


def update_order_status_free(order_id: str, payload: OrderStatusUpdate) -> OrderResponse:
    """Sales manager: set an order to any valid status without transition restrictions."""
    order = order_repository.get_order_by_id(order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    order_repository.update_order_status(order_id, payload.status)
    order["status"] = payload.status
    return OrderResponse(**order)
