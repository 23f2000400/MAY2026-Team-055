# INTEGRATION: Auto-discovered by server.py from routes/ directory
# Waitlist + in-app notifications (Feature 04)
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from config import db, get_current_user, require_role, new_id, now_iso

router = APIRouter(prefix="/api")


# ---------- Models ----------

class WaitlistIn(BaseModel):
    doctor_id: str
    date: str
    slot_time: str


class NotifyWaitlistIn(BaseModel):
    doctor_id: str
    date: str
    slot_time: str


# ---------- Internal helper ----------

async def notify_waitlist_on_cancel(doctor_id: str, date: str, slot_time: str):
    """Called by the cancel endpoint (integration pass will hook this into server.py's cancel endpoint)."""
    entries = await db.waitlist.find(
        {"doctor_id": doctor_id, "date": date, "slot_time": slot_time},
        {"_id": 0}
    ).to_list(100)

    for entry in entries:
        notification = {
            "id": new_id(),
            "user_id": entry["patient_id"],
            "kind": "slot_opened",
            "payload": {
                "doctor_id": doctor_id,
                "date": date,
                "slot_time": slot_time,
                "waitlist_id": entry["id"],
            },
            "created_at": now_iso(),
            "read_at": None,
        }
        await db.notifications.insert_one(notification)
        await db.waitlist.update_one(
            {"id": entry["id"]},
            {"$set": {"notified_at": now_iso()}}
        )

    # Auto-remove from waitlist after notifying
    if entries:
        await db.waitlist.delete_many({"doctor_id": doctor_id, "date": date, "slot_time": slot_time})

    return len(entries)


# ---------- Waitlist endpoints ----------

@router.post("/waitlist")
async def join_waitlist(body: WaitlistIn, user: dict = Depends(require_role("patient"))):
    # Check that slot is actually taken (exists in bookings with status != cancelled)
    existing_booking = await db.bookings.find_one({
        "doctor_id": body.doctor_id,
        "date": body.date,
        "slot_time": body.slot_time,
        "status": {"$ne": "cancelled"},
    }, {"_id": 0})
    if not existing_booking:
        raise HTTPException(status_code=400, detail="Slot is already available")

    # Check patient not already in waitlist for this slot
    duplicate = await db.waitlist.find_one({
        "patient_id": user["id"],
        "doctor_id": body.doctor_id,
        "date": body.date,
        "slot_time": body.slot_time,
    }, {"_id": 0})
    if duplicate:
        raise HTTPException(status_code=400, detail="Already on waitlist for this slot")

    entry = {
        "id": new_id(),
        "patient_id": user["id"],
        "doctor_id": body.doctor_id,
        "date": body.date,
        "slot_time": body.slot_time,
        "created_at": now_iso(),
        "notified_at": None,
    }
    await db.waitlist.insert_one(entry)
    return {"waitlist_entry": {k: v for k, v in entry.items() if k != "_id"}}


@router.delete("/waitlist/{waitlist_id}")
async def leave_waitlist(waitlist_id: str, user: dict = Depends(require_role("patient"))):
    entry = await db.waitlist.find_one({"id": waitlist_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Waitlist entry not found")
    if entry["patient_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
    await db.waitlist.delete_one({"id": waitlist_id})
    return {"ok": True}


@router.get("/waitlist/me")
async def my_waitlist(user: dict = Depends(require_role("patient"))):
    items = await db.waitlist.find(
        {"patient_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return {"waitlist": items}


# ---------- Notification endpoints ----------

@router.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    items = await db.notifications.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    unread_count = sum(1 for n in items if n.get("read_at") is None)
    return {"notifications": items, "unread_count": unread_count}


@router.post("/notifications/mark-all-read")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": user["id"], "read_at": None},
        {"$set": {"read_at": now_iso()}}
    )
    return {"ok": True}


@router.post("/notifications/{notification_id}/mark-read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    notif = await db.notifications.find_one({"id": notification_id, "user_id": user["id"]}, {"_id": 0})
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    await db.notifications.update_one(
        {"id": notification_id},
        {"$set": {"read_at": now_iso()}}
    )
    return {"ok": True}


# ---------- Internal webhook endpoint ----------

@router.post("/internal/notify-waitlist")
async def internal_notify_waitlist(body: NotifyWaitlistIn):
    """No auth — internal use only. Call from server.py's cancel flow."""
    count = await notify_waitlist_on_cancel(body.doctor_id, body.date, body.slot_time)
    return {"ok": True, "notified": count}
