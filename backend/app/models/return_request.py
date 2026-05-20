from typing import Optional

from pydantic import BaseModel, Field


class CreateReturnBody(BaseModel):
    reason: str = Field(default="", max_length=2000)


class ReturnRequestResponse(BaseModel):
    id: str
    order_id: str
    customer_id: str
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None
    product_id: str
    product_name: str
    quantity: int
    total_price: float
    reason: str
    status: str
    created_at: str
