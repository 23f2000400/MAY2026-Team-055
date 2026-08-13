"""Shared state and utilities for NirogPath FastAPI routes."""
import os
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
import logging

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient
import mongomock_motor
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
logger = logging.getLogger("nirogpath.config")

class SmartDB:
    def __init__(self):
        self._db_name = os.environ.get("DB_NAME", "nirogpath")
        self._real_client = AsyncIOMotorClient(
            mongo_url,
            serverSelectionTimeoutMS=1000,
            connectTimeoutMS=1000,
            socketTimeoutMS=1000,
            tlsAllowInvalidCertificates=True,
        )
        self._mock_client = mongomock_motor.AsyncMongoMockClient()
        self._use_mock = os.environ.get("USE_MOCK_DB", "").lower() in ("true", "1")
        self._seeded = False

    async def check_connection(self):
        if not self._use_mock:
            try:
                await self._real_client.admin.command("ping")
                logger.info("Connected to real MongoDB")
            except Exception as e:
                logger.warning(f"MongoDB ping failed ({e}), using in-memory mock database")
                self._use_mock = True

    def get_db(self):
        if self._use_mock:
            return self._mock_client[self._db_name]
        return self._real_client[self._db_name]

    def __getattr__(self, name):
        return getattr(self.get_db(), name)

    def __getitem__(self, name):
        return self.get_db()[name]

    async def seed_if_needed(self):
        await self.check_connection()
        try:
            target_db = self.get_db()
            count = await target_db.users.count_documents({})
            if count == 0:
                pw_hash = bcrypt.hashpw("nirog1234".encode(), bcrypt.gensalt()).decode()
                now = datetime.now(timezone.utc).isoformat()
                demo_users = [
                    {
                        "id": "p-1",
                        "email": "patient@nirog.in",
                        "name": "Aarav Sharma",
                        "phone": "+91 98765 43210",
                        "role": "patient",
                        "wallet_balance": 2000,
                        "password_hash": pw_hash,
                        "created_at": now,
                    },
                    {
                        "id": "d-1",
                        "email": "kavya@nirog.in",
                        "name": "Dr. Kavya Nair",
                        "specialty": "Cardiologist",
                        "experience_years": 12,
                        "fee": 800,
                        "hospital": "Sanjeevani Clinic, Bengaluru",
                        "role": "doctor",
                        "phone": "+91 98765 11111",
                        "password_hash": pw_hash,
                        "created_at": now,
                    },
                    {
                        "id": "d-2",
                        "email": "rohit@nirog.in",
                        "name": "Dr. Rohit Verma",
                        "specialty": "Pediatrician",
                        "experience_years": 8,
                        "fee": 600,
                        "hospital": "Aarogya Care, Pune",
                        "role": "doctor",
                        "phone": "+91 98765 22222",
                        "password_hash": pw_hash,
                        "created_at": now,
                    },
                    {
                        "id": "d-3",
                        "email": "ananya@nirog.in",
                        "name": "Dr. Ananya Iyer",
                        "specialty": "Dermatologist",
                        "experience_years": 10,
                        "fee": 700,
                        "hospital": "Meera Multispeciality, Chennai",
                        "role": "doctor",
                        "phone": "+91 98765 33333",
                        "password_hash": pw_hash,
                        "created_at": now,
                    },
                    {
                        "id": "r-1",
                        "email": "admin@nirog.in",
                        "name": "Reception Admin",
                        "hospital": "Sanjeevani Clinic, Bengaluru",
                        "role": "reception",
                        "phone": "+91 80 4567 8901",
                        "password_hash": pw_hash,
                        "created_at": now,
                    },
                    {
                        "id": "c-1",
                        "email": "ceo@nirog.in",
                        "name": "CEO Admin",
                        "role": "ceo",
                        "phone": "+91 99999 00000",
                        "password_hash": pw_hash,
                        "created_at": now,
                    },
                ]
                await target_db.users.insert_many(demo_users)
                logger.info("Seeded demo users into database")
        except Exception as e:
            logger.warning(f"Failed to seed demo users: {e}")

db = SmartDB()

JWT_SECRET = os.environ.get("JWT_SECRET") or "nirogpath-dev-secret-change-in-production-64chars-abcdef0123456789"
JWT_ALGORITHM = "HS256"

