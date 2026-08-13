# INTEGRATION: Auto-discovered by server.py from routes/ directory
# Router file for printable prescription + public verification
from fastapi import APIRouter, HTTPException, Depends
from config import db, get_current_user, require_role, new_id, now_iso
import jwt
import os
from datetime import datetime, timezone, timedelta

JWT_SECRET = os.environ.get("JWT_SECRET") or "nirogpath-dev-secret-change-in-production-64chars-abcdef0123456789"
JWT_ALGORITHM = "HS256"

router = APIRouter(prefix="/api")


@router.get("/prescriptions/{id}/verify")
async def verify_prescription(id: str):
    """PUBLIC — no auth required. Returns minimal prescription validity info."""
    p = await db.prescriptions.find_one({"id": id}, {"_id": 0})
    if not p:
        return {"valid": False}
    meds = p.get("medications", [])
    return {
        "valid": True,
        "prescription": {
            "id": p["id"],
            "doctor_name": p.get("doctor_name", ""),
            "patient_name": p.get("patient_name", ""),
            "created_at": p.get("created_at", ""),
            "medication_count": len(meds),
        },
    }


@router.get("/prescriptions/{id}/print-data")
async def prescription_print_data(id: str, user: dict = Depends(get_current_user)):
    """Auth required — patient owner OR writing doctor.
    Returns full prescription with doctor signature, license, and credentials."""
    p = await db.prescriptions.find_one({"id": id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Prescription not found")

    role = user.get("role")

    # Role-based access check
    if role == "patient":
        if p.get("patient_id") != user["id"]:
            raise HTTPException(status_code=403, detail="Forbidden")
    elif role == "doctor":
        if p.get("doctor_id") != user["id"]:
            raise HTTPException(status_code=403, detail="Forbidden")
    else:
        # reception or other roles — deny
        raise HTTPException(status_code=403, detail="Forbidden")

    # Fetch doctor from db.users to get extra fields
    doctor = await db.users.find_one({"id": p.get("doctor_id")}, {"_id": 0, "password_hash": 0})

    signature_url = None
    license_number = None
    credentials = []

    if doctor:
        signature_url = doctor.get("signature_url") or None
        license_number = doctor.get("license_number") or None
        credentials = doctor.get("credentials") or []

    prescription_out = {
        **p,
        "doctor_signature": signature_url,
        "doctor_license": license_number,
        "doctor_credentials": credentials,
    }

    return {"prescription": prescription_out}
