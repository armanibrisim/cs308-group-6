"""PDF invoice generation using reportlab."""

from io import BytesIO
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.invoice import InvoiceResponse


def generate_invoice_pdf(invoice: "InvoiceResponse") -> bytes:
    """Generate a PDF invoice and return raw bytes."""
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.lib.units import cm
        from reportlab.platypus import (
            Paragraph,
            SimpleDocTemplate,
            Spacer,
            Table,
            TableStyle,
        )
    except ImportError as exc:
        raise RuntimeError(
            "reportlab is required for PDF generation. "
            "Install it with: pip install reportlab"
        ) from exc

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )
    styles = getSampleStyleSheet()
    story = []

    # ── Header ────────────────────────────────────────────────────────────────
    story.append(Paragraph("<b>LUMEN</b> — Online Tech Store", styles["Title"]))
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph(f"<b>Invoice #</b> {invoice.id}", styles["Normal"]))
    story.append(Paragraph(f"<b>Date:</b> {invoice.created_at[:10]}", styles["Normal"]))
    story.append(Spacer(1, 0.6 * cm))

    # ── Customer info ─────────────────────────────────────────────────────────
    story.append(Paragraph("<b>Bill To:</b>", styles["Heading3"]))
    story.append(Paragraph(invoice.customer_name, styles["Normal"]))
    story.append(Paragraph(invoice.customer_email, styles["Normal"]))
    story.append(Paragraph(invoice.delivery_address, styles["Normal"]))
    story.append(Spacer(1, 0.6 * cm))

    # ── Items table ───────────────────────────────────────────────────────────
    table_data = [["Product", "Qty", "Unit Price", "Subtotal"]]
    for item in invoice.items:
        table_data.append([
            item.product_name,
            str(item.quantity),
            f"${item.unit_price:.2f}",
            f"${item.subtotal:.2f}",
        ])

    item_table = Table(
        table_data,
        colWidths=[9 * cm, 2 * cm, 3.5 * cm, 3.5 * cm],
    )
    item_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING", (0, 0), (-1, 0), 8),
    ]))
    story.append(item_table)
    story.append(Spacer(1, 0.6 * cm))

    # ── Totals ────────────────────────────────────────────────────────────────
    totals_data = [
        ["Subtotal", f"${invoice.subtotal:.2f}"],
        ["Tax (8%)", f"${invoice.tax:.2f}"],
        ["Shipping", f"${invoice.shipping:.2f}" if invoice.shipping > 0 else "FREE"],
        ["", ""],
        ["TOTAL", f"${invoice.total_amount:.2f}"],
    ]
    totals_table = Table(totals_data, colWidths=[14 * cm, 4 * cm])
    totals_table.setStyle(TableStyle([
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, -1), (-1, -1), 12),
        ("LINEABOVE", (0, -1), (-1, -1), 1, colors.black),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 1 * cm))

    # ── Footer ────────────────────────────────────────────────────────────────
    story.append(Paragraph(
        "Thank you for shopping at LUMEN. For support, contact support@lumen-store.com",
        styles["Italic"],
    ))

    doc.build(story)
    return buffer.getvalue()
