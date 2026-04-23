"""REST endpoints for promo code management.

Public (any authenticated user):
    POST /promo-codes/validate   — validate a code before checkout

Sales Manager only:
    POST   /promo-codes                         — create a new code
    GET    /promo-codes                         — list all codes
    PATCH  /promo-codes/{code_id}               — update fields on a code
    PATCH  /promo-codes/{code_id}/deactivate    — soft-deactivate a code
    DELETE /promo-codes/{code_id}               — hard-delete a code
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_current_user, require_role
from app.models.promo_code import (
    PromoCodeCreate,
    PromoCodeResponse,
    PromoCodeUpdate,
    PromoCodeValidateRequest,
    PromoCodeValidateResponse,
)
from app.repositories import promo_code_repository

router = APIRouter(prefix="/promo-codes", tags=["promo-codes"])


# ── Public ─────────────────────────────────────────────────────────────────────

@router.post(
    "/validate",
    response_model=PromoCodeValidateResponse,
    summary="Validate a promo code (any authenticated user)",
)
async def validate_promo_code(
    payload: PromoCodeValidateRequest,
    _current_user: dict = Depends(get_current_user),
):
    """Check whether a promo code is usable and return its discount percent."""
    promo = promo_code_repository.validate_promo_code(payload.code)
    return PromoCodeValidateResponse(
        code=promo["code"],
        discount_percent=promo["discount_percent"],
        message=f"Code '{promo['code']}' is valid — {promo['discount_percent']}% off your subtotal.",
    )


# ── Sales Manager ──────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=PromoCodeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a promo code (sales manager)",
)
async def create_promo_code(
    payload: PromoCodeCreate,
    _current_user: dict = Depends(require_role("sales_manager")),
):
    data = payload.model_dump()
    code_id = promo_code_repository.create_promo_code(data)
    promo = promo_code_repository.get_promo_code_by_id(code_id)
    return PromoCodeResponse(**promo)


@router.get(
    "",
    response_model=list[PromoCodeResponse],
    summary="List all promo codes (sales manager)",
)
async def list_promo_codes(
    _current_user: dict = Depends(require_role("sales_manager")),
):
    promos = promo_code_repository.list_promo_codes()
    return [PromoCodeResponse(**p) for p in promos]


@router.patch(
    "/{code_id}",
    response_model=PromoCodeResponse,
    summary="Update promo code fields (sales manager)",
)
async def update_promo_code(
    code_id: str,
    payload: PromoCodeUpdate,
    _current_user: dict = Depends(require_role("sales_manager")),
):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields provided to update.",
        )
    promo = promo_code_repository.update_promo_code(code_id, updates)
    return PromoCodeResponse(**promo)


@router.patch(
    "/{code_id}/deactivate",
    response_model=PromoCodeResponse,
    summary="Deactivate a promo code (sales manager)",
)
async def deactivate_promo_code(
    code_id: str,
    _current_user: dict = Depends(require_role("sales_manager")),
):
    promo = promo_code_repository.deactivate_promo_code(code_id)
    return PromoCodeResponse(**promo)


@router.delete(
    "/{code_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a promo code (sales manager)",
)
async def delete_promo_code(
    code_id: str,
    _current_user: dict = Depends(require_role("sales_manager")),
):
    promo_code_repository.delete_promo_code(code_id)
