from fastapi import HTTPException, status

from app.models.invoice import InvoiceCreate, InvoiceResponse
from app.repositories import invoice_repository
from app.repositories.product_repository import increment_purchase_count


def create_invoice(payload: InvoiceCreate) -> InvoiceResponse:
    data = payload.model_dump()
    invoice_id = invoice_repository.create_invoice(data)
    invoice = invoice_repository.get_invoice_by_id(invoice_id)

    # Increment purchase_count for every item in the order
    for item in payload.items:
        increment_purchase_count(item.product_id, item.quantity)

    return InvoiceResponse(**invoice)


def fetch_invoices() -> list[InvoiceResponse]:
    invoices = invoice_repository.list_invoices()
    return [InvoiceResponse(**inv) for inv in invoices]


def fetch_invoice(invoice_id: str) -> InvoiceResponse:
    invoice = invoice_repository.get_invoice_by_id(invoice_id)
    if not invoice:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return InvoiceResponse(**invoice)
