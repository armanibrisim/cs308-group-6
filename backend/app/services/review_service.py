from fastapi import HTTPException, status

from app.models.review import ReviewCreate, ReviewResponse, ReviewStatusUpdate, VoteResponse
from app.repositories import review_repository
from app.repositories.product_repository import (
    get_product_by_id,
    update_product,
)
from app.repositories.user_repository import get_user_by_id


def submit_review(payload: ReviewCreate, user_id: str) -> ReviewResponse:
    # Build display name from user profile
    user = get_user_by_id(user_id)
    if user:
        first = user.get("first_name", "")
        last = user.get("last_name", "")
        username = f"{first} {last}".strip() or user.get("email", user_id)
    else:
        username = user_id

    # Verify the product exists
    product = get_product_by_id(payload.product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    # Enforce one review per user per product
    existing = review_repository.get_review_by_user_and_product(user_id, payload.product_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already reviewed this product",
        )

    data = {
        "product_id": payload.product_id,
        "user_id": user_id,
        "username": username,
        "rating": payload.rating,
        "comment": payload.comment,
    }
    review_id = review_repository.create_review(data)
    data["id"] = review_id
    return ReviewResponse(**data)


def fetch_approved_reviews(product_id: str) -> list[ReviewResponse]:
    reviews = review_repository.get_reviews_by_product(product_id, approved_only=True)
    # Sort newest first
    reviews.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    return [ReviewResponse(**r) for r in reviews]


def fetch_pending_reviews() -> list[ReviewResponse]:
    reviews = review_repository.get_pending_reviews()
    reviews.sort(key=lambda r: r.get("created_at", ""))
    return [ReviewResponse(**r) for r in reviews]


def approve_review(review_id: str) -> ReviewResponse:
    review = review_repository.get_review_by_id(review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    if review["status"] != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending reviews can be approved",
        )

    review_repository.update_review_status(review_id, "approved")
    review["status"] = "approved"

    # Recalculate and persist average_rating + review_count on the product
    _sync_product_rating(review["product_id"])

    return ReviewResponse(**review)


def reject_review(review_id: str) -> ReviewResponse:
    review = review_repository.get_review_by_id(review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    if review["status"] != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending reviews can be rejected",
        )

    review_repository.update_review_status(review_id, "rejected")
    review["status"] = "rejected"
    return ReviewResponse(**review)


def fetch_my_review(product_id: str, user_id: str) -> ReviewResponse | None:
    review = review_repository.get_review_by_user_and_product(user_id, product_id)
    if not review:
        return None
    return ReviewResponse(**review)


def handle_vote(review_id: str, vote_type: str, user_id: str) -> VoteResponse:
    review = review_repository.get_review_by_id(review_id)
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
    if review.get("status") != "approved":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only vote on approved reviews")

    current_vote = review_repository.get_user_vote(review_id, user_id)

    if current_vote == vote_type:
        # Toggle off — un-vote
        review_repository.remove_vote(review_id, user_id, vote_type)
        new_user_vote = None
    else:
        # New vote or switch vote
        review_repository.set_vote(review_id, user_id, review["product_id"], vote_type)
        new_user_vote = vote_type

    updated = review_repository.get_review_by_id(review_id)
    return VoteResponse(
        likes=updated.get("likes", 0),
        dislikes=updated.get("dislikes", 0),
        user_vote=new_user_vote,
    )


def get_my_votes(user_id: str, product_id: str) -> dict[str, str]:
    return review_repository.get_user_votes_for_product(user_id, product_id)


# ── Internal helpers ───────────────────────────────────────────────────────────

def _sync_product_rating(product_id: str) -> None:
    """Recompute average_rating and review_count from approved reviews and write to product."""
    ratings = review_repository.get_approved_ratings_for_product(product_id)
    count = len(ratings)
    avg = round(sum(ratings) / count, 2) if count > 0 else None
    update_product(product_id, {"average_rating": avg, "review_count": count})
