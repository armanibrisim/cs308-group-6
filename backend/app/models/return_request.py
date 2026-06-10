from typing import Optional

from pydantic import BaseModel, Field


class CreateReturnBody(BaseModel):
    reason: str = Field(default="", max_length=2000)


class ReturnRequestResponse(BaseModel):
    id: str
    order_id: str
    customer_id: str
    customer_user_id: Optional[int] = None  # sequential integer user ID
    customer_email: Optional[str] = None
    customer_name: Optional[str] = None
    product_id: str
    product_name: str
    quantity: int
    total_price: float
    reason: str
    status: str
    created_at: str


class ReturnableItem(BaseModel):
    """A single order line item the customer is currently eligible to return."""
    order_id: str
    order_date: str          # ISO timestamp of the order
    delivered_at: str        # ISO timestamp when order became delivered
    days_left: int           # Whole days remaining in the 30-day return window
    product_id: str
    product_name: str
    quantity: int
    unit_price: float
    subtotal: float          # unit_price * quantity (pre-discount line total)
    image_url: Optional[str] = None

