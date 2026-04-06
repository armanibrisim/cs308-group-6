from typing import Optional
from pydantic import BaseModel, Field


class ReviewCreate(BaseModel):
    product_id: str
    rating: int = Field(ge=1, le=5)
    comment: str = Field(min_length=1, max_length=600)


class ReviewResponse(BaseModel):
    id: str
    product_id: str
    product_name: Optional[str] = None
    user_id: str
    username: str
    rating: int
    comment: str
    status: str  # "pending" | "approved" | "rejected"
    created_at: str
    likes: int = 0
    dislikes: int = 0


class ReviewStatusUpdate(BaseModel):
    status: str = Field(pattern="^(approved|rejected)$")


class VoteCreate(BaseModel):
    vote_type: str = Field(pattern="^(like|dislike)$")


class VoteResponse(BaseModel):
    likes: int
    dislikes: int
    user_vote: Optional[str]  # "like" | "dislike" | None


class ProductRatingSummary(BaseModel):
    rating_count: int = 0        # number of approved ratings
    rating_sum: int = 0          # sum of all approved ratings
    avg_rating: Optional[float] = None  # rating_sum / rating_count
