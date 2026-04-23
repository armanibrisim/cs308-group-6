"""Pydantic models for the promo-code feature."""

from typing import Optional

from pydantic import BaseModel, Field


class PromoCodeCreate(BaseModel):
    code: str = Field(
        min_length=1,
        max_length=32,
        description="Human-readable code, e.g. SUMMER20. Stored uppercased.",
    )
    discount_percent: float = Field(
        gt=0, le=100, description="Percentage discount applied to subtotal."
    )
    max_uses: Optional[int] = Field(
        default=None, ge=1, description="Global cap on redemptions. None = unlimited."
    )
    expires_at: Optional[str] = Field(
        default=None,
        description="ISO-8601 datetime string after which the code is invalid. None = never expires.",
    )
    is_active: bool = Field(default=True, description="Soft-toggle; inactive codes are rejected.")


class PromoCodeUpdate(BaseModel):
    discount_percent: Optional[float] = Field(default=None, gt=0, le=100)
    max_uses: Optional[int] = Field(default=None, ge=1)
    expires_at: Optional[str] = None
    is_active: Optional[bool] = None


class PromoCodeResponse(BaseModel):
    id: str
    code: str
    discount_percent: float
    max_uses: Optional[int] = None
    uses: int = 0
    expires_at: Optional[str] = None
    is_active: bool
    created_at: str


class PromoCodeValidateRequest(BaseModel):
    code: str = Field(min_length=1, max_length=32)


class PromoCodeValidateResponse(BaseModel):
    code: str
    discount_percent: float
    message: str
