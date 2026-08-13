# INTEGRATION: Auto-discovered by server.py from routes/ directory
# Feature 07: In-Hospital Directions
# NOTE for integration pass: Add these direction fields to seed data in server.py's seed() function:
# Dr. Kavya Iyer: cabin="Cabin 3", floor="Floor 1", landmark="near the pharmacy", map_x=30.0, map_y=60.0
# Dr. Rohan Desai: cabin="Cabin 5", floor="Floor 2", landmark="end of corridor", map_x=70.0, map_y=40.0
# Dr. Sneha Rao: cabin="Cabin 7", floor="Floor 2", landmark="near the lift", map_x=80.0, map_y=70.0
# Dr. Arjun Mehta: cabin="Cabin 2", floor="Floor 3", landmark="near reception desk", map_x=40.0, map_y=30.0
# Dr. Priya Kulkarni: cabin="Cabin 4", floor="Floor 3", landmark="next to consultation room", map_x=60.0, map_y=30.0
# Dr. Nisha Rao: cabin="Cabin 1", floor="Ground Floor", landmark="first door on left", map_x=20.0, map_y=50.0
# Dr. Vikram Sinha: cabin="Cabin 6", floor="Floor 1", landmark="near X-ray room", map_x=75.0, map_y=60.0

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional
import os, jwt, shutil
from datetime import datetime, timezone, timedelta
from config import db, get_current_user, require_role, new_id, now_iso, JWT_SECRET, JWT_ALGORITHM, HOSPITAL_META, hospital_id_from_name

router = APIRouter(prefix="/api")

MAPS_DIR = os.path.join("/tmp", "nirogpath_maps")
try:
    os.makedirs(MAPS_DIR, exist_ok=True)
except Exception:
    MAPS_DIR = "/tmp"

ALLOWED_MAP_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/svg+xml"}
ALLOWED_MAP_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "svg"}
MAX_MAP_BYTES = 2 * 1024 * 1024  # 2 MB


class DoctorLocationIn(BaseModel):
    cabin: Optional[str] = None
    floor: Optional[str] = None
    landmark: Optional[str] = None
    map_x: Optional[float] = None
    map_y: Optional[float] = None


# ---------- GET /api/bookings/{booking_id}/directions ----------

