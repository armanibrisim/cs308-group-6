from fastapi import APIRouter, Depends, status

from app.dependencies import get_current_user, require_role
from app.models.invoice import InvoiceCreate, InvoiceResponse
from app.services.invoice_service import create_invoice, fetch_invoice, fetch_invoices

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get("", response_model=list[InvoiceResponse])
async def list_invoices(
    current_user: dict = Depends(require_role("product_manager", "sales_manager")),
):
    return fetch_invoices()


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: str,
    current_user: dict = Depends(require_role("product_manager", "sales_manager")),
):
    return fetch_invoice(invoice_id)


# Called internally during checkout — any authenticated user can trigger invoice creation
@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def add_invoice(
    body: InvoiceCreate,
    current_user: dict = Depends(get_current_user),
):
    return create_invoice(body)
