from typing import List, Optional

from pydantic import BaseModel, Field

ORDER_STATUSES = {"processing", "in-transit", "delivered"}


class OrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int = Field(ge=1)
    unit_price: float = Field(ge=0)
    subtotal: float = Field(ge=0)


class OrderResponse(BaseModel):
    id: str
    customer_id: str
    customer_email: str
    customer_name: str
    delivery_address: str
    items: List[OrderItem]
    subtotal: float
    discount_amount: Optional[float] = None
    promo_code: Optional[str] = None
    tax: float
    shipping: float
    total_amount: float
    status: str  # "processing" | "in-transit" | "delivered"
    invoice_id: Optional[str] = None
    created_at: str
    updated_at: str


class OrderStatusUpdate(BaseModel):
    status: str = Field(pattern="^(processing|in-transit|delivered)$")


class CheckoutRequest(BaseModel):
    delivery_address: str
    # Mock payment fields — no real processing, just stored for audit
    card_last4: str = Field(min_length=4, max_length=4, pattern="^[0-9]{4}$")
    card_holder_name: str
    promo_code: Optional[str] = None  # Optional promo code to apply at checkout
