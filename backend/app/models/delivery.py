from typing import Optional

from pydantic import BaseModel, Field


class DeliveryCreate(BaseModel):
    customer_id: str
    product_id: str
    quantity: int = Field(ge=1)
    total_price: float = Field(ge=0)
    delivery_address: str


class DeliveryResponse(BaseModel):
    id: str
    customer_id: str
    product_id: str
    product_name: Optional[str] = None
    quantity: int
    total_price: float
    delivery_address: str
    is_completed: bool
    created_at: str
