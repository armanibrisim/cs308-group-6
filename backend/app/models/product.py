from typing import Optional
from pydantic import BaseModel, Field


class ProductCreate(BaseModel):
    name: str
    model: str
    serial_number: str
    description: str
    stock_quantity: int = Field(ge=0)
    price: float = Field(gt=0)
    warranty: str
    distributor: str
    category_id: str
    image_url: Optional[str] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    model: Optional[str] = None
    serial_number: Optional[str] = None
    description: Optional[str] = None
    stock_quantity: Optional[int] = Field(default=None, ge=0)
    price: Optional[float] = Field(default=None, gt=0)
    warranty: Optional[str] = None
    distributor: Optional[str] = None
    category_id: Optional[str] = None
    image_url: Optional[str] = None


class ProductResponse(BaseModel):
    id: str
    name: str
    model: str
    serial_number: str
    description: str
    stock_quantity: int
    price: float
    warranty: str
    distributor: str
    category_id: str
    image_url: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class CategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    parent_category_id: Optional[str] = None


class CategoryResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    parent_category_id: Optional[str] = None


class ProductListResponse(BaseModel):
    products: list[ProductResponse]
    total: int
