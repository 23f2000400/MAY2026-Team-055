# INTEGRATION: Auto-discovered by server.py from routes/ directory
# Walk-in flag + queue transfer offers (Feature 05)
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from config import db, get_current_user, require_role, new_id, now_iso, booking_dict, reindex_doctor_queue

router = APIRouter(prefix="/api")


# ---------- Models ----------

class WalkinIn(BaseModel):
    patient_name: str
    phone: str
    doctor_id: str
    urgency: str = "routine"  # "urgent" | "routine"


class OfferTransferIn(BaseModel):
    booking_id: str
    target_doctor_id: str


# ---------- Walk-in endpoint ----------

@router.post("/reception/walkin")
async def add_walkin(body: WalkinIn, user: dict = Depends(require_role("reception"))):
    from datetime import datetime, timezone

    if body.urgency not in ("urgent", "routine"):
        raise HTTPException(status_code=400, detail="urgency must be 'urgent' or 'routine'")

    doctor = await db.users.find_one({"id": body.doctor_id, "role": "doctor"}, {"_id": 0, "password_hash": 0})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    user_hospital = user.get("hospital", "").strip()
    if user_hospital and user.get("role") != "admin":
        if doctor.get("hospital") != user_hospital:
            raise HTTPException(status_code=403, detail=f"Cannot register walk-in for a doctor outside assigned hospital ({user_hospital})")

    today = datetime.now(timezone.utc).date().isoformat()

    # Find active queue (sorted by token_number ascending)
    active = await db.bookings.find(
        {"doctor_id": body.doctor_id, "date": today, "status": {"$in": ["booked", "arrived"]}},
        {"_id": 0, "token_number": 1}
    ).sort("token_number", 1).to_list(100)

    if body.urgency == "urgent" and active:
        # Insert right after whoever is currently in_consult (or at position 1 if no one is)
        in_consult = await db.bookings.find_one(
            {"doctor_id": body.doctor_id, "date": today, "status": "in_consult"},
            {"_id": 0, "token_number": 1}
        )
        insert_pos = (in_consult["token_number"] + 1) if in_consult else 1

        # Shift all bookings at or after insert_pos by 1
        await db.bookings.update_many(
            {
                "doctor_id": body.doctor_id,
                "date": today,
                "status": {"$in": ["booked", "arrived"]},
                "token_number": {"$gte": insert_pos},
            },
            {"$inc": {"token_number": 1}}
        )
        token_num = insert_pos
    else:
        # Routine: go to end of queue
        count = await db.bookings.count_documents(
            {"doctor_id": body.doctor_id, "date": today, "status": {"$ne": "cancelled"}}
        )
        token_num = count + 1

    booking = {
        "id": new_id(),
        "patient_id": new_id(),
        "patient_name": body.patient_name,
        "patient_phone": body.phone,
        "doctor_id": body.doctor_id,
        "doctor_name": doctor.get("name"),
        "doctor_specialty": doctor.get("specialty", ""),
        "hospital": doctor.get("hospital", ""),
        "date": today,
        "slot_time": "walk-in",
        "token_number": token_num,
        "status": "arrived",
        "deposit_paid": 0,
        "fee_total": doctor.get("fee", 0),
        "running_late": False,
        "delay_minutes": 0,
        "walkin": True,
        "urgency": body.urgency,
        "created_at": now_iso(),
        "arrived_at": now_iso(),
    }
    await db.bookings.insert_one(booking)
    if body.urgency != "urgent":
        await reindex_doctor_queue(body.doctor_id, today)
        updated = await db.bookings.find_one({"id": booking["id"]}, {"_id": 0})
        if updated:
            booking = updated
    return {"booking": booking_dict(booking)}


# ---------- Transfer candidates ----------

