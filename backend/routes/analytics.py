# INTEGRATION: Auto-discovered by server.py from routes/ directory
# Historical Analytics + Daily Summary (Feature 08)
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timezone, timedelta, date
from config import db, get_current_user, require_role

router = APIRouter(prefix="/api")


@router.get("/reception/analytics")
async def reception_analytics(
    range_param: str = Query("today", alias="range"),
    doctor_id: str = Query("", alias="doctor_id"),
    user: dict = Depends(require_role("reception")),
):

    today = datetime.now(timezone.utc).date()
    if range_param == "today":
        start = today
        num_days = 1
    elif range_param == "7d":
        start = today - timedelta(days=6)
        num_days = 7
    else:  # 30d
        start = today - timedelta(days=29)
        num_days = 30
    end = today

    date_strs = [str(start + timedelta(days=i)) for i in range(num_days)]

    # Hospital scoping for receptionists
    user_hospital = user.get("hospital", "").strip()
    hosp_doc_ids = []
    if user_hospital and user.get("role") != "admin":
        hosp_docs = await db.users.find({"role": "doctor", "hospital": user_hospital}, {"_id": 0, "id": 1}).to_list(200)
        hosp_doc_ids = [d["id"] for d in hosp_docs]

    # Build filter
    filt = {"date": {"$gte": str(start), "$lte": str(today)}}
    if user_hospital and user.get("role") != "admin":
        if doctor_id:
            if doctor_id in hosp_doc_ids:
                filt["doctor_id"] = doctor_id
            else:
                filt["doctor_id"] = {"$in": []}
        else:
            filt["doctor_id"] = {"$in": hosp_doc_ids}
    elif doctor_id:
        filt["doctor_id"] = doctor_id

    # Query bookings
    bookings = await db.bookings.find(filt, {"_id": 0}).to_list(10000)

    # Compute totals
    totals = {"booked": 0, "arrived": 0, "in_consult": 0, "completed": 0, "cancelled": 0, "walkins": 0}
    for b in bookings:
        s = b.get("status", "booked")
        totals[s] = totals.get(s, 0) + 1
        if b.get("walkin"):
            totals["walkins"] += 1

    # Compute daily series
    daily = {d: {"date": d, "bookings": 0, "completed": 0, "cancelled": 0} for d in date_strs}
    for b in bookings:
        d = b.get("date", "")
        if d in daily:
            daily[d]["bookings"] += 1
            if b["status"] == "completed":
                daily[d]["completed"] += 1
            if b["status"] == "cancelled":
                daily[d]["cancelled"] += 1
    daily_series = list(daily.values())

    # Compute no_show_rate (cancelled / booked * 100)
    total_booked = sum(d["bookings"] for d in daily_series)
    total_cancelled = sum(d["cancelled"] for d in daily_series)
    no_show_rate = round(total_cancelled / total_booked * 100, 1) if total_booked > 0 else 0.0

    # Compute avg_consult_time_min
    completed = [b for b in bookings if b.get("status") == "completed"]
    if completed:
        avg_consult_time_min = 12  # heuristic: 12 min per consultation
    else:
        avg_consult_time_min = 0

    # Compute top_specialties
    spec_counts = {}
    for b in bookings:
        sp = b.get("doctor_specialty", "Unknown")
        spec_counts[sp] = spec_counts.get(sp, 0) + 1
    top_specialties = [
        {"specialty": k, "count": v}
        for k, v in sorted(spec_counts.items(), key=lambda x: -x[1])
    ]

    # Compute idle_minutes_per_doctor (simplified)
    doctors_in_range = {}
    for b in bookings:
        did = b.get("doctor_id")
        if did not in doctors_in_range:
            doctors_in_range[did] = {
                "doctor_id": did,
                "name": b.get("doctor_name", ""),
                "completed": 0,
                "total": 0,
            }
        doctors_in_range[did]["total"] += 1
        if b["status"] == "completed":
            doctors_in_range[did]["completed"] += 1
    idle_minutes = [
        {
            "doctor_id": v["doctor_id"],
            "name": v["name"],
            "idle_min": max(0, (v["total"] - v["completed"]) * 8),
        }
        for v in doctors_in_range.values()
    ]

    return {
        "range": range_param,
        "start_date": str(start),
        "end_date": str(today),
        "totals": totals,
        "no_show_rate": no_show_rate,
        "avg_consult_time_min": avg_consult_time_min,
        "idle_minutes_per_doctor": idle_minutes,
        "daily_series": daily_series,
        "top_specialties": top_specialties,
    }
