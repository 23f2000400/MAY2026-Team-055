# INTEGRATION: Auto-discovered by server.py from routes/ directory
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone, timedelta
import os, shutil, uuid
from config import db, get_current_user, require_role, new_id, now_iso

router = APIRouter(prefix="/api")
ATTACH_DIR = os.path.join("/tmp", "nirogpath_rx")
try:
    os.makedirs(ATTACH_DIR, exist_ok=True)
except Exception:
    ATTACH_DIR = "/tmp"


# ---------- Helper ----------

async def is_thread_closed(prescription_id: str) -> bool:
    """Thread auto-closes 7 days after prescription end."""
    p = await db.prescriptions.find_one({"id": prescription_id}, {"_id": 0})
    if not p:
        return True
    try:
        created = datetime.fromisoformat(p["created_at"])
    except Exception:
        return True
    max_days = max((m.get("duration_days", 0) for m in p.get("medications", [])), default=0)
    end_date = created + timedelta(days=max_days)
    close_date = end_date + timedelta(days=7)
    return datetime.now(timezone.utc) > close_date


async def _mark_read(prescription_id: str, user: dict):
    """Mark all unread messages in thread as read by the calling user's role."""
    role = user.get("role")
    if role == "patient":
        await db.rx_messages.update_many(
            {"prescription_id": prescription_id, "read_by_patient": False},
            {"$set": {"read_by_patient": True}},
        )
    elif role == "doctor":
        await db.rx_messages.update_many(
            {"prescription_id": prescription_id, "read_by_doctor": False},
            {"$set": {"read_by_doctor": True}},
        )


async def _check_access(prescription_id: str, user: dict):
    """Raise 403/404 if user cannot access this prescription thread."""
    p = await db.prescriptions.find_one({"id": prescription_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Prescription not found")
    role = user.get("role")
    if role == "patient" and p.get("patient_id") != user["id"]:
        raise HTTPException(403, "Forbidden")
    if role == "doctor" and p.get("doctor_id") != user["id"]:
        raise HTTPException(403, "Forbidden")
    if role not in ("patient", "doctor"):
        raise HTTPException(403, "Forbidden")
    return p


# ---------- Models ----------

class MessageIn(BaseModel):
    body: str = Field(default="", max_length=500)
    attachment_url: Optional[str] = None


# ---------- Routes ----------

@router.get("/prescriptions/{id}/messages")
async def get_messages(id: str, user: dict = Depends(get_current_user)):
    await _check_access(id, user)

    msgs = await db.rx_messages.find(
        {"prescription_id": id}, {"_id": 0}
    ).sort("created_at", 1).to_list(500)

    # Mark as read for the caller
    await _mark_read(id, user)

    closed = await is_thread_closed(id)
    return {"messages": msgs, "closed": closed}


@router.post("/prescriptions/{id}/messages")
async def post_message(id: str, body: MessageIn, user: dict = Depends(get_current_user)):
    p = await _check_access(id, user)

    if await is_thread_closed(id):
        raise HTTPException(400, "Conversation is closed — prescription period has ended")

    if not body.body.strip() and not body.attachment_url:
        raise HTTPException(400, "Message body or attachment required")

    role = user.get("role")
    patient_id = p.get("patient_id", "")
    doctor_id = p.get("doctor_id", "")

    msg = {
        "id": new_id(),
        "prescription_id": id,
        "patient_id": patient_id,
        "doctor_id": doctor_id,
        "sender_role": role,
        "body": body.body.strip(),
        "attachment_url": body.attachment_url or None,
        "created_at": now_iso(),
        # Doctor sending → patient hasn't read it yet (read_by_patient=False)
        # Patient sending → doctor hasn't read it yet (read_by_doctor=False)
        "read_by_patient": role == "doctor",   # True when doctor sends (patient still needs to read)
        "read_by_doctor": role == "patient",   # True when patient sends (doctor still needs to read)
    }
    await db.rx_messages.insert_one(msg)
    return {"message": {k: v for k, v in msg.items() if k != "_id"}}


@router.post("/prescriptions/{id}/messages/mark-read")
async def mark_read(id: str, user: dict = Depends(get_current_user)):
    await _check_access(id, user)
    await _mark_read(id, user)
    return {"ok": True}


@router.get("/doctor/questions/unread")
async def doctor_unread_questions(user: dict = Depends(require_role("doctor"))):
    """Return prescriptions written by this doctor that have unread patient messages."""
    # Find message prescription_ids with unread messages for doctor
    pipeline = [
        {"$match": {"doctor_id": user["id"], "read_by_doctor": False}},
        {"$group": {
            "_id": "$prescription_id",
            "unread_count": {"$sum": 1},
        }},
    ]
    unread_groups = await db.rx_messages.aggregate(pipeline).to_list(200)
    if not unread_groups:
        return {"prescriptions": [], "total_unread": 0}

    presc_ids = [g["_id"] for g in unread_groups]
    unread_map = {g["_id"]: g["unread_count"] for g in unread_groups}

    prescriptions_raw = await db.prescriptions.find(
        {"id": {"$in": presc_ids}}, {"_id": 0}
    ).to_list(200)

    total_unread = sum(unread_map.values())

    # Enrich with unread_count and patient_name
    result = []
    for p in prescriptions_raw:
        entry = {**p, "unread_count": unread_map.get(p["id"], 0)}
        result.append(entry)

    # Sort by unread_count desc
    result.sort(key=lambda x: x["unread_count"], reverse=True)

    return {"prescriptions": result, "total_unread": total_unread}


@router.post("/uploads/rx-attachment")
async def upload_rx_attachment(
    file: UploadFile = File(...),
    user: dict = Depends(require_role("patient")),
):
    """Upload a prescription attachment (jpg/png, max 3 MB)."""
    if file.content_type not in ("image/jpeg", "image/png"):
        raise HTTPException(400, "Only JPEG and PNG images are allowed")

    contents = await file.read()
    if len(contents) > 3 * 1024 * 1024:
        raise HTTPException(400, "File must be under 3 MB")

    ext = "jpg" if file.content_type == "image/jpeg" else "png"
    filename = f"{uuid.uuid4()}.{ext}"
    dest = os.path.join(ATTACH_DIR, filename)

    with open(dest, "wb") as f:
        f.write(contents)

    return {"url": f"/api/uploads/rx/{filename}"}


@router.get("/uploads/rx/{filename}")
async def get_rx_attachment(filename: str, user: dict = Depends(get_current_user)):
    path = os.path.join(ATTACH_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(404, "Not found")
    return FileResponse(path)
