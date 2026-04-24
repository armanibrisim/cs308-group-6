from datetime import datetime, timezone
from typing import Optional

from google.cloud.firestore_v1 import FieldFilter

from app.firebase.client import get_firebase_app
import firebase_admin.firestore as firestore_module

REVIEWS_COLLECTION = "reviews"
REVIEW_VOTES_COLLECTION = "review_votes"


def _db():
    get_firebase_app()
    return firestore_module.client()


def create_review(data: dict) -> str:
    db = _db()
    now = datetime.now(timezone.utc).isoformat()
    data["created_at"] = now
    data["status"] = "pending"
    data["likes"] = 0
    data["dislikes"] = 0

    ref = db.collection(REVIEWS_COLLECTION).document()
    data["id"] = ref.id
    ref.set(data)
    return ref.id


def get_reviews_by_product(product_id: str, approved_only: bool = True) -> list[dict]:
    db = _db()
    query = db.collection(REVIEWS_COLLECTION).where(
        filter=FieldFilter("product_id", "==", product_id)
    )
    if approved_only:
        query = query.where(filter=FieldFilter("status", "==", "approved"))
    docs = query.stream()
    return [d.to_dict() for d in docs]


def get_pending_reviews() -> list[dict]:
    db = _db()
    docs = (
        db.collection(REVIEWS_COLLECTION)
        .where(filter=FieldFilter("status", "==", "pending"))
        .stream()
    )
    return [d.to_dict() for d in docs]


def get_review_by_id(review_id: str) -> Optional[dict]:
    db = _db()
    doc = db.collection(REVIEWS_COLLECTION).document(review_id).get()
    if not doc.exists:
        return None
    return doc.to_dict()


def get_review_by_user_and_product(user_id: str, product_id: str) -> Optional[dict]:
    db = _db()
    docs = (
        db.collection(REVIEWS_COLLECTION)
        .where(filter=FieldFilter("user_id", "==", user_id))
        .where(filter=FieldFilter("product_id", "==", product_id))
        .limit(1)
        .stream()
    )
    results = list(docs)
    return results[0].to_dict() if results else None


def update_review_status(review_id: str, new_status: str) -> None:
    db = _db()
    db.collection(REVIEWS_COLLECTION).document(review_id).update({"status": new_status})


def update_review(review_id: str, updates: dict) -> None:
    db = _db()
    db.collection(REVIEWS_COLLECTION).document(review_id).update(updates)


def delete_review(review_id: str) -> None:
    db = _db()
    db.collection(REVIEWS_COLLECTION).document(review_id).delete()


def get_user_vote(review_id: str, user_id: str) -> str | None:
    """Return 'like', 'dislike', or None for this user's vote on this review."""
    db = _db()
    doc = db.collection(REVIEW_VOTES_COLLECTION).document(f"{review_id}_{user_id}").get()
    if not doc.exists:
        return None
    return doc.to_dict().get("vote_type")


def get_user_votes_for_product(user_id: str, product_id: str) -> dict[str, str]:
    """Return {review_id: vote_type} for all of this user's votes on a product's reviews."""
    db = _db()
    docs = (
        db.collection(REVIEW_VOTES_COLLECTION)
        .where(filter=FieldFilter("user_id", "==", user_id))
        .where(filter=FieldFilter("product_id", "==", product_id))
        .stream()
    )
    return {d.to_dict()["review_id"]: d.to_dict()["vote_type"] for d in docs}


def set_vote(review_id: str, user_id: str, product_id: str, vote_type: str) -> tuple[int, int]:
    """Create or overwrite a vote and atomically update the review counts.
    Returns (likes_delta, dislikes_delta) so callers avoid a re-fetch."""
    db = _db()
    vote_ref = db.collection(REVIEW_VOTES_COLLECTION).document(f"{review_id}_{user_id}")
    review_ref = db.collection(REVIEWS_COLLECTION).document(review_id)

    existing = vote_ref.get()
    old_type = existing.to_dict().get("vote_type") if existing.exists else None

    likes_delta = 0
    dislikes_delta = 0

    count_update: dict = {}
    if old_type and old_type != vote_type:
        # Switching vote: decrement old, increment new
        count_update[old_type + "s"] = firestore_module.Increment(-1)
        count_update[vote_type + "s"] = firestore_module.Increment(1)
        if vote_type == "like":
            likes_delta, dislikes_delta = 1, -1
        else:
            likes_delta, dislikes_delta = -1, 1
    elif not old_type:
        # New vote
        count_update[vote_type + "s"] = firestore_module.Increment(1)
        if vote_type == "like":
            likes_delta = 1
        else:
            dislikes_delta = 1

    vote_ref.set({"review_id": review_id, "user_id": user_id, "product_id": product_id, "vote_type": vote_type})
    if count_update:
        review_ref.update(count_update)

    return likes_delta, dislikes_delta


def remove_vote(review_id: str, user_id: str, vote_type: str) -> tuple[int, int]:
    """Delete a vote and decrement the corresponding count on the review.
    Returns (likes_delta, dislikes_delta) so callers avoid a re-fetch."""
    db = _db()
    db.collection(REVIEW_VOTES_COLLECTION).document(f"{review_id}_{user_id}").delete()
    db.collection(REVIEWS_COLLECTION).document(review_id).update(
        {vote_type + "s": firestore_module.Increment(-1)}
    )
    return (-1, 0) if vote_type == "like" else (0, -1)


def get_all_reviews(
    status: str | None = None,
    limit: int = 50,
    start_after: str | None = None,
) -> list[dict]:
    """Fetch all reviews with optional status filter, ordered by created_at desc, paginated."""
    db = _db()

    if status:
        # Simple single-field query — uses the auto-index on `status`, no composite index needed.
        # Sort in Python to avoid requiring a composite index while it may still be building.
        docs = (
            db.collection(REVIEWS_COLLECTION)
            .where(filter=FieldFilter("status", "==", status))
            .limit(limit)
            .stream()
        )
        results = [d.to_dict() for d in docs]
        results.sort(key=lambda r: r.get("created_at", ""), reverse=True)
        return results

    # No status filter — plain order_by is fine with the auto-index on created_at.
    query = db.collection(REVIEWS_COLLECTION).order_by("created_at", direction="DESCENDING")
    if start_after:
        query = query.start_after({"created_at": start_after})
    query = query.limit(limit)
    return [d.to_dict() for d in query.stream()]


def get_counted_ratings_for_product(product_id: str) -> list[int]:
    """Return ratings for all counted reviews (approved + rejected) of a product.

    Used for recalculating rating_sum / rating_count from scratch if needed.
    Pending reviews are excluded — they haven't been decided yet.
    """
    db = _db()
    docs = (
        db.collection(REVIEWS_COLLECTION)
        .where(filter=FieldFilter("product_id", "==", product_id))
        .stream()
    )
    return [
        d.to_dict().get("rating", 0)
        for d in docs
        if d.to_dict().get("status") in ("approved", "rejected")
    ]
