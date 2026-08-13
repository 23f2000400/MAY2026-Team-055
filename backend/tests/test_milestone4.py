"""
Milestone 4 (Sprint 2) Pytest Suite for NirogPath
Covering:
1. AI Smart Doctor & Specialty Recommender (/api/ai/recommend)
2. Doctor & Receptionist OPD Queue Review Assistant (/api/doctor/bookings/{id}/review)
3. RAG-Based AI Prescription Assistant & Messaging (/api/prescriptions/{id}/messages)
"""
import os
import pytest
import requests
import time

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://127.0.0.1:8000").rstrip("/")
API = f"{BASE_URL}/api"

PATIENT = ("patient@nirog.in", "nirog1234")
DOCTOR = ("kavya@nirog.in", "nirog1234")
RECEP = ("admin@nirog.in", "nirog1234")


def _login(email, pw):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=15)
    assert r.status_code == 200, f"Login failed for {email}: {r.status_code} {r.text}"
    return r.json()


@pytest.fixture(scope="module")
def patient_ctx():
    return _login(*PATIENT)


@pytest.fixture(scope="module")
def doctor_ctx():
    return _login(*DOCTOR)


@pytest.fixture(scope="module")
def recep_ctx():
    return _login(*RECEP)


def _h(ctx):
    return {"Authorization": f"Bearer {ctx['token']}"}


# ============================================================================
# 1. AI Smart Doctor & Specialty Recommender Endpoint Tests
# ============================================================================

def test_m4_irrelevant_query_returns_400(patient_ctx):
    """Test 1: Non-medical query returns 400 Bad Request with helpful guidance."""
    r = requests.post(
        f"{API}/ai/recommend",
        json={"description": "who is this famous actor, what is his height?", "city": "Bengaluru"},
        headers=_h(patient_ctx),
        timeout=15,
    )
    assert r.status_code == 400
    assert "symptoms" in r.json()["detail"].lower()


def test_m4_budget_warning_when_budget_too_low(patient_ctx):
    """Test 2: Budget warning returned when stated patient budget is below doctor minimum fee."""
    r = requests.post(
        f"{API}/ai/recommend",
        json={"description": "fever and cold symptoms, budget 100", "city": "Bengaluru"},
        headers=_h(patient_ctx),
        timeout=15,
    )
    assert r.status_code == 200
    data = r.json()
    assert data.get("budget_warning") is not None
    assert "below minimum doctor fee" in data["budget_warning"].lower()


def test_m4_specialty_auto_mapping_pediatrician(patient_ctx):
    """Test 3: Pediatric symptoms auto-map to Pediatrician specialty."""
    r = requests.post(
        f"{API}/ai/recommend",
        json={"description": "child cough and pediatric rash", "city": "Bengaluru"},
        headers=_h(patient_ctx),
        timeout=15,
    )
    assert r.status_code == 200
    doc = r.json()["doctor"]
    assert doc["specialty"] == "Pediatrician"


def test_m4_full_doctor_object_attached(patient_ctx):
    """Test 4: Recommended doctor object includes full metadata (name, specialty, rating, fee)."""
    r = requests.post(
        f"{API}/ai/recommend",
        json={"description": "skin allergy rash", "city": "Bengaluru"},
        headers=_h(patient_ctx),
        timeout=15,
    )
    assert r.status_code == 200
    doc = r.json()["doctor"]
    for field in ["id", "name", "specialty", "rating", "fee"]:
        assert field in doc, f"Missing field '{field}' in doctor recommendation"


def test_m4_consultation_fee_included(patient_ctx):
    """Test 5: Doctor recommendation response explicitly includes consultation fee."""
    r = requests.post(
        f"{API}/ai/recommend",
        json={"description": "chest pain cardiology checkup", "city": "Bengaluru"},
        headers=_h(patient_ctx),
        timeout=15,
    )
    assert r.status_code == 200
    assert "fee" in r.json()["doctor"]


def test_m4_invalid_doctor_id_returns_503(patient_ctx):
    """Test 6: Invalid doctor ID returned by LLM fallback triggers 503 error."""
    r = requests.post(
        f"{API}/ai/recommend",
        json={"description": "fever and headache doc-fake", "city": "Bengaluru"},
        headers=_h(patient_ctx),
        timeout=15,
    )
    assert r.status_code == 503
    assert "invalid doctor reference" in r.json()["detail"].lower()


# ============================================================================
# 2. Doctor OPD Queue Review Assistant Endpoint Tests
# ============================================================================

def test_m4_patient_blocked_from_doctor_review(patient_ctx):
    """Test 7: Patient token blocked from accessing doctor queue review (403 Forbidden)."""
    r = requests.get(
        f"{API}/doctor/bookings/booking-123/review",
        headers=_h(patient_ctx),
        timeout=15,
    )
    assert r.status_code == 403


def test_m4_doctor_queue_review_structure(doctor_ctx):
    """Test 8: Doctor queue review returns summary, flags, and suggestion fields."""
    # First get or create a booking for the doctor
    q = requests.get(f"{API}/doctor/queue", headers=_h(doctor_ctx), timeout=15).json()["queue"]
    assert len(q) > 0, "No bookings found in doctor queue for review test"
    booking_id = q[0]["id"]

    r = requests.get(
        f"{API}/doctor/bookings/{booking_id}/review",
        headers=_h(doctor_ctx),
        timeout=15,
    )
    assert r.status_code == 200
    res = r.json()
    assert "summary" in res
    assert "flags" in res and isinstance(res["flags"], list)
    assert "suggestion" in res


def test_m4_booking_reference_in_summary(doctor_ctx):
    """Test 9: Booking reference ID appears in the AI summary output."""
    q = requests.get(f"{API}/doctor/queue", headers=_h(doctor_ctx), timeout=15).json()["queue"]
    booking_id = q[0]["id"]

    r = requests.get(
        f"{API}/doctor/bookings/{booking_id}/review",
        headers=_h(doctor_ctx),
        timeout=15,
    )
    assert r.status_code == 200
    summary = r.json()["summary"]
    assert booking_id[:8] in summary


def test_m4_receptionist_can_access_queue_review(recep_ctx, doctor_ctx):
    """Test 10: Receptionist role can also access OPD Queue Review assistant."""
    q = requests.get(f"{API}/doctor/queue", headers=_h(doctor_ctx), timeout=15).json()["queue"]
    booking_id = q[0]["id"]

    r = requests.get(
        f"{API}/doctor/bookings/{booking_id}/review",
        headers=_h(recep_ctx),
        timeout=15,
    )
    assert r.status_code == 200
