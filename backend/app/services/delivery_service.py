from typing import Optional

from fastapi import HTTPException, status

from app.models.delivery import DeliveryCreate, DeliveryResponse
from app.repositories import delivery_repository, product_repository


def create_delivery(payload: DeliveryCreate) -> DeliveryResponse:
    product = product_repository.get_product_by_id(payload.product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    data = payload.model_dump()
    delivery_id = delivery_repository.create_delivery(data)
    delivery = delivery_repository.get_delivery_by_id(delivery_id)
    return _to_response(delivery, product)


def fetch_deliveries(is_completed: Optional[bool] = None) -> list[DeliveryResponse]:
    deliveries = delivery_repository.list_deliveries(is_completed)
    result = []
    for d in deliveries:
        product = product_repository.get_product_by_id(d["product_id"])
        result.append(_to_response(d, product))
    return result


def fetch_delivery(delivery_id: str) -> DeliveryResponse:
    delivery = delivery_repository.get_delivery_by_id(delivery_id)
    if not delivery:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery not found")
    product = product_repository.get_product_by_id(delivery["product_id"])
    return _to_response(delivery, product)


def complete_delivery(delivery_id: str) -> DeliveryResponse:
    delivery = delivery_repository.get_delivery_by_id(delivery_id)
    if not delivery:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery not found")
    if delivery["is_completed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Delivery is already marked as completed",
        )
    delivery_repository.mark_delivery_complete(delivery_id)
    delivery["is_completed"] = True
    product = product_repository.get_product_by_id(delivery["product_id"])
    return _to_response(delivery, product)


def _to_response(delivery: dict, product: Optional[dict]) -> DeliveryResponse:
    return DeliveryResponse(
        id=delivery["id"],
        customer_id=delivery["customer_id"],
        product_id=delivery["product_id"],
        product_name=product["name"] if product else None,
        quantity=delivery["quantity"],
        total_price=delivery["total_price"],
        delivery_address=delivery["delivery_address"],
        is_completed=delivery["is_completed"],
        order_id=delivery.get("order_id"),
        created_at=delivery["created_at"],
    )
