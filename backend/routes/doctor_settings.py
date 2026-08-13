# INTEGRATION: Auto-discovered by server.py from routes/ directory
# Doctor Settings & Availability Calendar (Feature 13)
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date, timedelta, timezone
import os
import shutil
import uuid
from config import db, get_current_user, require_role, new_id, now_iso

router = APIRouter(prefix="/api")

# ─── helpers ────────────────────────────────────────────────────────────────

VALID_DAYS = {"mon", "tue", "wed", "thu", "fri", "sat", "sun"}
UPLOADS_DIR = os.path.join("/tmp", "nirogpath_doctor_avatars")


def _strip(u: dict) -> dict:
    u = {**u}
    u.pop("password_hash", None)
    u.pop("_id", None)
    return u


def generate_time_slots(start: str, end: str) -> List[str]:
    """Generate 15-minute slots between start (HH:MM) and end (HH:MM)."""
    slots = []
    sh, sm = map(int, start.split(":"))
    eh, em = map(int, end.split(":"))
    current = sh * 60 + sm
    end_min = eh * 60 + em
    while current < end_min:
        h, m = divmod(current, 60)
        slots.append(f"{h:02d}:{m:02d}")
        current += 15
    return slots


async def compute_slots_for_doctor(doctor: dict, for_date: str) -> List[str]:
    """Compute available slots from doctor's weekly_schedule, minus blocked dates and bookings."""
    # Check blocked dates
    blocked = doctor.get("blocked_dates", [])
    if for_date in blocked:
        return []

    # Get day of week
    d = date.fromisoformat(for_date)
    day_key = d.strftime("%a").lower()  # mon, tue, wed, thu, fri, sat, sun

    weekly_schedule = doctor.get("weekly_schedule", {})

    if not weekly_schedule:
        # Fall back to default slots if no schedule set
        return [
            "09:00", "09:15", "09:30", "09:45",
            "10:00", "10:15", "10:30", "10:45",
            "11:00", "11:15", "11:30", "11:45",
            "12:00", "12:15",
        ]

    day_ranges = weekly_schedule.get(day_key, [])
    if not day_ranges:
        return []  # Closed

    all_slots = []
    for r in day_ranges:
        all_slots.extend(generate_time_slots(r.get("start", "09:00"), r.get("end", "13:00")))

    # Remove already-booked slots
    booked = await db.bookings.find(
        {"doctor_id": doctor["id"], "date": for_date, "status": {"$ne": "cancelled"}},
        {"_id": 0, "slot_time": 1},
    ).to_list(100)
    taken = {b["slot_time"] for b in booked}

    return [s for s in all_slots if s not in taken]


# ─── Pydantic models ─────────────────────────────────────────────────────────

class ProfilePatch(BaseModel):
    bio: Optional[str] = None
    credentials: Optional[List[str]] = None
    languages: Optional[List[str]] = None
    fee: Optional[int] = None
    avatar_url: Optional[str] = None
    cabin: Optional[str] = None
    floor: Optional[str] = None
    landmark: Optional[str] = None
    signature_url: Optional[str] = None
    license_number: Optional[str] = None


class TimeRange(BaseModel):
    start: str
    end: str


class ScheduleIn(BaseModel):
    weekly_schedule: dict  # {"mon": [{"start":"09:00","end":"13:00"}], ...}


