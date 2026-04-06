from typing import Optional

from pydantic import BaseModel, Field


class DeliveryCreate(BaseModel):
    customer_id: str
    product_id: str
    quantity: int = Field(ge=1)
    total_price: float = Field(ge=0)
    delivery_address: str
    order_id: Optional[str] = None  # links delivery to the originating order


class DeliveryResponse(BaseModel):
    id: str
    customer_id: str
    product_id: str
    product_name: Optional[str] = None
    quantity: int
    total_price: float
    delivery_address: str
    is_completed: bool
    order_id: Optional[str] = None
    created_at: str
