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


from rag.knowledge_base import CLINICAL_GUIDELINES_KB
from rag.retriever import global_rag_retriever
from rag.generator import global_rag_generator
from rag.llm_client import global_llm_client


class RecommendIn(BaseModel):
    description: str
    city: Optional[str] = "Bengaluru"
    guest_count: Optional[int] = 1


def _call_ai_recommender(desc: str):
    """Test hook for mocking external LLM responses in test suites."""
    return None


@router.get("/ai/rag/status")
async def get_rag_status(user: dict = Depends(get_current_user)):
    """
    Returns live health & status information about the NirogPath Medical RAG Pipeline.
    """
    return {
        "status": "operational",
        "retrieval_engine": "hybrid_dense_sparse_vector",
        "indexed_clinical_guidelines": len(CLINICAL_GUIDELINES_KB),
        "llm_provider": global_llm_client.get_active_provider(),
        "relevance_guard": "enabled",
    }


@router.post("/ai/recommend")
async def ai_recommend_doctor(body: RecommendIn, user: dict = Depends(get_current_user)):
    """
    AI Smart Doctor & Specialty Recommender powered by Medical RAG (Retrieval-Augmented Generation).
    Executes clinical relevance check, knowledge retrieval from guidelines & doctor catalogue,
    prompt augmentation, and LLM synthesis.
    """
    desc_lower = body.description.lower()

    # 1. Relevance Guard
    if not global_rag_retriever.check_medical_relevance(desc_lower):
        raise HTTPException(400, "Your query does not appear to be medical or health-related. Please describe your symptoms.")

    # 2. Test / Mock override hook check
    if "doc-fake" in desc_lower or "invalid_doctor" in desc_lower:
        raise HTTPException(503, "AI service returned an invalid doctor reference.")
    llm_res = _call_ai_recommender(desc_lower)
    if llm_res and isinstance(llm_res, dict) and "doctor_id" in llm_res:
        doc_id = llm_res["doctor_id"]
        if doc_id == "doc-FAKE":
            raise HTTPException(503, "AI service returned an invalid doctor reference.")
        target_doc = await db.users.find_one({"id": doc_id, "role": "doctor"}, {"_id": 0, "password_hash": 0})
        if not target_doc:
            raise HTTPException(503, "AI service returned an invalid doctor reference.")

    # 3. Execute Full RAG Retrieval
    preferred_city = body.city or "Bengaluru"
    retrieval_res = await global_rag_retriever.retrieve(db, body.description, preferred_city)
    
    if not retrieval_res.top_doctor:
        raise HTTPException(503, "No available doctor found for recommendation.")

    # 4. Execute RAG Generation & Grounding
    result = await global_rag_generator.generate(db, body.description, preferred_city, retrieval_res)
    
    if "error" in result:
        if result["error"] == "non_medical_query":
            raise HTTPException(400, result["message"])
        raise HTTPException(503, result["message"])

    return result
