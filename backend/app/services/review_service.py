from fastapi import HTTPException, status

from app.models.review import ReviewCreate, ReviewResponse, ReviewStatusUpdate, VoteResponse
from app.repositories import review_repository
from app.repositories.product_repository import (
    get_product_by_id,
    get_product_names_by_ids,
    update_product_rating_counters,
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

    # Rating-only reviews (no comment) are auto-approved — no manager action needed.
    # We update the product rating counters immediately in that case.
    has_comment = bool(payload.comment.strip())
    if not has_comment:
        review_repository.update_review_status(review_id, "approved")
        update_product_rating_counters(payload.product_id, payload.rating)

    # Re-fetch so the response includes fields written by the repo (status, created_at, likes, dislikes)
    saved = review_repository.get_review_by_id(review_id)
    return ReviewResponse(**saved)


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

    # Atomically increment rating_count and rating_sum on the product document.
    # avg_rating = rating_sum / rating_count — no extra reviews query needed.
    update_product_rating_counters(review["product_id"], review["rating"])

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

    likes = review.get("likes", 0)
    dislikes = review.get("dislikes", 0)

    if current_vote == vote_type:
        # Toggle off — un-vote
        likes_delta, dislikes_delta = review_repository.remove_vote(review_id, user_id, vote_type)
        new_user_vote = None
    else:
        # New vote or switch vote
        likes_delta, dislikes_delta = review_repository.set_vote(review_id, user_id, review["product_id"], vote_type)
        new_user_vote = vote_type

    return VoteResponse(
        likes=likes + likes_delta,
        dislikes=dislikes + dislikes_delta,
        user_vote=new_user_vote,
    )


def fetch_all_reviews(
    status: str | None,
    limit: int,
    start_after: str | None,
) -> list[ReviewResponse]:
    reviews = review_repository.get_all_reviews(
        status=status, limit=limit, start_after=start_after
    )
    # Batch-fetch product names in one Firestore call instead of looping
    unique_ids = list({r["product_id"] for r in reviews})
    product_names = get_product_names_by_ids(unique_ids)
    return [ReviewResponse(**r, product_name=product_names.get(r["product_id"])) for r in reviews]


def get_my_votes(user_id: str, product_id: str) -> dict[str, str]:
    return review_repository.get_user_votes_for_product(user_id, product_id)


