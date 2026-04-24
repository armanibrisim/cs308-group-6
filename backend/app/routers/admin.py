from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.dependencies import require_role
from app.repositories.user_repository import get_all_users, update_user_role

router = APIRouter(prefix="/admin", tags=["admin"])

VALID_ROLES = {"customer", "sales_manager", "product_manager", "admin"}


class RoleUpdateRequest(BaseModel):
    role: str


@router.get("/users")
async def list_users(current_user: dict = Depends(require_role("admin"))):
    return get_all_users()


@router.patch("/users/{user_id}/role")
async def change_user_role(
    user_id: str,
    body: RoleUpdateRequest,
    current_user: dict = Depends(require_role("admin")),
):
    if body.role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {', '.join(VALID_ROLES)}",
        )
    if user_id == current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own role.",
        )
    found = update_user_role(user_id, body.role)
    if not found:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return {"user_id": user_id, "role": body.role}
