"""PDF invoice generation using reportlab."""

import os
from io import BytesIO
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.invoice import InvoiceResponse

# Candidate Unicode TTF fonts (regular + bold pairs), tried in order
_cached_fonts: tuple[str, str] | None = None

_FONT_CANDIDATES = [
    # Linux – DejaVu (most common)
    ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
     "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    ("/usr/share/fonts/dejavu/DejaVuSans.ttf",
     "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"),
    # macOS – Arial Unicode
    ("/Library/Fonts/Arial Unicode.ttf",
     "/Library/Fonts/Arial Bold.ttf"),
    ("/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
     "/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
    # macOS – Arial Unicode MS (older name)
    ("/Library/Fonts/Arial Unicode MS.ttf",
     "/Library/Fonts/Arial Unicode MS.ttf"),
    # macOS – Arial
    ("/Library/Fonts/Arial.ttf", "/Library/Fonts/Arial Bold.ttf"),
    ("/System/Library/Fonts/Supplemental/Arial.ttf",
     "/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
    # Windows
    ("C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/arialbd.ttf"),
]


def _register_fonts() -> tuple[str, str]:
    """Register a Unicode TTF font pair once and return (regular, bold) names."""
    global _cached_fonts
    if _cached_fonts is not None:
        return _cached_fonts

    try:
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
    except ImportError:
        _cached_fonts = ("Helvetica", "Helvetica-Bold")
        return _cached_fonts

    for regular_path, bold_path in _FONT_CANDIDATES:
        if not os.path.exists(regular_path):
            continue
        try:
            pdfmetrics.registerFont(TTFont("PDF_Regular", regular_path))
            bold_path = bold_path if os.path.exists(bold_path) else regular_path
            pdfmetrics.registerFont(TTFont("PDF_Bold", bold_path))
            _cached_fonts = ("PDF_Regular", "PDF_Bold")
            return _cached_fonts
        except Exception:
            continue

    _cached_fonts = ("Helvetica", "Helvetica-Bold")
    return _cached_fonts


def generate_invoice_pdf(invoice: "InvoiceResponse") -> bytes:
    """Generate a PDF invoice and return raw bytes."""
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
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

    font_regular, font_bold = _register_fonts()

    base = getSampleStyleSheet()

    def style(name: str, parent: str = "Normal", **kwargs) -> ParagraphStyle:
        kwargs.setdefault("fontName", font_regular)
        return ParagraphStyle(name, parent=base[parent], **kwargs)

    s_title   = style("s_title",   "Title",   fontName=font_bold,  fontSize=16)
    s_normal  = style("s_normal",  "Normal",  fontSize=10)
    s_bold    = style("s_bold",    "Normal",  fontName=font_bold,  fontSize=10)
    s_heading = style("s_heading", "Normal",  fontName=font_bold,  fontSize=11, spaceAfter=4)
    s_italic  = style("s_italic",  "Normal",  fontSize=9)

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )
    story = []

    # ── Header ────────────────────────────────────────────────────────────────
    story.append(Paragraph("LUMEN — Online Tech Store", s_title))
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph(f"Invoice #  {invoice.id}", s_normal))
    story.append(Paragraph(f"Date:  {invoice.created_at[:10]}", s_normal))
    story.append(Spacer(1, 0.6 * cm))

    # ── Customer info ─────────────────────────────────────────────────────────
    story.append(Paragraph("Bill To:", s_heading))
    story.append(Paragraph(invoice.customer_name, s_normal))
    story.append(Paragraph(invoice.customer_email, s_normal))
    if invoice.customer_tax_id:
        story.append(Paragraph(f"Tax ID:  {invoice.customer_tax_id}", s_normal))
    story.append(Paragraph(invoice.delivery_address, s_normal))
    story.append(Spacer(1, 0.6 * cm))

    # ── Items table ───────────────────────────────────────────────────────────
    table_data = [[
        Paragraph("Product", ParagraphStyle("th", fontName=font_bold, fontSize=10, textColor=colors.white)),
        Paragraph("Qty",     ParagraphStyle("th2", fontName=font_bold, fontSize=10, textColor=colors.white)),
        Paragraph("Unit Price", ParagraphStyle("th3", fontName=font_bold, fontSize=10, textColor=colors.white)),
        Paragraph("Subtotal",   ParagraphStyle("th4", fontName=font_bold, fontSize=10, textColor=colors.white)),
    ]]
    for item in invoice.items:
        table_data.append([
            Paragraph(item.product_name, s_normal),
            str(item.quantity),
            f"${item.unit_price:.2f}",
            f"${item.subtotal:.2f}",
        ])

    item_table = Table(
        table_data,
        colWidths=[9 * cm, 2 * cm, 3.5 * cm, 3.5 * cm],
    )
    item_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
        ("FONTNAME",      (0, 0), (-1, 0), font_bold),
        ("FONTNAME",      (0, 1), (-1, -1), font_regular),
        ("FONTSIZE",      (0, 0), (-1, -1), 10),
        ("ALIGN",         (1, 0), (-1, -1), "RIGHT"),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
        ("GRID",          (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
        ("TOPPADDING",    (0, 0), (-1, 0), 8),
    ]))
    story.append(item_table)
    story.append(Spacer(1, 0.6 * cm))

    # ── Totals ────────────────────────────────────────────────────────────────
    totals_data = [
        [Paragraph("Subtotal", s_normal), f"${invoice.subtotal:.2f}"],
        [Paragraph("Tax (8%)", s_normal), f"${invoice.tax:.2f}"],
        [Paragraph("Shipping", s_normal),
         f"${invoice.shipping:.2f}" if invoice.shipping > 0 else "FREE"],
        ["", ""],
        [Paragraph("TOTAL", s_bold), Paragraph(f"${invoice.total_amount:.2f}", s_bold)],
    ]
    totals_table = Table(totals_data, colWidths=[14 * cm, 4 * cm])
    totals_table.setStyle(TableStyle([
        ("ALIGN",      (1, 0), (1, -1), "RIGHT"),
        ("FONTNAME",   (0, -1), (-1, -1), font_bold),
        ("FONTSIZE",   (0, -1), (-1, -1), 12),
        ("LINEABOVE",  (0, -1), (-1, -1), 1, colors.black),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 1 * cm))

    # ── Footer ────────────────────────────────────────────────────────────────
    story.append(Paragraph(
        "Thank you for shopping at LUMEN. For support, contact support@lumen-store.com",
        s_italic,
    ))

    doc.build(story)
    return buffer.getvalue()
