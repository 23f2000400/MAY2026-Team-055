import os
import secrets
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, status
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import uuid
import logging

from config import db, mongo_url, reindex_doctor_queue

JWT_SECRET = os.environ.get("JWT_SECRET") or "nirogpath-dev-secret-change-in-production-64chars-abcdef0123456789"
JWT_ALGORITHM = "HS256"

app = FastAPI(title="NirogPath API")
api = APIRouter(prefix="/api")

logger = logging.getLogger("nirogpath")
logging.basicConfig(level=logging.INFO)


# ---------- Helpers ----------
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def make_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def new_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def strip_user(u: dict) -> dict:
    u = {**u}
    u.pop("password_hash", None)
    return u


async def get_current_user(request: Request) -> dict:
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return strip_user(user)


def require_role(*roles: str):
    async def dep(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in roles and user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return dep


# ---------- Models ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    phone: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class BookingIn(BaseModel):
    doctor_id: str
    slot_time: str  # "HH:MM"
    date: Optional[str] = None  # YYYY-MM-DD, defaults to today


class LateIn(BaseModel):
    running_late: bool
    delay_minutes: int = 40


class CreateDoctorIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str
    specialty: str
    hospital: str
    fee: int = 500
    experience_years: int = 5
    rating: float = 4.8
    avatar: Optional[str] = ""
    phone: Optional[str] = ""


class CreateHospitalIn(BaseModel):
    name: str
    city: str
    area: str
    rating: float = 4.5
    reviews: int = 0
    image: Optional[str] = ""
    tags: List[str] = []
    specialties: List[str] = []
    min_fee: float = 500.0


# ---------- Auth endpoints ----------
@api.post("/auth/register")
async def register(body: RegisterIn):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {
        "id": new_id(),
        "email": email,
        "name": body.name,
        "phone": body.phone or "",
        "role": "patient",
        "wallet_balance": 2000,
        "password_hash": hash_password(body.password),
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    token = make_token(user["id"], email, "patient")
    return {"token": token, "user": strip_user({k: v for k, v in user.items() if k != "_id"})}


@api.post("/auth/login")
async def login(body: LoginIn):
    await db.seed_if_needed()
    email = body.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = make_token(user["id"], email, user["role"])
    return {"token": token, "user": strip_user(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return {"user": user}


# ---------- Hospitals ----------
HOSPITAL_META = {
    "Sanjeevani Clinic, Bengaluru": {
        "city": "Bengaluru",
        "area": "Indiranagar",
        "rating": 4.6,
        "reviews": 812,
        "image": "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=800&q=70",
        "tags": ["Multi-speciality", "24×7 pharmacy"],
    },
    "Aarogya Care, Pune": {
        "city": "Pune",
        "area": "Kothrud",
        "rating": 4.8,
        "reviews": 1204,
        "image": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=70",
        "tags": ["Cardiac unit", "In-house lab"],
    },
    "Meera Multispeciality, Chennai": {
        "city": "Chennai",
        "area": "T. Nagar",
        "rating": 4.5,
        "reviews": 634,
        "image": "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=70",
        "tags": ["Child-friendly", "Vaccination"],
    },
}


def hospital_id_from_name(name: str) -> str:
    return name.lower().replace(",", "").replace(" ", "-").strip("-")


@api.get("/hospitals")
async def list_hospitals():
    doctors = await db.users.find({"role": "doctor"}, {"_id": 0, "password_hash": 0}).to_list(200)
    db_hospitals = await db.hospitals.find({}, {"_id": 0}).to_list(200)
    
    grouped: dict = {}
    for dh in db_hospitals:
        full_name = dh.get("full_name") or f"{dh.get('name')}, {dh.get('city', 'India')}"
        grouped[full_name] = {
            "id": dh.get("id") or hospital_id_from_name(full_name),
            "name": dh.get("name") or full_name.split(",")[0].strip(),
            "full_name": full_name,
            "city": dh.get("city", "India"),
            "area": dh.get("area", ""),
            "rating": dh.get("rating", 4.5),
            "reviews": dh.get("reviews", 0),
            "image": dh.get("image") or "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=800&q=70",
            "tags": dh.get("tags", []),
            "specialties": dh.get("specialties", []),
            "doctor_count": 0,
            "min_fee": dh.get("min_fee", 500.0),
        }

    for d in doctors:
        h = d.get("hospital", "Unknown")
        entry = grouped.setdefault(
            h,
            {
                "id": hospital_id_from_name(h),
                "name": h.split(",")[0].strip(),
                "full_name": h,
                "doctor_count": 0,
                "specialties": [],
                "min_fee": d.get("fee", 500.0),
                **HOSPITAL_META.get(h, {"city": "India", "area": "", "rating": 4.5, "reviews": 0, "image": "", "tags": []}),
            },
        )
        entry["doctor_count"] += 1
        if d.get("specialty") and d["specialty"] not in entry["specialties"]:
            entry["specialties"].append(d["specialty"])
        if d.get("fee"):
            entry["min_fee"] = min(entry["min_fee"], d["fee"])

    return {"hospitals": list(grouped.values())}


@api.get("/hospitals/{hospital_id}/doctors")
async def hospital_doctors(hospital_id: str):
    doctors = await db.users.find({"role": "doctor"}, {"_id": 0, "password_hash": 0}).to_list(200)
    match = [d for d in doctors if hospital_id_from_name(d.get("hospital", "")) == hospital_id]
    if not match:
        raise HTTPException(404, "Hospital not found")
    hospital_name = match[0]["hospital"]
    meta = HOSPITAL_META.get(hospital_name, {})
    return {
        "hospital": {
            "id": hospital_id,
            "name": hospital_name.split(",")[0].strip(),
            "full_name": hospital_name,
            **meta,
        },
        "doctors": match,
    }


# ---------- Doctors ----------
@api.get("/doctors")
async def list_doctors():
    docs = await db.users.find({"role": "doctor"}, {"_id": 0, "password_hash": 0}).to_list(100)
    return {"doctors": docs}


def generate_slots():
    """Static slots for the day, easy to demo."""
    return [
        "09:00", "09:15", "09:30", "09:45",
        "10:00", "10:15", "10:30", "10:45",
        "11:00", "11:15", "11:30", "11:45",
        "12:00", "12:15",
    ]


@api.get("/doctors/{doctor_id}/slots")
async def doctor_slots(doctor_id: str, date: Optional[str] = None):
    doctor = await db.users.find_one({"id": doctor_id, "role": "doctor"}, {"_id": 0, "password_hash": 0})
    if not doctor:
        raise HTTPException(404, "Doctor not found")
    slot_date = date or datetime.now(timezone.utc).date().isoformat()
    booked = await db.bookings.find(
        {"doctor_id": doctor_id, "date": slot_date, "status": {"$ne": "cancelled"}},
        {"_id": 0, "slot_time": 1},
    ).to_list(100)
    taken = {b["slot_time"] for b in booked}
    slots = [{"time": s, "available": s not in taken} for s in generate_slots()]
    return {"doctor": doctor, "slots": slots, "date": slot_date}


# ---------- Bookings ----------
def booking_dict(b: dict) -> dict:
    return {k: v for k, v in b.items() if k != "_id"}


@api.post("/bookings")
async def create_booking(body: BookingIn, user: dict = Depends(require_role("patient"))):
    doctor = await db.users.find_one({"id": body.doctor_id, "role": "doctor"}, {"_id": 0})
    if not doctor:
        raise HTTPException(404, "Doctor not found")
    if body.slot_time not in generate_slots():
        raise HTTPException(400, "Invalid slot")
    booking_date = body.date or datetime.now(timezone.utc).date().isoformat()
    dup = await db.bookings.find_one({
        "doctor_id": doctor["id"], "date": booking_date, "slot_time": body.slot_time,
        "status": {"$ne": "cancelled"},
    })
    if dup:
        raise HTTPException(400, "Slot already booked")

    deposit = int(round(doctor.get("fee", 500) * 0.2))
    if user.get("wallet_balance", 0) < deposit:
        raise HTTPException(400, "Insufficient wallet balance (need ₹%d)" % deposit)

    booking = {
        "id": new_id(),
        "patient_id": user["id"],
        "patient_name": user["name"],
        "patient_phone": user.get("phone", ""),
        "doctor_id": doctor["id"],
        "doctor_name": doctor["name"],
        "doctor_specialty": doctor.get("specialty", ""),
        "hospital": doctor.get("hospital", ""),
        "date": booking_date,
        "slot_time": body.slot_time,
        "token_number": 0,
        "status": "booked",
        "deposit_paid": deposit,
        "fee_total": doctor.get("fee", 500),
        "running_late": False,
        "delay_minutes": 0,
        "created_at": now_iso(),
        "arrived_at": None,
    }
    await db.bookings.insert_one(booking)
    await db.users.update_one({"id": user["id"]}, {"$inc": {"wallet_balance": -deposit}})

    # Re-index queue so token numbers match slot time chronology (e.g. 10 am gets token 1, 11 am gets token 2)
    await reindex_doctor_queue(doctor["id"], booking_date)
    updated_booking = await db.bookings.find_one({"id": booking["id"]}, {"_id": 0})
    return {"booking": booking_dict(updated_booking or booking)}


@api.get("/bookings/me")
async def my_bookings(user: dict = Depends(require_role("patient"))):
    items = await db.bookings.find({"patient_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"bookings": items}


@api.post("/bookings/{booking_id}/arrive")
async def mark_arrived(booking_id: str, user: dict = Depends(require_role("patient"))):
    b = await db.bookings.find_one({"id": booking_id, "patient_id": user["id"]}, {"_id": 0})
    if not b:
        raise HTTPException(404, "Booking not found")
    if b["status"] != "booked":
        raise HTTPException(400, "Already arrived or completed")
    await db.bookings.update_one({"id": booking_id}, {"$set": {"status": "arrived", "arrived_at": now_iso()}})
    await reindex_doctor_queue(b["doctor_id"], b.get("date", ""))
    updated = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    return {"booking": updated}


@api.get("/bookings/{booking_id}/queue-position")
async def booking_queue_position(booking_id: str, user: dict = Depends(require_role("patient"))):
    b = await db.bookings.find_one({"id": booking_id, "patient_id": user["id"]}, {"_id": 0})
    if not b:
        raise HTTPException(404, "Booking not found")
    today = b.get("date", datetime.now(timezone.utc).date().isoformat())
    doctor_id = b["doctor_id"]
    await reindex_doctor_queue(doctor_id, today)
    b = await db.bookings.find_one({"id": booking_id}, {"_id": 0})

    # Fetch all active timeline items for doctor
    all_active = await db.bookings.find(
        {"doctor_id": doctor_id, "date": today, "status": {"$ne": "cancelled"}},
        {"_id": 0}
    ).sort("token_number", 1).to_list(100)

    now_serving_doc = next((item for item in all_active if item.get("status") == "in_consult"), None)
    now_serving = now_serving_doc.get("token_number", 1) if now_serving_doc else (all_active[0].get("token_number", 1) if all_active else 1)

    timeline = []
    for item in all_active:
        is_me = (item.get("id") == b["id"] or item.get("patient_id") == user["id"])
        item_status = item.get("status")
        token_num = item.get("token_number", 0)

        if item_status == "completed" or (now_serving > 0 and token_num < now_serving):
            st_lbl = "Completed"
        elif item_status == "in_consult" or token_num == now_serving:
            st_lbl = "In consultation"
        elif is_me:
            st_lbl = "Your turn soon"
        else:
            st_lbl = "Waiting"

        timeline.append({
            "token_number": token_num,
            "name": "You" if is_me else item.get("patient_name", "Patient"),
            "status_label": st_lbl,
            "is_user": is_me,
            "status": "completed" if (item_status == "completed" or (now_serving > 0 and token_num < now_serving)) else item_status,
        })

    if b["status"] not in ("arrived", "in_consult", "booked"):
        return {
            "status": b["status"], "position": 0, "ahead": 0, "eta_minutes": 0,
            "token_number": b.get("token_number", 0), "now_serving": now_serving,
            "progress_percent": 0, "doctor_name": b.get("doctor_name", ""),
            "doctor_specialty": b.get("doctor_specialty", "General Physician"),
            "slot_time": b.get("slot_time", ""), "running_late": b.get("running_late", False),
            "delay_minutes": b.get("delay_minutes", 0), "timeline": timeline,
        }

    user_token = b.get("token_number") or 1
    ahead = await db.bookings.count_documents({
        "doctor_id": doctor_id,
        "date": today,
        "token_number": {"$lt": user_token},
        "status": {"$in": ["arrived", "in_consult", "booked"]},
    })
    position = ahead + 1
    eta_minutes = ahead * 12
    if now_serving_doc and (now_serving_doc.get("token_number") or 0) < user_token:
        eta_minutes += 6

    progress_pct = min(100, max(15, int(round((now_serving / max(1, user_token)) * 70))))

    return {
        "status": b.get("status", "booked"),
        "token_number": user_token,
        "position": position,
        "ahead": ahead,
        "eta_minutes": eta_minutes,
        "now_serving": now_serving,
        "progress_percent": progress_pct,
        "doctor_name": b.get("doctor_name", "Doctor"),
        "doctor_specialty": b.get("doctor_specialty", "General Physician"),
        "slot_time": b.get("slot_time", ""),
        "running_late": b.get("running_late", False),
        "delay_minutes": b.get("delay_minutes", 0),
        "timeline": timeline,
    }


@api.post("/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str, user: dict = Depends(require_role("patient"))):
    b = await db.bookings.find_one({"id": booking_id, "patient_id": user["id"]}, {"_id": 0})
    if not b:
        raise HTTPException(404, "Booking not found")
    if b["status"] in ("completed", "cancelled"):
        raise HTTPException(400, "Cannot cancel")
    await db.bookings.update_one({"id": booking_id}, {"$set": {"status": "cancelled"}})
    await db.users.update_one({"id": user["id"]}, {"$inc": {"wallet_balance": b.get("deposit_paid", 0)}})
    await reindex_doctor_queue(b["doctor_id"], b.get("date", ""))
    return {"ok": True}


# ---------- Doctor queue ----------
@api.get("/doctor/queue")
async def doctor_queue(user: dict = Depends(require_role("doctor"))):
    today = datetime.now(timezone.utc).date().isoformat()
    await reindex_doctor_queue(user["id"], today)
    q = await db.bookings.find(
        {"doctor_id": user["id"], "date": today},
        {"_id": 0},
    ).sort("token_number", 1).to_list(100)
    return {"queue": q, "doctor": user}


@api.post("/doctor/bookings/{booking_id}/call-next")
async def call_next(booking_id: str, user: dict = Depends(require_role("doctor"))):
    b = await db.bookings.find_one({"id": booking_id, "doctor_id": user["id"]}, {"_id": 0})
    if not b:
        raise HTTPException(404, "Booking not found")
    await db.bookings.update_one({"id": booking_id}, {"$set": {"status": "in_consult"}})
    return {"ok": True}


@api.post("/doctor/bookings/{booking_id}/complete")
async def complete_booking(booking_id: str, user: dict = Depends(require_role("doctor"))):
    b = await db.bookings.find_one({"id": booking_id, "doctor_id": user["id"]}, {"_id": 0})
    if not b:
        raise HTTPException(404, "Booking not found")
    await db.bookings.update_one({"id": booking_id}, {"$set": {"status": "completed"}})
    return {"ok": True}


@api.post("/doctor/set-late")
async def set_late(body: LateIn, user: dict = Depends(require_role("doctor"))):
    today = datetime.now(timezone.utc).date().isoformat()
    await db.bookings.update_many(
        {"doctor_id": user["id"], "date": today, "status": {"$in": ["booked", "arrived"]}},
        {"$set": {"running_late": body.running_late, "delay_minutes": body.delay_minutes if body.running_late else 0}},
    )
    return {"ok": True}


# ---------- Prescriptions & Medicine Alarms ----------
FREQUENCY_TIMES = {
    "OD": ["09:00"],                          # once daily
    "BID": ["09:00", "21:00"],                # twice daily
    "TID": ["09:00", "14:00", "21:00"],       # thrice daily
    "QID": ["08:00", "13:00", "18:00", "22:00"],  # four times daily
}
FREQUENCY_LABEL = {
    "OD": "Once daily",
    "BID": "Twice daily",
    "TID": "Thrice daily",
    "QID": "Four times daily",
}
FOOD_LABEL = {
    "before": "Before food",
    "after": "After food",
    "with": "With food",
    "empty": "Empty stomach",
    "any": "Any time",
}


class MedicationIn(BaseModel):
    name: str = Field(min_length=1)
    dose: str = Field(min_length=1)  # e.g. "500 mg", "10 ml"
    frequency: str  # OD | BID | TID | QID
    food_instructions: str = "any"  # before | after | with | empty | any
    duration_days: int = Field(default=5, ge=1, le=365)


class PrescriptionIn(BaseModel):
    medications: List[MedicationIn]
    notes: Optional[str] = ""


@api.post("/doctor/bookings/{booking_id}/prescription")
async def write_prescription(
    booking_id: str,
    body: PrescriptionIn,
    user: dict = Depends(require_role("doctor")),
):
    b = await db.bookings.find_one({"id": booking_id, "doctor_id": user["id"]}, {"_id": 0})
    if not b:
        raise HTTPException(404, "Booking not found")
    if not body.medications:
        raise HTTPException(400, "At least one medication required")

    meds = []
    for m in body.medications:
        freq = m.frequency.upper()
        if freq not in FREQUENCY_TIMES:
            raise HTTPException(400, f"Invalid frequency: {freq}")
        meds.append({
            "name": m.name,
            "dose": m.dose,
            "frequency": freq,
            "frequency_label": FREQUENCY_LABEL[freq],
            "food_instructions": m.food_instructions,
            "food_label": FOOD_LABEL.get(m.food_instructions, m.food_instructions),
            "duration_days": m.duration_days,
            "times": FREQUENCY_TIMES[freq],
        })

    prescription = {
        "id": new_id(),
        "booking_id": booking_id,
        "patient_id": b["patient_id"],
        "patient_name": b["patient_name"],
        "doctor_id": user["id"],
        "doctor_name": user["name"],
        "doctor_specialty": user.get("specialty", ""),
        "hospital": user.get("hospital", ""),
        "notes": body.notes or "",
        "medications": meds,
        "created_at": now_iso(),
    }
    await db.prescriptions.insert_one(prescription)
    # Mark booking completed
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": "completed", "prescription_id": prescription["id"]}},
    )
    return {"prescription": {k: v for k, v in prescription.items() if k != "_id"}}


@api.get("/prescriptions/me")
async def my_prescriptions(user: dict = Depends(require_role("patient"))):
    items = await db.prescriptions.find({"patient_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"prescriptions": items}


@api.get("/prescriptions/{prescription_id}")
async def get_prescription(prescription_id: str, user: dict = Depends(get_current_user)):
    p = await db.prescriptions.find_one({"id": prescription_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Prescription not found")
    # Only the patient or the writing doctor may view
    if user["role"] == "patient" and p["patient_id"] != user["id"]:
        raise HTTPException(403, "Forbidden")
    if user["role"] == "doctor" and p["doctor_id"] != user["id"]:
        raise HTTPException(403, "Forbidden")
    return {"prescription": p}


def prescription_active(p: dict, today_date) -> bool:
    """Prescription is active if today ∈ [created_date, created_date + max(duration)]"""
    try:
        created = datetime.fromisoformat(p["created_at"]).date()
    except Exception:
        return False
    max_days = max((m.get("duration_days", 0) for m in p.get("medications", [])), default=0)
    return created <= today_date <= (created + timedelta(days=max_days - 1))


@api.get("/medicines/today")
async def medicines_today(user: dict = Depends(require_role("patient"))):
    """Flattened list of every dose the patient should take today across all active prescriptions."""
    today = datetime.now(timezone.utc).date()
    today_iso = today.isoformat()
    prescriptions = await db.prescriptions.find({"patient_id": user["id"]}, {"_id": 0}).to_list(500)

    # Fetch today's dose logs in one shot
    log_docs = await db.dose_logs.find({"patient_id": user["id"], "date": today_iso}, {"_id": 0}).to_list(500)
    logs = {(l["prescription_id"], l["med_index"], l["time"]): l for l in log_docs}

    doses = []
    for p in prescriptions:
        if not prescription_active(p, today):
            continue
        for idx, med in enumerate(p["medications"]):
            for t in med["times"]:
                key = (p["id"], idx, t)
                doses.append({
                    "prescription_id": p["id"],
                    "med_index": idx,
                    "name": med["name"],
                    "dose": med["dose"],
                    "food_label": med.get("food_label", ""),
                    "food_instructions": med.get("food_instructions", "any"),
                    "time": t,
                    "doctor_name": p["doctor_name"],
                    "taken": key in logs,
                    "taken_at": logs[key]["taken_at"] if key in logs else None,
                })
    doses.sort(key=lambda x: x["time"])

    # Streak: consecutive days ending yesterday where all scheduled doses were taken
    streak = await compute_streak(user["id"], today)

    return {"doses": doses, "streak": streak, "date": today_iso}


async def compute_streak(patient_id: str, today) -> int:
    """Count consecutive full-adherence days ending yesterday (today is excluded — still in progress)."""
    prescriptions = await db.prescriptions.find({"patient_id": patient_id}, {"_id": 0}).to_list(500)
    if not prescriptions:
        return 0

    streak = 0
    for offset in range(1, 60):  # look back up to 60 days
        d = today - timedelta(days=offset)
        d_iso = d.isoformat()
        # Compute how many doses were scheduled for that day
        scheduled = 0
        for p in prescriptions:
            if not prescription_active(p, d):
                continue
            for m in p["medications"]:
                scheduled += len(m["times"])
        if scheduled == 0:
            # No prescription that day — streak breaks (nothing to be adherent about)
            break
        taken = await db.dose_logs.count_documents({"patient_id": patient_id, "date": d_iso})
        if taken >= scheduled:
            streak += 1
        else:
            break
    return streak


class TakeDoseIn(BaseModel):
    prescription_id: str
    med_index: int
    time: str  # HH:MM


@api.post("/medicines/take")
async def take_dose(body: TakeDoseIn, user: dict = Depends(require_role("patient"))):
    p = await db.prescriptions.find_one({"id": body.prescription_id, "patient_id": user["id"]}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Prescription not found")
    try:
        med = p["medications"][body.med_index]
    except (IndexError, KeyError):
        raise HTTPException(400, "Invalid med_index")
    if body.time not in med["times"]:
        raise HTTPException(400, "Time not in schedule for this medication")

    today_iso = datetime.now(timezone.utc).date().isoformat()
    key = {
        "patient_id": user["id"],
        "prescription_id": body.prescription_id,
        "med_index": body.med_index,
        "time": body.time,
        "date": today_iso,
    }
    existing = await db.dose_logs.find_one(key, {"_id": 0})
    if existing:
        return {"ok": True, "already_taken": True}

    await db.dose_logs.insert_one({
        "id": new_id(),
        **key,
        "taken_at": now_iso(),
    })
    return {"ok": True}


# ---------- Reception ----------
@api.get("/reception/overview")
async def reception_overview(user: dict = Depends(require_role("reception"))):
    today = datetime.now(timezone.utc).date().isoformat()
    doctors = await db.users.find({"role": "doctor"}, {"_id": 0, "password_hash": 0}).to_list(100)
    out = []
    total = {"booked": 0, "arrived": 0, "in_consult": 0, "completed": 0, "cancelled": 0}
    for d in doctors:
        q = await db.bookings.find({"doctor_id": d["id"], "date": today}, {"_id": 0}).sort("token_number", 1).to_list(100)
        stats = {"booked": 0, "arrived": 0, "in_consult": 0, "completed": 0, "cancelled": 0}
        for b in q:
            stats[b["status"]] = stats.get(b["status"], 0) + 1
            total[b["status"]] = total.get(b["status"], 0) + 1
        out.append({"doctor": d, "queue": q, "stats": stats})
    return {"doctors": out, "total": total, "date": today}


# ---------- Admin Superuser Management ----------
@api.post("/admin/doctors")
async def admin_create_doctor(body: CreateDoctorIn, user: dict = Depends(require_role("admin"))):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    avatar = body.avatar or "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=70"
    
    doctor = {
        "id": new_id(),
        "email": email,
        "name": body.name,
        "role": "doctor",
        "specialty": body.specialty,
        "hospital": body.hospital,
        "fee": body.fee,
        "experience_years": body.experience_years,
        "rating": body.rating,
        "avatar": avatar,
        "phone": body.phone or "",
        "password_hash": hash_password(body.password),
        "created_at": now_iso(),
    }
    await db.users.insert_one(doctor)
    return {"ok": True, "doctor": strip_user({k: v for k, v in doctor.items() if k != "_id"})}


@api.post("/admin/hospitals")
async def admin_create_hospital(body: CreateHospitalIn, user: dict = Depends(require_role("admin"))):
    hospital_name = body.name.strip()
    full_name = f"{hospital_name}, {body.city}"
    hid = hospital_id_from_name(full_name)
    
    h_doc = {
        "id": hid,
        "name": hospital_name,
        "full_name": full_name,
        "city": body.city,
        "area": body.area,
        "rating": body.rating,
        "reviews": body.reviews,
        "image": body.image or "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=800&q=70",
        "tags": body.tags,
        "specialties": body.specialties,
        "min_fee": body.min_fee,
        "created_at": now_iso(),
    }
    await db.hospitals.update_one({"id": hid}, {"$set": h_doc}, upsert=True)
    return {"ok": True, "hospital": h_doc}


@api.get("/admin/hospitals")
async def admin_list_hospitals(user: dict = Depends(require_role("admin"))):
    all_hospitals = await list_hospitals()
    hlist = all_hospitals.get("hospitals", [])
    
    doctors = await db.users.find({"role": "doctor"}, {"_id": 0, "password_hash": 0}).to_list(500)
    bookings = await db.bookings.find({}, {"_id": 0}).to_list(2000)
    
    for h in hlist:
        hid = h["id"]
        h_docs = [d for d in doctors if hospital_id_from_name(d.get("hospital", "")) == hid]
        doc_ids = {d["id"] for d in h_docs}
        
        h_bookings = [b for b in bookings if b.get("doctor_id") in doc_ids]
        completed = [b for b in h_bookings if b.get("status") == "completed"]
        cancelled = [b for b in h_bookings if b.get("status") == "cancelled"]
        
        total_rev = sum(b.get("deposit_paid", 100) * 5 for b in completed)
        
        h["doctors"] = h_docs
        h["total_bookings"] = len(h_bookings)
        h["completed_bookings"] = len(completed)
        h["cancelled_bookings"] = len(cancelled)
        h["revenue"] = total_rev
    
    return {"hospitals": hlist}


@api.put("/admin/hospitals/{hospital_id}")
async def admin_update_hospital(hospital_id: str, body: CreateHospitalIn, user: dict = Depends(require_role("admin"))):
    hospital_name = body.name.strip()
    full_name = f"{hospital_name}, {body.city}"
    
    h_doc = {
        "id": hospital_id,
        "name": hospital_name,
        "full_name": full_name,
        "city": body.city,
        "area": body.area,
        "rating": body.rating,
        "reviews": body.reviews,
        "image": body.image or "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=800&q=70",
        "tags": body.tags,
        "specialties": body.specialties,
        "min_fee": body.min_fee,
        "updated_at": now_iso(),
    }
    await db.hospitals.update_one({"id": hospital_id}, {"$set": h_doc}, upsert=True)
    return {"ok": True, "hospital": h_doc}


@api.delete("/admin/hospitals/{hospital_id}")
async def admin_delete_hospital(hospital_id: str, user: dict = Depends(require_role("admin"))):
    await db.hospitals.delete_one({"id": hospital_id})
    return {"ok": True, "deleted_id": hospital_id}


@api.get("/admin/hospitals/{hospital_id}/analytics")
async def admin_hospital_analytics(hospital_id: str, user: dict = Depends(require_role("admin"))):
    doctors = await db.users.find({"role": "doctor"}, {"_id": 0, "password_hash": 0}).to_list(500)
    h_docs = [d for d in doctors if hospital_id_from_name(d.get("hospital", "")) == hospital_id]
    doc_ids = {d["id"] for d in h_docs}
    
    bookings = await db.bookings.find({}, {"_id": 0}).to_list(2000)
    h_bookings = [b for b in bookings if b.get("doctor_id") in doc_ids]
    
    status_counts = {"booked": 0, "arrived": 0, "in_consult": 0, "completed": 0, "cancelled": 0}
    revenue = 0
    
    doctor_stats = {}
    for d in h_docs:
        doctor_stats[d["id"]] = {
            "id": d["id"],
            "name": d["name"],
            "specialty": d["specialty"],
            "total_patients": 0,
            "completed": 0,
            "revenue": 0
        }
        
    for b in h_bookings:
        st = b.get("status", "booked")
        status_counts[st] = status_counts.get(st, 0) + 1
        
        did = b.get("doctor_id")
        if did in doctor_stats:
            doctor_stats[did]["total_patients"] += 1
            if st == "completed":
                doctor_stats[did]["completed"] += 1
                doc_fee = next((d.get("fee", 500) for d in h_docs if d["id"] == did), 500)
                doctor_stats[did]["revenue"] += doc_fee
                revenue += doc_fee
                
    no_show_rate = round((status_counts["cancelled"] / max(1, len(h_bookings))) * 100, 1)
    
    return {
        "hospital_id": hospital_id,
        "total_doctors": len(h_docs),
        "total_bookings": len(h_bookings),
        "status_counts": status_counts,
        "total_revenue": revenue,
        "no_show_rate": no_show_rate,
        "doctor_performance": list(doctor_stats.values())
    }


@api.get("/admin/users")
async def admin_list_users(user: dict = Depends(require_role("admin"))):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    return {"users": users}


# ---------- Seed ----------
async def seed():
    await db.check_connection()
    await db.users.create_index("email", unique=True)
    await db.bookings.create_index([("doctor_id", 1), ("date", 1), ("slot_time", 1)])

    demo_users = [
        {"email": "patient@nirog.in", "name": "Rahul Sharma", "role": "patient", "phone": "+91 98765 43210", "wallet_balance": 2000},
        # Sanjeevani Clinic, Bengaluru
        {"email": "kavya@nirog.in", "name": "Dr. Kavya Iyer", "role": "doctor", "specialty": "General Physician", "hospital": "Sanjeevani Clinic, Bengaluru", "fee": 500, "experience_years": 12, "rating": 4.7, "avatar": "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=70"},
        {"email": "rohan@nirog.in", "name": "Dr. Rohan Desai", "role": "doctor", "specialty": "Dermatologist", "hospital": "Sanjeevani Clinic, Bengaluru", "fee": 700, "experience_years": 8, "rating": 4.5, "avatar": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=70"},
        {"email": "sneha@nirog.in", "name": "Dr. Sneha Rao", "role": "doctor", "specialty": "ENT Specialist", "hospital": "Sanjeevani Clinic, Bengaluru", "fee": 650, "experience_years": 10, "rating": 4.6, "avatar": "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&w=400&q=70"},
        # Aarogya Care, Pune
        {"email": "arjun@nirog.in", "name": "Dr. Arjun Mehta", "role": "doctor", "specialty": "Cardiologist", "hospital": "Aarogya Care, Pune", "fee": 900, "experience_years": 18, "rating": 4.9, "avatar": "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=70"},
        {"email": "priya@nirog.in", "name": "Dr. Priya Kulkarni", "role": "doctor", "specialty": "Endocrinologist", "hospital": "Aarogya Care, Pune", "fee": 800, "experience_years": 14, "rating": 4.8, "avatar": "https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=400&q=70"},
        # Meera Multispeciality, Chennai
        {"email": "nisha@nirog.in", "name": "Dr. Nisha Rao", "role": "doctor", "specialty": "Pediatrician", "hospital": "Meera Multispeciality, Chennai", "fee": 600, "experience_years": 11, "rating": 4.7, "avatar": "https://images.unsplash.com/photo-1614608682850-e0d6ed316d47?auto=format&fit=crop&w=400&q=70"},
        {"email": "vikram@nirog.in", "name": "Dr. Vikram Sinha", "role": "doctor", "specialty": "Orthopedic", "hospital": "Meera Multispeciality, Chennai", "fee": 750, "experience_years": 15, "rating": 4.6, "avatar": "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&q=70"},
        {"email": "admin@nirog.in", "name": "System Superuser", "role": "admin"},
        {"email": "superadmin@nirog.in", "name": "System Superuser", "role": "admin"},
        {"email": "reception@nirog.in", "name": "Clinic Receptionist", "role": "reception"},
    ]
    default_pw = "nirog1234"
    for u in demo_users:
        existing = await db.users.find_one({"email": u["email"]})
        if existing:
            update_fields = {}
            # Ensure password matches default in case of change
            if not verify_password(default_pw, existing.get("password_hash", "")):
                update_fields["password_hash"] = hash_password(default_pw)
            # Backfill new doctor fields (avatar, experience_years, rating) on existing docs
            for k in ("avatar", "experience_years", "rating", "specialty", "hospital", "fee", "phone", "wallet_balance"):
                if k in u and existing.get(k) != u[k] and existing.get(k) in (None, "", 0):
                    update_fields[k] = u[k]
            if update_fields:
                await db.users.update_one({"email": u["email"]}, {"$set": update_fields})
            continue
        u["id"] = new_id()
        u["password_hash"] = hash_password(default_pw)
        u["created_at"] = now_iso()
        await db.users.insert_one(u)

    demo_hospitals = [
        {
            "id": "sanjeevani-clinic-bengaluru",
            "name": "Sanjeevani Multispeciality Hospital",
            "full_name": "Sanjeevani Clinic, Bengaluru",
            "city": "Bengaluru",
            "area": "Indiranagar",
            "rating": 4.8,
            "reviews": 480,
            "image": "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=800&q=70",
            "tags": ["24x7 Emergency", "ICU", "NABH Accredited"],
            "specialties": ["General Physician", "Dermatology", "ENT", "Cardiology"],
            "min_fee": 500.0,
        },
        {
            "id": "aarogya-care-pune",
            "name": "Aarogya Care Specialty Hospital",
            "full_name": "Aarogya Care, Pune",
            "city": "Pune",
            "area": "Koregaon Park",
            "rating": 4.7,
            "reviews": 320,
            "image": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=70",
            "tags": ["Super Specialty", "Cath Lab", "Radiology"],
            "specialties": ["Cardiology", "Endocrinology", "Diabetology"],
            "min_fee": 800.0,
        },
        {
            "id": "meera-multispeciality-chennai",
            "name": "Meera Medical Center",
            "full_name": "Meera Multispeciality, Chennai",
            "city": "Chennai",
            "area": "T. Nagar",
            "rating": 4.6,
            "reviews": 634,
            "image": "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=70",
            "tags": ["Pediatrics", "Orthopedics", "24x7 Pharmacy"],
            "specialties": ["Pediatrics", "Orthopedics", "Physiotherapy"],
            "min_fee": 600.0,
        },
        {
            "id": "fortis-healthcare-bengaluru",
            "name": "Fortis Healthcare Center",
            "full_name": "Fortis Healthcare, Bengaluru",
            "city": "Bengaluru",
            "area": "Koramangala",
            "rating": 4.9,
            "reviews": 510,
            "image": "https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=800&q=70",
            "tags": ["JCI Accredited", "Organ Transplant", "Oncology"],
            "specialties": ["Neurology", "Cardiology", "Oncology"],
            "min_fee": 750.0,
        },
    ]
    for h in demo_hospitals:
        await db.hospitals.update_one({"id": h["id"]}, {"$set": h}, upsert=True)

    # Seed a few bookings for today so the doctor & reception dashboards have data
    today = datetime.now(timezone.utc).date().isoformat()
    kavya = await db.users.find_one({"email": "kavya@nirog.in"}, {"_id": 0})
    patient = await db.users.find_one({"email": "patient@nirog.in"}, {"_id": 0})
    existing = await db.bookings.find_one({"doctor_id": kavya["id"], "date": today})
    if existing is None and kavya and patient:
        demo_bookings = [
            {"slot": "09:00", "name": "Priya Nair", "status": "completed", "token": 1},
            {"slot": "09:15", "name": "Anjali Menon", "status": "completed", "token": 2},
            {"slot": "09:30", "name": "Ravi Kumar", "status": "in_consult", "token": 3},
            {"slot": "09:45", "name": "Neha Patel", "status": "arrived", "token": 4},
            {"slot": "10:00", "name": "Amit Verma", "status": "booked", "token": 5},
        ]
        for d in demo_bookings:
            await db.bookings.insert_one({
                "id": new_id(),
                "patient_id": patient["id"] if d["token"] == 5 else new_id(),
                "patient_name": d["name"],
                "patient_phone": "+91 90000 0000" + str(d["token"]),
                "doctor_id": kavya["id"],
                "doctor_name": kavya["name"],
                "doctor_specialty": kavya["specialty"],
                "hospital": kavya["hospital"],
                "date": today,
                "slot_time": d["slot"],
                "token_number": d["token"],
                "status": d["status"],
                "deposit_paid": 100,
                "fee_total": 500,
                "running_late": False,
                "delay_minutes": 0,
                "created_at": now_iso(),
                "arrived_at": now_iso() if d["status"] != "booked" else None,
            })

    logger.info("Seed complete")


@app.on_event("startup")
async def on_start():
    try:
        await seed()
    except Exception as exc:
        logger.error(f"Seed failed (non-fatal, app still starts): {exc}", exc_info=True)


@api.get("/")
async def root():
    return {"message": "NirogPath API is live"}


@api.get("/health")
async def health():
    import sys, platform, ssl, subprocess, pathlib
    conf_path = os.environ.get("OPENSSL_CONF", "NOT SET")
    conf_contents = "NOT READ"
    if conf_path != "NOT SET":
        try:
            conf_contents = pathlib.Path(conf_path).read_text()[:500]
        except Exception as _e:
            conf_contents = f"ERROR reading: {_e}"
    result = {
        "status": "ok",
        "python": sys.version,
        "platform": platform.platform(),
        "openssl": ssl.OPENSSL_VERSION,
        "mongo_url_prefix": mongo_url[:30] + "..." if mongo_url else "NOT SET",
        "db_name": os.environ.get("DB_NAME", "NOT SET"),
        "jwt_secret_set": bool(os.environ.get("JWT_SECRET")),
        "cwd": os.getcwd(),
        "server_file": __file__,
        "openssl_conf_env": conf_path,
        "openssl_conf_file": conf_contents,
    }
    import ssl as _ssl, socket as _sock
    _atlas = "ac-kvfbps5-shard-00-00.8q8bvl8.mongodb.net"
    _tests = [
        (_atlas, 27017, _atlas, "atlas_27017"),
        ("www.google.com", 443, "www.google.com", "google_443"),
    ]
    for _h, _p, _sni, _label in _tests:
        try:
            _ctx = _ssl.SSLContext(_ssl.PROTOCOL_TLS_CLIENT)
            _ctx.check_hostname = False
            _ctx.verify_mode = _ssl.CERT_NONE
            _conn = _ctx.wrap_socket(
                _sock.create_connection((_h, _p), timeout=5),
                server_hostname=_sni,
            )
            result[f"tls_{_label}"] = f"ok proto={_conn.version()} cipher={_conn.cipher()[0]}"
            _conn.close()
        except Exception as _e:
            result[f"tls_{_label}"] = f"ERROR: {_e}"
    # openssl binary version
    try:
        _rv = subprocess.run(["openssl", "version"], timeout=5, capture_output=True, text=True)
        result["openssl_bin_version"] = (_rv.stdout + _rv.stderr).strip()
    except Exception as _e:
        result["openssl_bin_version"] = f"ERROR: {_e}"
    # Test openssl s_client: default (TLS 1.3 allowed)
    _classical_sigalgs = (
        "ECDSA+SHA256:ECDSA+SHA384:ECDSA+SHA512:"
        "RSA+SHA256:RSA+SHA384:RSA+SHA512:"
        "RSA-PSS+SHA256:RSA-PSS+SHA384:RSA-PSS+SHA512:"
        "ed25519:ed448"
    )
    for _extra, _label in [
        ([], "default"),
        (["-no_tls1_3"], "no_tls1_3"),
        (["-tls1_2"], "tls1_2"),
        (["-groups", "x25519:P-256"], "groups_restricted"),
        (["-sigalgs", _classical_sigalgs], "classical_sigalgs"),
        (["-sigalgs", _classical_sigalgs, "-no_tls1_3"], "classical_sigalgs_tls12"),
    ]:
        try:
            _r = subprocess.run(
                ["openssl", "s_client", "-connect", f"{_atlas}:27017",
                 "-ign_eof"] + _extra,
                timeout=8, capture_output=True, text=True, stdin=subprocess.DEVNULL,
            )
            _out = (_r.stdout + _r.stderr)[:400]
            result[f"openssl_sclient_{_label}"] = _out
        except Exception as _e:
            result[f"openssl_sclient_{_label}"] = f"ERROR: {_e}"
    # Python TLS: OP_NO_TLSv1_3
    try:
        _ctx2 = _ssl.SSLContext(_ssl.PROTOCOL_TLS_CLIENT)
        _ctx2.check_hostname = False
        _ctx2.verify_mode = _ssl.CERT_NONE
        _ctx2.options |= _ssl.OP_NO_TLSv1_3
        _conn2 = _ctx2.wrap_socket(
            _sock.create_connection((_atlas, 27017), timeout=5),
            server_hostname=_atlas,
        )
        result["tls_atlas_no_tls13"] = f"ok proto={_conn2.version()} cipher={_conn2.cipher()[0]}"
        _conn2.close()
    except Exception as _e:
        result["tls_atlas_no_tls13"] = f"ERROR: {_e}"
    try:
        await db.command("ping")
        result["mongo"] = "reachable"
    except Exception as exc:
        result["mongo"] = f"ERROR: {exc}"
    return result


app.include_router(api)

# Auto-discover feature routers from routes/ directory
import importlib
import glob as _glob
import os as _os
_routes_dir = _os.path.join(_os.path.dirname(__file__), "routes")
for _fpath in sorted(_glob.glob(_os.path.join(_routes_dir, "*.py"))):
    _modname = _os.path.basename(_fpath)[:-3]
    if _modname.startswith("_"):
        continue
    try:
        _mod = importlib.import_module(f"routes.{_modname}")
        if hasattr(_mod, "router"):
            app.include_router(_mod.router)
            logger.info(f"Loaded router: routes.{_modname}")
    except Exception as _e:
        logger.error(f"Failed to load routes.{_modname}: {_e}")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    await db.seed_if_needed()


@app.on_event("shutdown")
async def shutdown_db_client():
    pass
