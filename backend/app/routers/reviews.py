from fastapi import APIRouter, Depends, Query

from app.dependencies import get_current_user, require_role
from app.models.review import ReviewCreate, ReviewResponse, ReviewStatusUpdate, VoteCreate, VoteResponse
from app.services.review_service import (
    approve_review,
    fetch_all_reviews,
    fetch_approved_reviews,
    fetch_my_review,
    fetch_pending_reviews,
    get_my_votes,
    handle_vote,
    reject_review,
    submit_review,
)

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.post("", response_model=ReviewResponse, status_code=201)
async def create_review(
    payload: ReviewCreate,
    current_user: dict = Depends(get_current_user),
):
    return submit_review(payload, current_user["user_id"])


@router.get("/product/{product_id}", response_model=list[ReviewResponse])
async def list_approved_reviews(product_id: str):
    return fetch_approved_reviews(product_id)


@router.get("/all", response_model=list[ReviewResponse])
async def list_all_reviews(
    status: str | None = Query(default=None, pattern="^(pending|approved|rejected)$"),
    limit: int = Query(default=50, ge=1, le=100),
    start_after: str | None = Query(default=None),
    _: dict = Depends(require_role("product_manager")),
):
    return fetch_all_reviews(status=status, limit=limit, start_after=start_after)


@router.get("/pending", response_model=list[ReviewResponse])
async def list_pending_reviews(
    _: dict = Depends(require_role("product_manager")),
):
    return fetch_pending_reviews()


@router.put("/{review_id}/status", response_model=ReviewResponse)
async def update_review_status(
    review_id: str,
    payload: ReviewStatusUpdate,
    _: dict = Depends(require_role("product_manager")),
):
    if payload.status == "approved":
        return approve_review(review_id)
    return reject_review(review_id)


@router.patch("/{review_id}/approve", response_model=ReviewResponse)
async def approve_review_endpoint(
    review_id: str,
    _: dict = Depends(require_role("product_manager")),
):
    return approve_review(review_id)


@router.patch("/{review_id}/reject", response_model=ReviewResponse)
async def reject_review_endpoint(
    review_id: str,
    _: dict = Depends(require_role("product_manager")),
):
    return reject_review(review_id)


# ── Vote endpoints (must come after static routes to avoid conflicts) ──────────

@router.get("/my-review/{product_id}", response_model=ReviewResponse | None)
async def my_review(
    product_id: str,
    current_user: dict = Depends(get_current_user),
):
    return fetch_my_review(product_id, current_user["user_id"])


@router.get("/votes/my-votes", response_model=dict[str, str])
async def my_votes(
    product_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    return get_my_votes(current_user["user_id"], product_id)


@router.post("/{review_id}/vote", response_model=VoteResponse)
async def vote_review(
    review_id: str,
    payload: VoteCreate,
    current_user: dict = Depends(get_current_user),
):
    return handle_vote(review_id, payload.vote_type, current_user["user_id"])
