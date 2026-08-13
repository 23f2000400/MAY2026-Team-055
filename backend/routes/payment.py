# INTEGRATION: Auto-discovered by server.py from routes/ directory
# Wallet top-up, transactions, promo redemption (Feature 02)
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from config import db, require_role, get_current_user, new_id, now_iso

router = APIRouter(prefix="/api")

ALLOWED_TOPUP_AMOUNTS = {500, 1000, 2000, 5000}


# ---------- Models ----------

class TopupIn(BaseModel):
    amount: int


class RedeemIn(BaseModel):
    code: str


# ---------- Endpoints ----------

@router.post("/wallet/topup")
async def wallet_topup(body: TopupIn, user: dict = Depends(require_role("patient"))):
    """Add money to the patient's wallet. Amount must be one of the allowed values."""
    if body.amount not in ALLOWED_TOPUP_AMOUNTS:
        raise HTTPException(
            status_code=400,
            detail=f"Amount must be one of: {sorted(ALLOWED_TOPUP_AMOUNTS)}"
        )

    tx_id = new_id()
    created_at = now_iso()

    # Increment wallet balance
    await db.users.update_one(
        {"id": user["id"]},
        {"$inc": {"wallet_balance": body.amount}}
    )

    # Insert transaction record
    transaction = {
        "id": tx_id,
        "user_id": user["id"],
        "type": "topup",
        "amount": body.amount,
        "note": "Manual top-up",
        "created_at": created_at,
    }
    await db.wallet_transactions.insert_one(transaction)

    # Fetch updated balance
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0, "wallet_balance": 1})
    new_balance = updated_user.get("wallet_balance", 0)

    return {"success": True, "new_balance": new_balance, "transaction_id": tx_id}


@router.get("/wallet/transactions")
async def wallet_transactions(user: dict = Depends(require_role("patient"))):
    """Return up to 50 most recent wallet transactions and current balance."""
    txs = await db.wallet_transactions.find(
        {"user_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)

    current_user = await db.users.find_one({"id": user["id"]}, {"_id": 0, "wallet_balance": 1})
    balance = current_user.get("wallet_balance", 0) if current_user else 0

    return {"transactions": txs, "balance": balance}


@router.post("/wallet/redeem")
async def wallet_redeem(body: RedeemIn, user: dict = Depends(require_role("patient"))):
    """Redeem a promo code to credit the patient's wallet."""
    from datetime import datetime, timezone

    code_str = body.code.strip().upper()
    promo = await db.promo_codes.find_one({"code": code_str}, {"_id": 0})

    if not promo:
        raise HTTPException(status_code=400, detail="Invalid promo code")

    # Check expiry
    expires_at = promo.get("expires_at")
    if expires_at:
        now_dt = datetime.now(timezone.utc)
        if isinstance(expires_at, str):
            expires_at_dt = datetime.fromisoformat(expires_at)
        else:
            expires_at_dt = expires_at
        if expires_at_dt.tzinfo is None:
            expires_at_dt = expires_at_dt.replace(tzinfo=timezone.utc)
        if now_dt > expires_at_dt:
            raise HTTPException(status_code=400, detail="This promo code has expired")

    # Check already used
    if promo.get("used_by"):
        raise HTTPException(status_code=400, detail="This promo code has already been used")

    credited_amount = promo.get("amount", 0)
    used_at = now_iso()

    # Credit wallet
    await db.users.update_one(
        {"id": user["id"]},
        {"$inc": {"wallet_balance": credited_amount}}
    )

    # Mark code as used
    await db.promo_codes.update_one(
        {"code": code_str},
        {"$set": {"used_by": user["id"], "used_at": used_at}}
    )

    # Insert transaction record
    tx_id = new_id()
    transaction = {
        "id": tx_id,
        "user_id": user["id"],
        "type": "credit",
        "amount": credited_amount,
        "note": f"Promo code: {code_str}",
        "created_at": used_at,
    }
    await db.wallet_transactions.insert_one(transaction)

    # Fetch updated balance
    updated_user = await db.users.find_one({"id": user["id"]}, {"_id": 0, "wallet_balance": 1})
    new_balance = updated_user.get("wallet_balance", 0)

    return {"success": True, "credited_amount": credited_amount, "new_balance": new_balance}


@router.post("/internal/seed-promos")
async def seed_promos():
    """Idempotently upsert 3 demo promo codes."""
    promos = [
        {"code": "WELCOME500", "amount": 500, "description": "Welcome bonus"},
        {"code": "NIROG200",   "amount": 200, "description": "NirogPath special"},
        {"code": "TRYNIROG",   "amount": 100, "description": "Try NirogPath"},
    ]

    upserted = []
    for p in promos:
        result = await db.promo_codes.update_one(
            {"code": p["code"]},
            {
                "$setOnInsert": {
                    "id": new_id(),
                    "code": p["code"],
                    "amount": p["amount"],
                    "description": p["description"],
                    "expires_at": None,
                    "used_by": None,
                    "used_at": None,
                    "created_at": now_iso(),
                }
            },
            upsert=True,
        )
        upserted.append({"code": p["code"], "upserted": result.upserted_id is not None})

    return {"ok": True, "promos": upserted}