HOSPITAL_META = {
    "Sanjeevani Clinic, Bengaluru": {
        "city": "Bengaluru", "area": "Indiranagar", "rating": 4.6, "reviews": 812,
        "image": "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=800&q=70",
        "tags": ["Multi-speciality", "24×7 pharmacy"],
        "address": "12, Indiranagar 100 Feet Rd, Bengaluru, Karnataka 560038",
        "phone": "+91 80 4567 8901",
        "opening_hours": {"mon": "09:00-20:00", "tue": "09:00-20:00", "wed": "09:00-20:00",
                          "thu": "09:00-20:00", "fri": "09:00-20:00", "sat": "09:00-17:00", "sun": "closed"},
        "gallery": [
            "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=800&q=70",
            "https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=800&q=70",
            "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=70",
            "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=70",
            "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=70",
        ],
    },
    "Aarogya Care, Pune": {
        "city": "Pune", "area": "Kothrud", "rating": 4.8, "reviews": 1204,
        "image": "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=70",
        "tags": ["Cardiac unit", "In-house lab"],
        "address": "Plot 45, Kothrud, Pune, Maharashtra 411038",
        "phone": "+91 20 2456 7890",
        "opening_hours": {"mon": "08:00-21:00", "tue": "08:00-21:00", "wed": "08:00-21:00",
                          "thu": "08:00-21:00", "fri": "08:00-21:00", "sat": "08:00-18:00", "sun": "10:00-14:00"},
        "gallery": [
            "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=70",
            "https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=800&q=70",
            "https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?auto=format&fit=crop&w=800&q=70",
            "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&w=800&q=70",
            "https://images.unsplash.com/photo-1504439468489-c8920d796a29?auto=format&fit=crop&w=800&q=70",
        ],
    },
    "Meera Multispeciality, Chennai": {
        "city": "Chennai", "area": "T. Nagar", "rating": 4.5, "reviews": 634,
        "image": "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=70",
        "tags": ["Child-friendly", "Vaccination"],
        "address": "56, Usman Rd, T. Nagar, Chennai, Tamil Nadu 600017",
        "phone": "+91 44 2834 5678",
        "opening_hours": {"mon": "09:00-19:00", "tue": "09:00-19:00", "wed": "09:00-19:00",
                          "thu": "09:00-19:00", "fri": "09:00-19:00", "sat": "09:00-15:00", "sun": "closed"},
        "gallery": [
            "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=800&q=70",
            "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&w=800&q=70",
            "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=70",
            "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=70",
            "https://images.unsplash.com/photo-1583947581924-860bda6a26df?auto=format&fit=crop&w=800&q=70",
        ],
    },
}


def hospital_id_from_name(name: str) -> str:
    return name.lower().replace(",", "").replace(" ", "-").strip("-")


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def make_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id, "email": email, "role": role,
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
    if not user and payload.get("email"):
        user = await db.users.find_one({"email": payload["email"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return strip_user(user)


def require_role(*roles: str):
    async def dep(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return dep


def booking_dict(b: dict) -> dict:
    return {k: v for k, v in b.items() if k != "_id"}


def slot_time_to_sort_key(slot_time: str, created_at: str = "") -> tuple:
    """Returns a tuple (time_in_minutes, created_at) for sorting doctor queues chronologically."""
    s = (slot_time or "").strip().lower()
    try:
        if "walk-in" in s or "walkin" in s:
            c_time = datetime.fromisoformat(created_at) if created_at else datetime.now(timezone.utc)
            mins = c_time.hour * 60 + c_time.minute
            return (mins, created_at or "")
        is_pm = "pm" in s
        is_am = "am" in s
        clean = s.replace("am", "").replace("pm", "").strip()
        parts = clean.split(":")
        hh = int(parts[0])
        mm = int(parts[1]) if len(parts) > 1 else 0
        if is_pm and hh < 12:
            hh += 12
        elif is_am and hh == 12:
            hh = 0
        return (hh * 60 + mm, created_at or "")
    except Exception:
        return (9999, created_at or "")


async def reindex_doctor_queue(doctor_id: str, date: str):
    """
    Re-indexes token numbers (1, 2, 3...) for all active (non-cancelled) bookings
    for a doctor on a given date, ordered by:
    1. Slot time chronologically (e.g. 09:00 AM < 10:00 AM < 11:00 AM)
    2. Created timestamp (earlier booking gets priority for same slot)
    """
    if not doctor_id or not date:
        return []

    await db.check_connection()
    active_bookings = await db.bookings.find(
        {"doctor_id": doctor_id, "date": date, "status": {"$ne": "cancelled"}},
        {"_id": 0}
    ).to_list(500)

    # Sort by slot_time_to_sort_key
    active_bookings.sort(key=lambda b: slot_time_to_sort_key(b.get("slot_time", ""), b.get("created_at", "")))

    # Re-assign sequential tokens starting from 1
    for index, booking in enumerate(active_bookings, start=1):
        new_token = index
        if booking.get("token_number") != new_token:
            booking["token_number"] = new_token
            await db.bookings.update_one(
                {"id": booking["id"]},
                {"$set": {"token_number": new_token}}
            )

    return active_bookings
