from pydantic import BaseModel


class WishlistResponse(BaseModel):
    product_ids: list[str]