@router.get("/bookings/{booking_id}/directions")
async def get_directions(
    booking_id: str,
    user: dict = Depends(require_role("patient")),
):
    """
    Return in-hospital directions for a patient's booking.
    Only available when booking status is 'arrived' or 'in_consult'.
    """
    # Verify booking belongs to this patient
    booking = await db.bookings.find_one(
        {"id": booking_id, "patient_id": user["id"]},
        {"_id": 0},
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # Verify patient has arrived
    if booking.get("status") not in ("arrived", "in_consult"):
        raise HTTPException(status_code=400, detail="Not arrived yet")

    # Fetch the doctor
    doctor = await db.users.find_one(
        {"id": booking["doctor_id"], "role": "doctor"},
        {"_id": 0, "password_hash": 0},
    )
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Backfill direction defaults if missing (doctor has no cabin set yet)
    if not doctor.get("cabin"):
        default_directions = _get_default_directions(doctor.get("name", ""))
        if default_directions:
            await db.users.update_one(
                {"id": doctor["id"]},
                {"$set": default_directions},
            )
            doctor.update(default_directions)

    # Create a QR payload JWT valid for 4 hours
    qr_payload = jwt.encode(
        {
            "booking_id": booking_id,
            "exp": datetime.now(timezone.utc) + timedelta(hours=4),
        },
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )

    # Get hospital map_image_url if set
    hospital_name = doctor.get("hospital", "")
    hospital_meta = HOSPITAL_META.get(hospital_name, {})

    return {
        "cabin": doctor.get("cabin", "Reception"),
        "floor": doctor.get("floor", "Ground Floor"),
        "landmark": doctor.get("landmark", ""),
        "map_image_url": hospital_meta.get("map_image_url", None),
        "map_x": doctor.get("map_x", 50.0),
        "map_y": doctor.get("map_y", 50.0),
        "token_number": booking.get("token_number"),
        "qr_payload": qr_payload,
        "doctor_name": doctor.get("name"),
    }


def _get_default_directions(doctor_name: str) -> dict:
    """Return default direction fields for seeded doctors by name."""
    defaults = {
        "Dr. Kavya Iyer": {"cabin": "Cabin 3", "floor": "Floor 1", "landmark": "near the pharmacy", "map_x": 30.0, "map_y": 60.0},
        "Dr. Rohan Desai": {"cabin": "Cabin 5", "floor": "Floor 2", "landmark": "end of corridor", "map_x": 70.0, "map_y": 40.0},
        "Dr. Sneha Rao": {"cabin": "Cabin 7", "floor": "Floor 2", "landmark": "near the lift", "map_x": 80.0, "map_y": 70.0},
        "Dr. Arjun Mehta": {"cabin": "Cabin 2", "floor": "Floor 3", "landmark": "near reception desk", "map_x": 40.0, "map_y": 30.0},
        "Dr. Priya Kulkarni": {"cabin": "Cabin 4", "floor": "Floor 3", "landmark": "next to consultation room", "map_x": 60.0, "map_y": 30.0},
        "Dr. Nisha Rao": {"cabin": "Cabin 1", "floor": "Ground Floor", "landmark": "first door on left", "map_x": 20.0, "map_y": 50.0},
        "Dr. Vikram Sinha": {"cabin": "Cabin 6", "floor": "Floor 1", "landmark": "near X-ray room", "map_x": 75.0, "map_y": 60.0},
    }
    return defaults.get(doctor_name, {})


# ---------- GET /api/reception/verify-qr ----------

@router.get("/reception/verify-qr")
async def verify_qr(
    token: str = Query(..., description="QR JWT token to verify"),
    user: dict = Depends(get_current_user),
):
    """
    Verify a patient's QR code token. Returns the associated booking.
    Available to any authenticated user (reception, doctor, etc.).
    """
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="QR code has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=400, detail="Invalid QR code")

    booking_id = payload.get("booking_id")
    if not booking_id:
        raise HTTPException(status_code=400, detail="Invalid QR code payload")

    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    return {"booking": booking}


# ---------- POST /api/reception/hospital/map ----------

@router.post("/reception/hospital/map")
async def upload_hospital_map(
    file: UploadFile = File(...),
    user: dict = Depends(require_role("reception")),
):
    """
    Upload a hospital floor map image (jpg/png/webp/svg, max 2 MB).
    Saves to backend/uploads/maps/ and updates HOSPITAL_META in-memory.
    Note: map_image_url persists only for the current server session.
    """
    # Validate content type
    content_type = file.content_type or ""
    if content_type not in ALLOWED_MAP_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only JPEG, PNG, WebP, and SVG images are allowed",
        )

    # Read and validate size
    contents = await file.read()
    if len(contents) > MAX_MAP_BYTES:
        raise HTTPException(status_code=400, detail="File size must be under 2 MB")

    # Determine extension
    ext = None
    if file.filename:
        parts = file.filename.rsplit(".", 1)
        if len(parts) == 2 and parts[1].lower() in ALLOWED_MAP_EXTENSIONS:
            ext = parts[1].lower()
    if ext is None:
        ext_map = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp",
            "image/svg+xml": "svg",
        }
        ext = ext_map.get(content_type, "jpg")

    # Determine hospital for this reception user
    hospital_name = user.get("hospital", "")
    if not hospital_name:
        # Fall back to first available hospital
        all_hospital_names = list(HOSPITAL_META.keys())
        if all_hospital_names:
            hospital_name = all_hospital_names[0]

    hospital_id = hospital_id_from_name(hospital_name) if hospital_name else "default"
    filename = f"{hospital_id}.{ext}"
    filepath = os.path.join(MAPS_DIR, filename)

    # Write file
    with open(filepath, "wb") as f:
        f.write(contents)

    map_url = f"/api/uploads/maps/{filename}"

    # Update HOSPITAL_META in-memory
    if hospital_name and hospital_name in HOSPITAL_META:
        HOSPITAL_META[hospital_name]["map_image_url"] = map_url
    elif hospital_name:
        HOSPITAL_META[hospital_name] = {"map_image_url": map_url}

    return {"url": map_url}


# ---------- GET /api/uploads/maps/{filename} ----------

@router.get("/uploads/maps/{filename}")
async def get_map(filename: str):
    """Serve uploaded hospital map images (public endpoint)."""
    # Basic path traversal guard
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    path = os.path.join(MAPS_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Map not found")
    return FileResponse(path)


# ---------- PATCH /api/doctor/location ----------

@router.patch("/doctor/location")
async def update_doctor_location(
    body: DoctorLocationIn,
    user: dict = Depends(require_role("doctor")),
):
    """
    Update a doctor's cabin, floor, landmark, and map pin coordinates.
    Also backfills default direction fields if the doctor has none set.
    """
    # Build update dict from non-None fields
    update = {}
    for field, value in body.model_dump(exclude_none=True).items():
        update[field] = value

    # Backfill defaults if doctor has no cabin yet (and caller didn't provide one)
    doctor = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if doctor and not doctor.get("cabin") and "cabin" not in update:
        defaults = _get_default_directions(doctor.get("name", ""))
        for k, v in defaults.items():
            if k not in update:
                update[k] = v

    if update:
        await db.users.update_one({"id": user["id"]}, {"$set": update})

    doctor = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    doctor.pop("_id", None)
    doctor.pop("password_hash", None)

    return {
        "cabin": doctor.get("cabin", "Reception"),
        "floor": doctor.get("floor", "Ground Floor"),
        "landmark": doctor.get("landmark", ""),
        "map_x": doctor.get("map_x", 50.0),
        "map_y": doctor.get("map_y", 50.0),
    }
