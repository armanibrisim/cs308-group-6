from typing import Optional
from pydantic import BaseModel, Field


class CartItemAdd(BaseModel):
    product_id: str
    quantity: int = Field(ge=1)


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1)


class CartItemResponse(BaseModel):
    product_id: str
    quantity: int
    # Enriched product fields returned to the frontend
    name: str
    price: float
    image_url: Optional[str] = None
    description: str
    stock_quantity: int


class CartResponse(BaseModel):
    user_id: str
    items: list[CartItemResponse]
    subtotal: float
    shipping: float
    tax: float
    total: float


class CartClearResponse(BaseModel):
    success: bool
    message: str
