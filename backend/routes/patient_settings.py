# INTEGRATION: Auto-discovered by server.py from routes/ directory
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import os, uuid
from config import db, get_current_user, require_role, new_id, now_iso, hash_password, verify_password, strip_user

router = APIRouter(prefix="/api")

UPLOAD_DIR = os.path.join("/tmp", "nirogpath_avatars")
try:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
except Exception:
    UPLOAD_DIR = "/tmp"

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp"}
MAX_AVATAR_BYTES = 1 * 1024 * 1024  # 1 MB


# ---------- Models ----------

class ProfileUpdateIn(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    dob: Optional[str] = None
    gender: Optional[str] = None
    avatar_url: Optional[str] = None
    preferred_language: Optional[str] = None


class ChangePasswordIn(BaseModel):
    current_password: str
    new_password: str  # min 6 chars enforced manually


# ---------- PATCH /api/auth/me ----------

@router.patch("/auth/me")
async def update_profile(
    body: ProfileUpdateIn,
    user: dict = Depends(require_role("patient", "doctor", "reception")),
):
    """Update profile fields for any authenticated user."""
    updates = {}
    for field in ("name", "phone", "dob", "gender", "avatar_url", "preferred_language"):
        value = getattr(body, field)
        if value is not None:
            updates[field] = value

    if not updates:
        # Nothing to update — just return current user
        current = await db.users.find_one({"id": user["id"]}, {"_id": 0})
        return {"user": strip_user(current)}

    await db.users.update_one({"id": user["id"]}, {"$set": updates})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return {"user": strip_user(updated)}


# ---------- POST /api/auth/change-password ----------

@router.post("/auth/change-password")
async def change_password(
    body: ChangePasswordIn,
    user: dict = Depends(require_role("patient")),
):
    """Change password for patient. Verifies current password before updating."""
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")

    # Re-fetch with password_hash (get_current_user strips it)
    full_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if not full_user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(body.current_password, full_user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    new_hash = hash_password(body.new_password)
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": new_hash}})
    return {"ok": True}


# ---------- POST /api/auth/delete-account ----------

@router.post("/auth/delete-account")
async def delete_account(
    user: dict = Depends(require_role("patient")),
):
    """Soft-delete patient account. Anonymises PII, keeps booking records intact."""
    user_id = user["id"]
    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "deleted_at": now_iso(),
                "name": "Deleted User",
                "email": f"deleted_{user_id}@nirog.deleted",
                "phone": "",
                "avatar_url": "",
            }
        },
    )
    return {"ok": True}


# ---------- GET /api/wallet/transactions ----------

@router.get("/wallet/transactions")
async def wallet_transactions(
    user: dict = Depends(require_role("patient")),
):
    """Return wallet transaction history derived from booking records."""
    bookings = (
        await db.bookings.find({"patient_id": user["id"]}, {"_id": 0})
        .sort("created_at", -1)
        .to_list(200)
    )

    transactions = []
    for b in bookings:
        transactions.append({
            "id": b["id"],
            "date": b["created_at"],
            "description": f"Deposit – {b['doctor_name']} ({b['slot_time']})",
            "amount": -b.get("deposit_paid", 0),
            "type": "debit",
            "status": b["status"],
        })
        if b["status"] == "cancelled":
            transactions.append({
                "id": f"refund-{b['id']}",
                "date": b.get("updated_at", b["created_at"]),
                "description": f"Refund – {b['doctor_name']}",
                "amount": b.get("deposit_paid", 0),
                "type": "credit",
                "status": "refunded",
            })

    sorted_transactions = sorted(transactions, key=lambda x: x["date"], reverse=True)
    return {"transactions": sorted_transactions}


# ---------- POST /api/uploads/avatar ----------

@router.post("/uploads/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    user: dict = Depends(require_role("patient")),
):
    """Upload a patient avatar image. Max 1 MB, jpg/png/webp only."""
    # Validate content type
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPEG, PNG, and WebP images are allowed",
        )

    # Determine extension from content type or filename
    ext = None
    if file.filename:
        parts = file.filename.rsplit(".", 1)
        if len(parts) == 2 and parts[1].lower() in ALLOWED_EXTENSIONS:
            ext = parts[1].lower()
    if ext is None:
        # Fallback from content type
        ext_map = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
        ext = ext_map.get(file.content_type, "jpg")

    # Read and validate size
    contents = await file.read()
    if len(contents) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=400, detail="File size must be under 1 MB")

    # Save to disk
    filename = f"{uuid.uuid4()}.{ext}"
    dest = os.path.join(UPLOAD_DIR, filename)
    with open(dest, "wb") as f:
        f.write(contents)

    url = f"/api/uploads/avatars/{filename}"
    return {"url": url}


# ---------- GET /api/uploads/avatars/{filename} ----------

@router.get("/uploads/avatars/{filename}")
async def get_avatar(filename: str):
    """Serve uploaded avatar files."""
    # Basic path traversal guard
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(path)
