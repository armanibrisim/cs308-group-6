from fastapi import APIRouter, Depends, status
from fastapi.responses import Response

from app.dependencies import get_current_user, require_role
from app.models.invoice import InvoiceCreate, InvoiceResponse
from app.services.invoice_service import create_invoice, fetch_invoice, fetch_invoices
from app.utils.pdf import generate_invoice_pdf

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


@router.get("/{invoice_id}/pdf")
async def download_invoice_pdf(
    invoice_id: str,
    current_user: dict = Depends(require_role("product_manager", "sales_manager")),
):
    invoice = fetch_invoice(invoice_id)
    pdf_bytes = generate_invoice_pdf(invoice)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=invoice_{invoice_id}.pdf"},
    )


# Called internally during checkout — any authenticated user can trigger invoice creation
@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def add_invoice(
    body: InvoiceCreate,
    current_user: dict = Depends(get_current_user),
):
    return create_invoice(body)
