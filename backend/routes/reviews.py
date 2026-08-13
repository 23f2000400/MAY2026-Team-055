# INTEGRATION: Auto-discovered by server.py from routes/ directory
# Post-Visit Reviews & Ratings (Feature 17)
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from config import db, get_current_user, require_role, new_id, now_iso, hospital_id_from_name

router = APIRouter(prefix="/api")

# ---------- Index ----------

_index_created = False


async def ensure_index():
    global _index_created
    if not _index_created:
        await db.reviews.create_index("booking_id", unique=True)
        _index_created = True


# ---------- Models ----------

class ReviewIn(BaseModel):
    booking_id: str
    rating: int = Field(..., ge=1, le=5)
    body: Optional[str] = Field(None, max_length=280)
    tags: Optional[List[str]] = Field(default_factory=list)


class ReplyIn(BaseModel):
    reply: str = Field(..., max_length=240)


# ---------- Helper ----------

def _clean(doc: dict) -> dict:
    """Strip MongoDB _id from a document."""
    return {k: v for k, v in doc.items() if k != "_id"}


async def _update_doctor_aggregate(doctor_id: str):
    """Recompute and persist mean rating + review count for a doctor."""
    pipeline = [
        {"$match": {"doctor_id": doctor_id}},
        {"$group": {"_id": None, "mean": {"$avg": "$rating"}, "count": {"$sum": 1}}},
    ]
    result = await db.reviews.aggregate(pipeline).to_list(1)
    if result:
        mean_rating = round(result[0]["mean"], 2)
        count = result[0]["count"]
    else:
        mean_rating = 0.0
        count = 0
    await db.users.update_one(
        {"id": doctor_id},
        {"$set": {"rating": mean_rating, "reviews_count": count}},
    )


# ---------- Endpoints ----------

@router.post("/reviews")
async def create_review(body: ReviewIn, user: dict = Depends(require_role("patient"))):
    await ensure_index()

    # Verify booking belongs to this patient and is completed
    booking = await db.bookings.find_one(
        {"id": body.booking_id, "patient_id": user["id"]},
        {"_id": 0},
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Can only review completed bookings")

    # Enforce one review per booking (unique index will also guard this)
    existing = await db.reviews.find_one({"booking_id": body.booking_id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=409, detail="Review already submitted for this booking")

    review = {
        "id": new_id(),
        "booking_id": body.booking_id,
        "patient_id": user["id"],
        "patient_name": user.get("name", "Patient"),
        "doctor_id": booking.get("doctor_id", ""),
        "hospital_id": hospital_id_from_name(booking.get("hospital", "")) if booking.get("hospital") else "",
        "rating": body.rating,
        "body": body.body or "",
        "tags": body.tags or [],
        "doctor_reply": None,
        "doctor_replied_at": None,
        "reported": False,
        "created_at": now_iso(),
    }

    try:
        await db.reviews.insert_one(review)
    except Exception:
        raise HTTPException(status_code=409, detail="Review already submitted for this booking")

    await _update_doctor_aggregate(review["doctor_id"])

    return {"review": _clean(review)}


@router.get("/doctors/{doctor_id}/reviews")
async def get_doctor_reviews(
    doctor_id: str,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    total = await db.reviews.count_documents({"doctor_id": doctor_id})
    cursor = (
        db.reviews.find({"doctor_id": doctor_id}, {"_id": 0})
        .sort("created_at", -1)
        .skip(offset)
        .limit(limit)
    )
    reviews = await cursor.to_list(limit)
    return {"reviews": reviews, "total": total}


@router.get("/hospitals/{hospital_id}/reviews")
async def get_hospital_reviews(
    hospital_id: str,
    limit: int = Query(10, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    total = await db.reviews.count_documents({"hospital_id": hospital_id})
    cursor = (
        db.reviews.find({"hospital_id": hospital_id}, {"_id": 0})
        .sort("created_at", -1)
        .skip(offset)
        .limit(limit)
    )
    reviews = await cursor.to_list(limit)
    return {"reviews": reviews, "total": total}


@router.post("/reviews/{review_id}/reply")
async def reply_to_review(
    review_id: str,
    body: ReplyIn,
    user: dict = Depends(require_role("doctor")),
):
    review = await db.reviews.find_one({"id": review_id}, {"_id": 0})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    # Verify logged-in doctor was the one on the reviewed booking
    booking = await db.bookings.find_one(
        {"id": review["booking_id"], "doctor_id": user["id"]},
        {"_id": 0},
    )
    if not booking:
        raise HTTPException(status_code=403, detail="Not your review to reply to")

    now = now_iso()
    await db.reviews.update_one(
        {"id": review_id},
        {"$set": {"doctor_reply": body.reply, "doctor_replied_at": now}},
    )

    updated = await db.reviews.find_one({"id": review_id}, {"_id": 0})
    return {"review": updated}


@router.post("/reviews/{review_id}/report")
async def report_review(
    review_id: str,
    user: dict = Depends(get_current_user),
):
    review = await db.reviews.find_one({"id": review_id}, {"_id": 0})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    await db.reviews.update_one({"id": review_id}, {"$set": {"reported": True}})

    report_doc = {
        "id": new_id(),
        "review_id": review_id,
        "reported_by": user["id"],
        "created_at": now_iso(),
    }
    await db.reports.insert_one(report_doc)

    return {"ok": True}


@router.get("/doctor/reviews")
async def get_my_doctor_reviews(
    rating: Optional[str] = Query(None),
    responded: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    user: dict = Depends(require_role("doctor")),
):
    query: dict = {"doctor_id": user["id"]}

    if rating:
        try:
            query["rating"] = int(rating)
        except ValueError:
            pass

    if responded == "true":
        query["doctor_reply"] = {"$ne": None}
    elif responded == "false":
        query["doctor_reply"] = None

    total = await db.reviews.count_documents(query)
    cursor = (
        db.reviews.find(query, {"_id": 0})
        .sort("created_at", -1)
        .skip(offset)
        .limit(limit)
    )
    reviews = await cursor.to_list(limit)
    return {"reviews": reviews, "total": total}
