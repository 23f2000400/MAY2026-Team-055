# INTEGRATION: Auto-discovered by server.py from routes/ directory
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from config import db, get_current_user, require_role, new_id, now_iso

router = APIRouter(prefix="/api")

# NOTE for integration pass: In server.py's register endpoint, after creating the user, call:
# await db.family_members.insert_one({
#     "id": new_id(), "owner_id": user["id"], "name": user["name"],
#     "relationship": "self", "gender": None, "dob": None,
#     "phone": user.get("phone",""), "avatar_url": None,
#     "is_self": True, "created_at": now_iso(), "deleted_at": None,
# })

VALID_RELATIONSHIPS = {"self", "spouse", "child", "parent", "sibling", "other"}


def member_dict(m: dict) -> dict:
    """Strip MongoDB _id from a family member document."""
    return {k: v for k, v in m.items() if k != "_id"}


# ---------- Models ----------

class FamilyMemberIn(BaseModel):
    name: str
    relationship: str
    gender: Optional[str] = None
    dob: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


class FamilyMemberUpdate(BaseModel):
    name: Optional[str] = None
    relationship: Optional[str] = None
    gender: Optional[str] = None
    dob: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


# ---------- GET /api/family ----------

@router.get("/family")
async def list_family_members(user: dict = Depends(require_role("patient"))):
    """Return all non-deleted family members for the authenticated patient."""
    cursor = db.family_members.find(
        {"owner_id": user["id"], "deleted_at": None},
        {"_id": 0},
    )
    members = await cursor.to_list(200)
    return {"family_members": members}


# ---------- POST /api/family ----------

@router.post("/family")
async def create_family_member(
    body: FamilyMemberIn,
    user: dict = Depends(require_role("patient")),
):
    """Add a new family member profile."""
    if not body.name or not body.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")

    relationship = body.relationship.lower() if body.relationship else ""
    if relationship not in VALID_RELATIONSHIPS:
        raise HTTPException(
            status_code=400,
            detail=f"relationship must be one of: {', '.join(sorted(VALID_RELATIONSHIPS))}",
        )

    member = {
        "id": new_id(),
        "owner_id": user["id"],
        "name": body.name.strip(),
        "relationship": relationship,
        "gender": body.gender or None,
        "dob": body.dob or None,
        "phone": body.phone or "",
        "avatar_url": body.avatar_url or None,
        "is_self": relationship == "self",
        "created_at": now_iso(),
        "deleted_at": None,
    }
    await db.family_members.insert_one(member)
    return {"family_member": member_dict(member)}


# ---------- PATCH /api/family/{member_id} ----------

@router.patch("/family/{member_id}")
async def update_family_member(
    member_id: str,
    body: FamilyMemberUpdate,
    user: dict = Depends(require_role("patient")),
):
    """Update fields on an existing family member."""
    existing = await db.family_members.find_one(
        {"id": member_id, "deleted_at": None}, {"_id": 0}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Family member not found")
    if existing["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    updates = {}
    if body.name is not None:
        if not body.name.strip():
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        updates["name"] = body.name.strip()
    if body.relationship is not None:
        rel = body.relationship.lower()
        if rel not in VALID_RELATIONSHIPS:
            raise HTTPException(
                status_code=400,
                detail=f"relationship must be one of: {', '.join(sorted(VALID_RELATIONSHIPS))}",
            )
        updates["relationship"] = rel
    if body.gender is not None:
        updates["gender"] = body.gender or None
    if body.dob is not None:
        updates["dob"] = body.dob or None
    if body.phone is not None:
        updates["phone"] = body.phone
    if body.avatar_url is not None:
        updates["avatar_url"] = body.avatar_url or None

    if updates:
        await db.family_members.update_one({"id": member_id}, {"$set": updates})

    updated = await db.family_members.find_one({"id": member_id}, {"_id": 0})
    return {"family_member": member_dict(updated)}


# ---------- DELETE /api/family/{member_id} ----------

@router.delete("/family/{member_id}")
async def delete_family_member(
    member_id: str,
    user: dict = Depends(require_role("patient")),
):
    """Soft-delete a family member by setting deleted_at."""
    existing = await db.family_members.find_one(
        {"id": member_id, "deleted_at": None}, {"_id": 0}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Family member not found")
    if existing["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")

    await db.family_members.update_one(
        {"id": member_id},
        {"$set": {"deleted_at": now_iso()}},
    )
    return {"ok": True}


# ---------- GET /api/family/default ----------

@router.get("/family/default")
async def get_default_family_member(user: dict = Depends(require_role("patient"))):
    """Return the is_self=True family member for this user.
    If none exists, auto-create one from the user's name/phone.
    """
    member = await db.family_members.find_one(
        {"owner_id": user["id"], "is_self": True, "deleted_at": None},
        {"_id": 0},
    )
    if member:
        return {"family_member": member_dict(member)}

    # Auto-create self profile from user record
    self_member = {
        "id": new_id(),
        "owner_id": user["id"],
        "name": user.get("name", ""),
        "relationship": "self",
        "gender": user.get("gender", None),
        "dob": user.get("dob", None),
        "phone": user.get("phone", ""),
        "avatar_url": user.get("avatar_url", None),
        "is_self": True,
        "created_at": now_iso(),
        "deleted_at": None,
    }
    await db.family_members.insert_one(self_member)
    return {"family_member": member_dict(self_member)}
