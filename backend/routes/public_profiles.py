# INTEGRATION: Auto-discovered by server.py from routes/ directory
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from datetime import datetime, timezone
from config import db, hospital_id_from_name, HOSPITAL_META

router = APIRouter(prefix="/api")


def _strip(u: dict) -> dict:
    u = {**u}
    u.pop("password_hash", None)
    u.pop("_id", None)
    return u


def generate_time_slots(start: str, end: str) -> list:
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


@router.get("/public/doctors/{doctor_id}")
async def public_doctor_profile(doctor_id: str):
    """
    Public endpoint — return full doctor profile, last 5 reviews,
    up to 3 related doctors (same hospital), and hospital metadata.
    No auth required.
    """
    doctor = await db.users.find_one({"id": doctor_id, "role": "doctor"}, {"_id": 0})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    doctor = _strip(doctor)

    # Fetch last 5 reviews for this doctor
    reviews = []
    reviews_count = 0
    try:
        reviews_cursor = (
            db.reviews.find({"doctor_id": doctor_id}, {"_id": 0})
            .sort("created_at", -1)
            .limit(5)
        )
        reviews = await reviews_cursor.to_list(5)
        reviews_count = await db.reviews.count_documents({"doctor_id": doctor_id})
    except Exception:
        reviews = []
        reviews_count = 0

    # Fetch up to 3 related doctors (same hospital, different id)
    hospital = doctor.get("hospital", "")
    related = []
    if hospital:
        related_cursor = db.users.find(
            {"role": "doctor", "hospital": hospital, "id": {"$ne": doctor_id}},
            {"_id": 0, "password_hash": 0},
        ).limit(3)
        related = await related_cursor.to_list(3)

    return {
        "doctor": {**doctor, "reviews_count": reviews_count},
        "reviews": reviews,
        "related_doctors": related,
        "hospital_meta": HOSPITAL_META.get(hospital, {}),
    }


@router.get("/public/doctors/{doctor_id}/availability")
async def public_doctor_availability(
    doctor_id: str,
    date: Optional[str] = Query(default=None),
):
    """
    Public endpoint — return available 15-min time slots for a doctor on a given date.
    Accepts ?date=YYYY-MM-DD (defaults to today).
    No auth required.
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

    # Check if date is blocked
    blocked_dates = doctor.get("blocked_dates", [])
    if date in blocked_dates:
        return {"slots": [], "date": date}

    # Get day-of-week key
    d = datetime.fromisoformat(date).date()
    day_key = d.strftime("%a").lower()  # mon, tue, wed, thu, fri, sat, sun

    weekly_schedule = doctor.get("weekly_schedule", {})

    if not weekly_schedule:
        # Fallback default slots when no schedule is configured
        default_slots = [
            "09:00", "09:15", "09:30", "09:45",
            "10:00", "10:15", "10:30", "10:45",
            "11:00", "11:15", "11:30", "11:45",
            "12:00", "12:15",
        ]
        # Remove already-booked slots
        booked = await db.bookings.find(
            {"doctor_id": doctor_id, "date": date, "status": {"$ne": "cancelled"}},
            {"_id": 0, "slot_time": 1},
        ).to_list(100)
        taken = {b["slot_time"] for b in booked}
        slots = [{"time": s, "available": s not in taken} for s in default_slots]
        return {"slots": slots, "date": date}

    day_ranges = weekly_schedule.get(day_key, [])
    if not day_ranges:
        return {"slots": [], "date": date}

    # Generate all 15-min slots from the day's time ranges
    all_slots = []
    for r in day_ranges:
        all_slots.extend(generate_time_slots(r.get("start", "09:00"), r.get("end", "13:00")))

    # Remove already-booked slots
    booked = await db.bookings.find(
        {"doctor_id": doctor_id, "date": date, "status": {"$ne": "cancelled"}},
        {"_id": 0, "slot_time": 1},
    ).to_list(100)
    taken = {b["slot_time"] for b in booked}

    slots = [{"time": s, "available": s not in taken} for s in all_slots]
    return {"slots": slots, "date": date}