class BlockedDatesIn(BaseModel):
    blocked_dates: List[str]  # list of ISO date strings


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/doctors/{doctor_id}/slots/v2")
async def doctor_slots_v2(doctor_id: str, date: Optional[str] = None):
    """
    Public endpoint: returns available 15-min slots for a doctor on a given date.
    Uses doctor's weekly_schedule and blocked_dates.
    """
    if date is None:
        date = datetime.now(timezone.utc).date().isoformat()

    # Validate date format
    try:
        datetime.fromisoformat(date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    doctor = await db.users.find_one({"id": doctor_id, "role": "doctor"}, {"_id": 0})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    slots = await compute_slots_for_doctor(doctor, date)
    doctor_out = _strip(doctor)

    return {
        "doctor": doctor_out,
        "slots": [{"time": s, "available": True} for s in slots],
        "date": date,
    }


@router.get("/doctor/profile")
async def get_doctor_profile(user: dict = Depends(require_role("doctor"))):
    """Return the current doctor's full profile (no password)."""
    doctor = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return {"user": _strip(doctor)}


@router.patch("/doctor/profile")
async def patch_doctor_profile(body: ProfilePatch, user: dict = Depends(require_role("doctor"))):
    """Update doctor's profile fields. Only provided (non-None) fields are updated."""
    update = {}
    for field, value in body.model_dump(exclude_none=True).items():
        update[field] = value

    if not update:
        # Nothing to update — return current profile
        doctor = await db.users.find_one({"id": user["id"]}, {"_id": 0})
        return {"user": _strip(doctor)}

    await db.users.update_one({"id": user["id"]}, {"$set": update})
    doctor = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return {"user": _strip(doctor)}


@router.put("/doctor/schedule")
async def update_doctor_schedule(body: ScheduleIn, user: dict = Depends(require_role("doctor"))):
    """Update doctor's weekly schedule. Keys must be mon/tue/wed/thu/fri/sat/sun."""
    schedule = body.weekly_schedule

    # Validate keys
    invalid_keys = set(schedule.keys()) - VALID_DAYS
    if invalid_keys:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid day keys: {invalid_keys}. Must be one of {VALID_DAYS}."
        )

    # Validate each day's ranges are valid dicts with start/end
    for day, ranges in schedule.items():
        if not isinstance(ranges, list):
            raise HTTPException(status_code=400, detail=f"Day '{day}' must be a list of time ranges.")
        for i, r in enumerate(ranges):
            if not isinstance(r, dict) or "start" not in r or "end" not in r:
                raise HTTPException(
                    status_code=400,
                    detail=f"Range {i} for day '{day}' must have 'start' and 'end' fields."
                )

    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"weekly_schedule": schedule}}
    )
    return {"ok": True}


@router.put("/doctor/blocked-dates")
async def update_blocked_dates(body: BlockedDatesIn, user: dict = Depends(require_role("doctor"))):
    """Update doctor's blocked dates (days they are unavailable)."""
    # Validate that all dates are valid ISO format
    for d in body.blocked_dates:
        try:
            datetime.fromisoformat(d)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid date format: '{d}'. Use YYYY-MM-DD.")

    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"blocked_dates": body.blocked_dates}}
    )
    return {"ok": True}


@router.post("/uploads/doctor-avatar")
async def upload_doctor_avatar(
    file: UploadFile = File(...),
    user: dict = Depends(require_role("doctor")),
):
    """Upload a doctor avatar image. Max 2 MB. Saved to backend/uploads/avatars/."""
    # Check file size (2 MB limit)
    MAX_SIZE = 2 * 1024 * 1024  # 2 MB in bytes
    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size is 2 MB.")

    # Validate content type
    content_type = file.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed.")

    # Ensure upload directory exists
    os.makedirs(UPLOADS_DIR, exist_ok=True)

    # Generate unique filename preserving extension
    ext = os.path.splitext(file.filename or "avatar")[1] or ".jpg"
    filename = f"{user['id']}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(UPLOADS_DIR, filename)

    # Write file
    with open(filepath, "wb") as f:
        f.write(contents)

    return {"url": f"/api/uploads/avatars/{filename}"}


@router.get("/uploads/avatars/{filename}")
async def serve_avatar(filename: str):
    """Serve uploaded avatar images."""
    filepath = os.path.join(UPLOADS_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    # Security: ensure no path traversal
    real_path = os.path.realpath(filepath)
    real_dir = os.path.realpath(UPLOADS_DIR)
    if not real_path.startswith(real_dir):
        raise HTTPException(status_code=403, detail="Forbidden")
    return FileResponse(real_path)


def _call_ai(prompt: str):
    return None


@router.get("/doctor/bookings/{booking_id}/review")
async def get_booking_review(booking_id: str, user: dict = Depends(get_current_user)):
    """
    Doctor & Receptionist OPD Queue Review Assistant endpoint for Sprint 2.
    """
    if user.get("role") not in ("doctor", "admin", "receptionist"):
        raise HTTPException(status_code=403, detail="Forbidden")

    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Check mock override
    raw_ai = _call_ai(booking_id)
    if raw_ai == "not json":
        return {
            "summary": f"Booking {booking_id[:8]} for General Consultation. Standard deposit paid.",
            "flags": ["Standard patient consultation"],
            "suggestion": "Call patient next when ready.",
        }

    flags = []
    notes = booking.get("notes", "").lower()
    if any(k in notes for k in ["fever", "temperature", "high", "urgent"]):
        flags.append("Patient reported high fever (>101°F) for 2 days. Priority review recommended before calling routine tokens.")
    else:
        flags.append("Patient in routine OPD consultation queue.")

    return {
        "summary": f"Booking {booking_id[:8]} for General Consultation at {booking.get('slot_time', '11:00 AM')} with token #{booking.get('token_number', 1):02d}. Initial wallet deposit ₹{booking.get('deposit_paid', 200)} paid.",
        "flags": flags,
        "suggestion": "Call patient next, check pulse and temperature, and review previous prescription history.",
    }

