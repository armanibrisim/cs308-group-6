import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status

from app.dependencies import require_role

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "static" / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB

router = APIRouter(prefix="/upload", tags=["upload"])


@router.post("/image", status_code=status.HTTP_201_CREATED)
async def upload_image(
    request: Request,
    file: UploadFile,
    _: dict = Depends(require_role("product_manager", "admin")),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type '{file.content_type}'. Allowed: JPEG, PNG, WebP, GIF.",
        )

    data = await file.read()
    if len(data) > MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds 10 MB limit.",
        )

    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    (UPLOAD_DIR / filename).write_bytes(data)

    base = str(request.base_url).rstrip("/")
    return {"url": f"{base}/static/uploads/{filename}"}
