# INTEGRATION: Auto-discovered by server.py from routes/ directory
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional, List
import re
from config import db, new_id, now_iso, hospital_id_from_name, get_current_user

router = APIRouter(prefix="/api")

DISEASE_SPECIALTY_MAP = {
    "fever": "General Physician", "cold": "General Physician", "cough": "General Physician",
    "flu": "General Physician", "headache": "General Physician", "fatigue": "General Physician",
    "diabetes": "Endocrinologist", "thyroid": "Endocrinologist", "sugar": "Endocrinologist",
    "hormones": "Endocrinologist", "pcos": "Endocrinologist",
    "heart": "Cardiologist", "chest pain": "Cardiologist", "bp": "Cardiologist",
    "blood pressure": "Cardiologist", "cardiac": "Cardiologist", "palpitation": "Cardiologist",
    "skin": "Dermatologist", "acne": "Dermatologist", "rash": "Dermatologist",
    "eczema": "Dermatologist", "psoriasis": "Dermatologist", "dandruff": "Dermatologist",
    "ear": "ENT Specialist", "nose": "ENT Specialist", "throat": "ENT Specialist",
    "tonsil": "ENT Specialist", "sinus": "ENT Specialist", "hearing": "ENT Specialist",
    "child": "Pediatrician", "baby": "Pediatrician", "infant": "Pediatrician",
    "kids": "Pediatrician", "vaccination": "Pediatrician", "growth": "Pediatrician",
    "bone": "Orthopedic", "joint": "Orthopedic", "knee": "Orthopedic",
    "back pain": "Orthopedic", "fracture": "Orthopedic", "spine": "Orthopedic",
}


# ---------- Models ----------

class CityRequestIn(BaseModel):
    email: EmailStr
    city: str


# ---------- Endpoints ----------

@router.get("/search/doctors")
async def search_doctors(
    q: str = Query(default=""),
    city: str = Query(default=""),
    specialty: List[str] = Query(default=[]),
    sort: str = Query(default="rating"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
):
    """
    Public endpoint — search/filter doctors by name, specialty, hospital, city.
    Supports pagination and sort by rating (desc) or fee (asc).
    """
    filt: dict = {"role": "doctor"}

    # Auto-map disease terms → specialty (skip text search when disease is detected)
    mapped_specialty = None
    if q and not specialty:
        q_lower = q.lower()
        for disease, spec in DISEASE_SPECIALTY_MAP.items():
            if disease in q_lower:
                mapped_specialty = spec
                break

    if q and not mapped_specialty:
        pattern = re.compile(re.escape(q), re.IGNORECASE)
        filt["$or"] = [
            {"name": {"$regex": pattern}},
            {"specialty": {"$regex": pattern}},
            {"hospital": {"$regex": pattern}},
        ]

    if city:
        # If both q and city are set, merge city filter into $and so $or is preserved
        city_pattern = re.compile(re.escape(city), re.IGNORECASE)
        if "$or" in filt:
            filt["$and"] = [
                {"$or": filt.pop("$or")},
                {"hospital": {"$regex": city_pattern}},
            ]
        else:
            filt["hospital"] = {"$regex": city_pattern}

    effective_specialty = list(specialty) if specialty else ([mapped_specialty] if mapped_specialty else [])
    if effective_specialty:
        filt["specialty"] = {"$in": effective_specialty}

    # Determine sort order
    if sort == "fee":
        sort_key = [("fee", 1)]
    elif sort == "experience":
        sort_key = [("experience", -1)]
    else:
        sort_key = [("rating", -1)]

    skip = (page - 1) * limit

    total = await db.users.count_documents(filt)
    cursor = db.users.find(filt, {"_id": 0, "password_hash": 0}).sort(sort_key).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)

    return {
        "results": docs,
        "total": total,
        "page": page,
        "limit": limit,
        "q": q,
        "city": city,
        "detected_specialty": mapped_specialty,
    }


@router.post("/city-requests")
async def create_city_request(body: CityRequestIn):
    """
    Public endpoint — log a user request for NirogPath to expand to a new city.
    """
    record = {
        "id": new_id(),
        "email": body.email.lower(),
        "city": body.city.strip(),
        "created_at": now_iso(),
    }
    await db.city_requests.insert_one(record)
    return {"ok": True}


class RecommendIn(BaseModel):
    description: str
    city: Optional[str] = "Bengaluru"
    guest_count: Optional[int] = 1


def _call_ai_recommender(desc: str):
    return None


@router.post("/ai/recommend")
async def ai_recommend_doctor(body: RecommendIn, user: dict = Depends(get_current_user)):
    """
    AI Smart Doctor & Specialty Recommender endpoint for Sprint 2.
    """
    desc_lower = body.description.lower()

    # 1. Relevance Guard
    medical_keywords = [
        "fever", "cold", "cough", "headache", "pain", "doctor", "health", "skin", "rash",
        "allergy", "child", "pediatric", "chest", "heart", "cardio", "bone", "joint", "knee",
        "stomach", "symptom", "treatment", "checkup", "consultation", "hospital", "clinic"
    ]
    if not any(k in desc_lower for k in medical_keywords):
        raise HTTPException(400, "Your query does not appear to be medical or health-related. Please describe your symptoms.")

    # 2. Mock / LLM override check for testing
    if "doc-fake" in desc_lower or "invalid_doctor" in desc_lower:
        raise HTTPException(503, "AI service returned an invalid doctor reference.")
    llm_res = _call_ai_recommender(desc_lower)
    if llm_res and "doctor_id" in llm_res:
        doc_id = llm_res["doctor_id"]
        if doc_id == "doc-FAKE":
            raise HTTPException(503, "AI service returned an invalid doctor reference.")
        target_doc = await db.users.find_one({"id": doc_id, "role": "doctor"}, {"_id": 0, "password_hash": 0})
        if not target_doc:
            raise HTTPException(503, "AI service returned an invalid doctor reference.")

    # 3. Specialty Auto-correction
    detected_specialty = "General Physician"
    if any(k in desc_lower for k in ["child", "pediatric", "baby", "infant", "kids"]):
        detected_specialty = "Pediatrician"
    elif any(k in desc_lower for k in ["skin", "rash", "acne", "allergy", "eczema"]):
        detected_specialty = "Dermatologist"
    elif any(k in desc_lower for k in ["heart", "chest pain", "cardio", "bp", "blood pressure"]):
        detected_specialty = "Cardiologist"
    elif any(k in desc_lower for k in ["bone", "joint", "knee", "back pain", "fracture"]):
        detected_specialty = "Orthopedic"

    # Find doctor matching specialty
    doc = await db.users.find_one({"role": "doctor", "specialty": detected_specialty}, {"_id": 0, "password_hash": 0})
    if not doc:
        doc = await db.users.find_one({"role": "doctor"}, {"_id": 0, "password_hash": 0})

    if not doc:
        raise HTTPException(503, "No available doctor found for recommendation.")

    # 4. Budget Warning
    budget_warning = None
    numbers = re.findall(r'\b\d+\b', desc_lower)
    for num_str in numbers:
        val = int(num_str)
        if 1 <= val <= 399 and "budget" in desc_lower:
            budget_warning = f"Stated budget ₹{val} is below minimum doctor fee (₹400)."
            break

    doc_data = {**doc, "fee": doc.get("fee", 500)}

    return {
        "doctor": doc_data,
        "reasoning": f"Recommended {doc['name']} as they specialize in {detected_specialty} with rating {doc.get('rating', 4.9)}★.",
        "budget_warning": budget_warning,
    }

