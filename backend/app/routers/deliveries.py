from typing import Optional

from fastapi import APIRouter, Depends, status

from app.dependencies import require_role
from app.models.delivery import DeliveryCreate, DeliveryResponse
from app.services.delivery_service import (
    complete_delivery,
    create_delivery,
    fetch_deliveries,
    fetch_delivery,
)

router = APIRouter(prefix="/deliveries", tags=["deliveries"])


@router.get("", response_model=list[DeliveryResponse])
async def list_deliveries(
    is_completed: Optional[bool] = None,
    current_user: dict = Depends(require_role("product_manager")),
):
    return fetch_deliveries(is_completed)


@router.get("/{delivery_id}", response_model=DeliveryResponse)
async def get_delivery(
    delivery_id: str,
    current_user: dict = Depends(require_role("product_manager")),
):
    return fetch_delivery(delivery_id)


@router.post("", response_model=DeliveryResponse, status_code=status.HTTP_201_CREATED)
async def add_delivery(
    body: DeliveryCreate,
    current_user: dict = Depends(require_role("product_manager")),
):
    return create_delivery(body)


@router.patch("/{delivery_id}/complete", response_model=DeliveryResponse)
async def mark_complete(
    delivery_id: str,
    current_user: dict = Depends(require_role("product_manager")),
):
    return complete_delivery(delivery_id)