@router.get("/reception/transfer-candidates")
async def transfer_candidates(user: dict = Depends(require_role("reception"))):
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).date().isoformat()

    # Find bookings with running_late=True for today
    late_bookings = await db.bookings.find(
        {"date": today, "running_late": True, "status": {"$in": ["booked", "arrived"]}},
        {"_id": 0}
    ).to_list(100)

    if not late_bookings:
        return {"candidates": []}

    late_doctor_ids = list({b["doctor_id"] for b in late_bookings})
    doc_query = {"id": {"$in": late_doctor_ids}, "role": "doctor"}
    user_hospital = user.get("hospital", "").strip()
    if user_hospital and user.get("role") != "admin":
        doc_query["hospital"] = user_hospital

    late_doctors = await db.users.find(
        doc_query,
        {"_id": 0, "password_hash": 0}
    ).to_list(50)

    candidates = []
    for ld in late_doctors:
        # Find same-specialty, same-hospital doctors who are different
        alts = await db.users.find(
            {
                "role": "doctor",
                "specialty": ld.get("specialty"),
                "hospital": ld.get("hospital"),
                "id": {"$ne": ld["id"]},
            },
            {"_id": 0, "password_hash": 0}
        ).to_list(10)

        alt_with_count = []
        for alt in alts:
            count = await db.bookings.count_documents(
                {"doctor_id": alt["id"], "date": today, "status": {"$in": ["booked", "arrived", "in_consult"]}}
            )
            if count <= 3:
                alt_with_count.append({"doctor": alt, "active_patient_count": count})

        if alt_with_count:
            patients = [b for b in late_bookings if b["doctor_id"] == ld["id"]]
            candidates.append({
                "late_doctor": ld,
                "alt_doctors": alt_with_count,
                "patients_to_offer": patients[:5],
            })

    return {"candidates": candidates}


# ---------- Offer transfer ----------

@router.post("/reception/offer-transfer")
async def offer_transfer(body: OfferTransferIn, user: dict = Depends(require_role("reception", "admin"))):
    booking = await db.bookings.find_one({"id": body.booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    target_doctor = await db.users.find_one(
        {"id": body.target_doctor_id, "role": "doctor"},
        {"_id": 0, "password_hash": 0}
    )
    if not target_doctor:
        raise HTTPException(status_code=404, detail="Target doctor not found")

    # Set transfer_pending_doctor_id on the booking
    await db.bookings.update_one(
        {"id": body.booking_id},
        {"$set": {"transfer_pending_doctor_id": body.target_doctor_id}}
    )

    # Create notification for the patient (if they have a real patient_id — walk-ins won't have one)
    patient_id = booking.get("patient_id")
    if patient_id:
        notification = {
            "id": new_id(),
            "user_id": patient_id,
            "kind": "transfer_offer",
            "payload": {
                "booking_id": body.booking_id,
                "target_doctor_id": body.target_doctor_id,
                "target_doctor_name": target_doctor.get("name", ""),
            },
            "created_at": now_iso(),
            "read_at": None,
        }
        await db.notifications.insert_one(notification)

    return {"ok": True}


# ---------- Accept transfer ----------

@router.post("/bookings/{booking_id}/accept-transfer")
async def accept_transfer(booking_id: str, user: dict = Depends(require_role("patient"))):
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).date().isoformat()

    booking = await db.bookings.find_one({"id": booking_id, "patient_id": user["id"]}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    target_doctor_id = booking.get("transfer_pending_doctor_id")
    if not target_doctor_id:
        raise HTTPException(status_code=400, detail="No transfer offer pending")

    target_doctor = await db.users.find_one(
        {"id": target_doctor_id, "role": "doctor"},
        {"_id": 0, "password_hash": 0}
    )
    if not target_doctor:
        raise HTTPException(status_code=404, detail="Target doctor not found")

    # Assign token at end of target doctor's queue
    count = await db.bookings.count_documents(
        {"doctor_id": target_doctor_id, "date": today, "status": {"$ne": "cancelled"}}
    )
    new_token = count + 1

    # Update booking with new doctor info
    await db.bookings.update_one(
        {"id": booking_id},
        {
            "$set": {
                "doctor_id": target_doctor_id,
                "doctor_name": target_doctor.get("name", ""),
                "doctor_specialty": target_doctor.get("specialty", ""),
                "hospital": target_doctor.get("hospital", ""),
                "token_number": new_token,
                "transfer_pending_doctor_id": None,
            }
        }
    )

    # Clear the transfer_offer notification for this patient + booking
    await db.notifications.update_many(
        {
            "user_id": user["id"],
            "kind": "transfer_offer",
            "payload.booking_id": booking_id,
            "read_at": None,
        },
        {"$set": {"read_at": now_iso()}}
    )

    updated = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    return {"booking": booking_dict(updated)}


# ---------- Decline transfer ----------

@router.post("/bookings/{booking_id}/decline-transfer")
async def decline_transfer(booking_id: str, user: dict = Depends(require_role("patient"))):
    booking = await db.bookings.find_one({"id": booking_id, "patient_id": user["id"]}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"transfer_pending_doctor_id": None}}
    )

    # Also dismiss the notification so the bell clears
    await db.notifications.update_many(
        {
            "user_id": user["id"],
            "kind": "transfer_offer",
            "payload.booking_id": booking_id,
            "read_at": None,
        },
        {"$set": {"read_at": now_iso()}}
    )

    return {"ok": True}
