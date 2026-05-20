from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status

from app.models.return_request import ReturnRequestResponse
from app.repositories import order_repository, return_request_repository
from app.repositories.product_repository import increment_stock

RETURN_WINDOW_DAYS = 30


def _parse_dt(iso: str) -> datetime:
    dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _delivery_timestamp(order: dict) -> str:
    """Prefer delivered_at (set when status → delivered); else updated_at / created_at."""
    if order.get("delivered_at"):
        return order["delivered_at"]
    if order.get("status") == "delivered" and order.get("updated_at"):
        return order["updated_at"]
    return order.get("created_at", "")


def _within_return_window(order: dict) -> bool:
    raw = _delivery_timestamp(order)
    if not raw:
        return False
    try:
        delivered = _parse_dt(raw)
    except ValueError:
        return False
    return datetime.now(timezone.utc) - delivered <= timedelta(days=RETURN_WINDOW_DAYS)


def _to_response(d: dict) -> ReturnRequestResponse:
    return ReturnRequestResponse(
        id=d["id"],
        order_id=d["order_id"],
        customer_id=d["customer_id"],
        customer_email=d.get("customer_email"),
        customer_name=d.get("customer_name"),
        product_id=d["product_id"],
        product_name=d["product_name"],
        quantity=d["quantity"],
        total_price=float(d["total_price"]),
        reason=d.get("reason", "") or "",
        status=d["status"],
        created_at=d["created_at"],
    )


def create_return_for_line(
    customer_id: str,
    order_id: str,
    product_id: str,
    reason: str,
) -> ReturnRequestResponse:
    order = order_repository.get_order_by_id(order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if order["customer_id"] != customer_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    if order.get("status") != "delivered":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only delivered orders are eligible for return",
        )
    if not _within_return_window(order):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Return window has expired (30 days from delivery)",
        )

    line = next((i for i in order.get("items", []) if i.get("product_id") == product_id), None)
    if not line:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not in this order")

    existing = return_request_repository.any_return_for_line(order_id, product_id)
    if existing and existing.get("status") in ("pending", "approved"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A return request for this item already exists",
        )

    payload = {
        "order_id": order_id,
        "customer_id": customer_id,
        "customer_email": order.get("customer_email", ""),
        "customer_name": order.get("customer_name", ""),
        "product_id": product_id,
        "product_name": line.get("product_name", ""),
        "quantity": int(line.get("quantity", 1)),
        "total_price": float(line.get("subtotal", 0)),
        "reason": (reason or "").strip(),
        "status": "pending",
    }
    rid = return_request_repository.create_return(payload)
    saved = return_request_repository.get_return_by_id(rid)
    if not saved:
        raise HTTPException(status_code=500, detail="Failed to save return request")
    return _to_response(saved)


def list_my_returns(customer_id: str) -> list[ReturnRequestResponse]:
    rows = return_request_repository.list_returns_for_customer(customer_id)
    return [_to_response(r) for r in rows]


def list_all_returns() -> list[ReturnRequestResponse]:
    rows = return_request_repository.list_all_returns()
    return [_to_response(r) for r in rows]


def approve_return(return_id: str) -> ReturnRequestResponse:
    row = return_request_repository.get_return_by_id(return_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Return request not found")
    if row.get("status") != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request is not pending")

    increment_stock(row["product_id"], int(row.get("quantity", 1)))
    return_request_repository.update_return_status(return_id, "approved")
    row["status"] = "approved"
    return _to_response(row)


def reject_return(return_id: str) -> ReturnRequestResponse:
    row = return_request_repository.get_return_by_id(return_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Return request not found")
    if row.get("status") != "pending":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Request is not pending")

    return_request_repository.update_return_status(return_id, "rejected")
    row["status"] = "rejected"
    return _to_response(row)
