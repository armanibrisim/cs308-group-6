from typing import List, Optional

from pydantic import BaseModel, Field


class InvoiceItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int = Field(ge=1)
    unit_price: float = Field(ge=0)
    subtotal: float = Field(ge=0)


class InvoiceCreate(BaseModel):
    customer_id: str
    customer_email: str
    customer_name: str
    delivery_address: str
    items: List[InvoiceItem]
    subtotal: float = Field(ge=0)
    discount_amount: Optional[float] = Field(default=None, ge=0)
    promo_code: Optional[str] = None
    tax: float = Field(ge=0)
    shipping: float = Field(ge=0)
    total_amount: float = Field(ge=0)


class InvoiceResponse(BaseModel):
    id: str
    customer_id: str
    customer_email: str
    customer_name: str
    customer_tax_id: Optional[str] = None
    delivery_address: str
    items: List[InvoiceItem]
    subtotal: float
    discount_amount: Optional[float] = None
    promo_code: Optional[str] = None
    tax: float
    shipping: float
    total_amount: float
    created_at: str
