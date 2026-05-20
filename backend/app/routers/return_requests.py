from fastapi import APIRouter, Depends

from app.dependencies import get_current_user, require_role
from app.models.return_request import ReturnRequestResponse
from app.services import return_request_service

router = APIRouter(prefix="/return-requests", tags=["return-requests"])


@router.get("/my", response_model=list[ReturnRequestResponse])
async def my_return_requests(current_user: dict = Depends(get_current_user)):
    return return_request_service.list_my_returns(current_user["user_id"])


@router.get("", response_model=list[ReturnRequestResponse])
async def list_return_requests(_: dict = Depends(require_role("sales_manager"))):
    return return_request_service.list_all_returns()


@router.patch("/{return_id}/approve", response_model=ReturnRequestResponse)
async def approve_return(return_id: str, _: dict = Depends(require_role("sales_manager"))):
    return return_request_service.approve_return(return_id)


@router.patch("/{return_id}/reject", response_model=ReturnRequestResponse)
async def reject_return(return_id: str, _: dict = Depends(require_role("sales_manager"))):
    return return_request_service.reject_return(return_id)
