# INTEGRATION: Auto-discovered by server.py from routes/ directory
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from config import db, HOSPITAL_META, hospital_id_from_name, get_current_user, require_role
from pydantic import BaseModel

router = APIRouter(prefix="/api")


def _strip(u: dict) -> dict:
    u = {**u}
    u.pop("password_hash", None)
    u.pop("_id", None)
    return u


@router.get("/public/hospitals/{hospital_id}")
async def public_hospital_detail(hospital_id: str):
    """
    Public endpoint — return hospital metadata, doctor list, last 5 reviews,
    and unique specialties. No auth required.
    """
    # Find all doctors belonging to this hospital
    all_doctors = await db.users.find(
        {"role": "doctor"}, {"_id": 0, "password_hash": 0}
    ).to_list(200)

    match = [d for d in all_doctors if hospital_id_from_name(d.get("hospital", "")) == hospital_id]

    if not match:
        raise HTTPException(status_code=404, detail="Hospital not found")

    hospital_name = match[0]["hospital"]
    meta = HOSPITAL_META.get(hospital_name, {
        "city": "India", "area": "", "rating": 4.5, "reviews": 0, "image": "", "tags": [], "gallery": []
    })

    # Fetch last 5 reviews for this hospital
    reviews = []
    try:
        reviews_cursor = (
            db.reviews.find({"hospital_id": hospital_id}, {"_id": 0})
            .sort("created_at", -1)
            .limit(5)
        )
        reviews = await reviews_cursor.to_list(5)
    except Exception:
        reviews = []

    # Unique specialties from the doctors
    specialties = []
    seen = set()
    for d in match:
        sp = d.get("specialty", "")
        if sp and sp not in seen:
            seen.add(sp)
            specialties.append(sp)

    return {
        "hospital": {
            "id": hospital_id,
            "name": hospital_name.split(",")[0].strip(),
            "full_name": hospital_name,
            **meta,
        },
        "doctors": [_strip(d) for d in match],
        "reviews": reviews,
        "specialties": specialties,
    }


@router.get("/public/hospitals")
async def public_list_hospitals():
    """
    Public endpoint — return all hospitals with doctor counts and metadata.
    No auth required.
    """
    doctors = await db.users.find({"role": "doctor"}, {"_id": 0, "password_hash": 0}).to_list(200)
    grouped: dict = {}
    for d in doctors:
        h = d.get("hospital", "Unknown")
        default_meta = {"city": "India", "area": "", "rating": 4.5, "reviews": 0, "image": "", "tags": []}
        entry = grouped.setdefault(
            h,
            {
                "id": hospital_id_from_name(h),
                "name": h.split(",")[0].strip(),
                "full_name": h,
                "doctor_count": 0,
                "specialties": [],
                "min_fee": d.get("fee", 0),
                **HOSPITAL_META.get(h, default_meta),
            },
        )
        entry["doctor_count"] += 1
        sp = d.get("specialty", "")
        if sp and sp not in entry["specialties"]:
            entry["specialties"].append(sp)
        entry["min_fee"] = min(entry["min_fee"], d.get("fee", entry["min_fee"]))
    return {"hospitals": list(grouped.values())}


class HospitalMetaIn(BaseModel):
    phone: Optional[str] = None
    address: Optional[str] = None
    opening_hours: Optional[dict] = None


@router.patch("/reception/hospital/meta")
async def update_hospital_meta(
    body: HospitalMetaIn,
    user: dict = Depends(require_role("reception")),
):
    """
    Reception-only endpoint — update hospital metadata in-memory.
    For MVP: persists only for the current server session.
    """
    hospital_name = user.get("hospital", "")

    # Find the hospital name from the reception user or fall back to first match
    if not hospital_name:
        # Try to find based on existing hospitals
        all_hospital_names = list(HOSPITAL_META.keys())
        if all_hospital_names:
            hospital_name = all_hospital_names[0]

    if hospital_name and hospital_name in HOSPITAL_META:
        if body.phone is not None:
            HOSPITAL_META[hospital_name]["phone"] = body.phone
        if body.address is not None:
            HOSPITAL_META[hospital_name]["address"] = body.address
        if body.opening_hours is not None:
            HOSPITAL_META[hospital_name]["opening_hours"] = body.opening_hours

    return {"ok": True, "message": "Updated for this session. Database persistence coming soon."}
