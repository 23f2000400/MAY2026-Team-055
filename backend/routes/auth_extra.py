# INTEGRATION: Auto-discovered by server.py from routes/ directory
# Password reset endpoints (Feature 09a)
#
# TODO: Run this in server.py startup to enable TTL-based auto-expiry:
#   await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
#
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from config import db, hash_password, make_token, strip_user, new_id, now_iso
import secrets
import logging
from datetime import datetime, timezone, timedelta

logger = logging.getLogger("nirogpath")

router = APIRouter(prefix="/api")

# Module-level flag so the TTL index is created at most once per process lifetime
_ttl_index_created = False


async def _ensure_ttl_index():
    global _ttl_index_created
    if _ttl_index_created:
        return
    try:
        await db.password_reset_tokens.create_index(
            "expires_at", expireAfterSeconds=0, background=True
        )
        _ttl_index_created = True
        logger.info("password_reset_tokens TTL index ensured")
    except Exception as exc:
        logger.warning("Could not create TTL index on password_reset_tokens: %s", exc)


# ---------- Models ----------

class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ResetPasswordIn(BaseModel):
    token: str
    new_password: str  # min 6 chars validated below


# ---------- Endpoints ----------

@router.post("/auth/forgot-password")
async def forgot_password(body: ForgotPasswordIn):
    """
    Always return 200 — never reveal whether the email is registered.
    If found, generate a one-time reset token valid for 1 hour.
    """
    await _ensure_ttl_index()

    email = body.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0, "id": 1, "email": 1})

    if user:
        token_value = secrets.token_urlsafe(32)
        now = datetime.now(timezone.utc)
        record = {
            "id": new_id(),
            "token": token_value,
            "user_id": user["id"],
            "email": email,
            "created_at": now.isoformat(),
            "expires_at": (now + timedelta(hours=1)),   # datetime for TTL index
            "used": False,
        }
        await db.password_reset_tokens.insert_one(record)

        # In production replace this log line with an actual email dispatch.
        reset_url = f"https://nirogpath.in/reset-password?token={token_value}"
        logger.info(
            "Password reset link for %s: %s",
            email,
            reset_url,
        )

    return {"message": "If that email exists, a reset link has been sent."}


@router.post("/auth/reset-password")
async def reset_password(body: ResetPasswordIn):
    """
    Validate the reset token, update the user's password, mark the token as used,
    and return a fresh JWT so the user is auto-logged-in.
    """
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")

    record = await db.password_reset_tokens.find_one(
        {"token": body.token}, {"_id": 0}
    )

    if not record:
        raise HTTPException(status_code=400, detail="Invalid reset link")

    if record.get("used"):
        raise HTTPException(status_code=400, detail="This link has already been used")

    # expires_at may be stored as a datetime object (motor) or ISO string
    expires_at = record.get("expires_at")
    now = datetime.now(timezone.utc)
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and now > expires_at:
        raise HTTPException(status_code=400, detail="This link has expired")

    # Update the user's password
    new_hash = hash_password(body.new_password)
    await db.users.update_one(
        {"id": record["user_id"]},
        {"$set": {"password_hash": new_hash}},
    )

    # Mark token as consumed
    await db.password_reset_tokens.update_one(
        {"token": body.token},
        {"$set": {"used": True}},
    )

    # Fetch the updated user and return a JWT for auto-login
    user = await db.users.find_one({"id": record["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    jwt_token = make_token(user["id"], user["email"], user.get("role", "patient"))
    return {"token": jwt_token, "user": strip_user(user)}
