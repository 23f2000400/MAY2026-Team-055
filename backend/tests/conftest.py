"""Shared pytest fixtures and helpers for NirogPath test suite."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://prescription-hub-87.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

PATIENT = ("patient@nirog.in", "nirog1234")
DOCTOR = ("kavya@nirog.in", "nirog1234")
OTHER_DOCTOR = ("arjun@nirog.in", "nirog1234")
RECEP = ("reception@nirog.in", "nirog1234")
ADMIN = ("admin@nirog.in", "nirog1234")


def _login(email, pw):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=15)
    assert r.status_code == 200, f"login failed {email}: {r.status_code} {r.text}"
    return r.json()


def _h(ctx):
    return {"Authorization": f"Bearer {ctx['token']}"}


@pytest.fixture(scope="module")
def patient_ctx():
    return _login(*PATIENT)


@pytest.fixture(scope="module")
def doctor_ctx():
    return _login(*DOCTOR)


@pytest.fixture(scope="module")
def other_doctor_ctx():
    return _login(*OTHER_DOCTOR)


@pytest.fixture(scope="module")
def recep_ctx():
    return _login(*RECEP)


@pytest.fixture(scope="module")
def admin_ctx():
    return _login(*ADMIN)


@pytest.fixture(scope="module")
def fresh_patient():
    email = f"qa+book{int(time.time()*1000)}@nirog.in"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": "test1234", "name": "Book QA", "phone": "+919999999999"
    }, timeout=15)
    assert r.status_code == 200
    return r.json()


def _find_free_slot(doctor_id):
    r = requests.get(f"{API}/doctors/{doctor_id}/slots", timeout=15).json()
    for s in r["slots"]:
        if s["available"]:
            return s["time"]
    return None


def _pick_doctor_with_slot(preferred_name=None):
    docs = requests.get(f"{API}/doctors", timeout=15).json()["doctors"]
    if preferred_name:
        target = next((d for d in docs if preferred_name in d["name"]), None)
        if target:
            s = _find_free_slot(target["id"])
            if s:
                return target, s
    for d in docs:
        s = _find_free_slot(d["id"])
        if s:
            return d, s
    return None, None


def _login_doctor_for(doctor):
    first = doctor["name"].replace("Dr. ", "").split()[0].lower()
    return _login(f"{first}@nirog.in", "nirog1234")


def _register_patient():
    email = f"qa+rx{int(time.time()*1000)}@nirog.in"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": "test1234", "name": "Rx QA", "phone": "+919000000000"
    }, timeout=15)
    assert r.status_code == 200
    return r.json()


@pytest.fixture(scope="module")
def prescription_setup():
    patient = _register_patient()
    doctor, slot = _pick_doctor_with_slot(preferred_name="Kavya")
    assert doctor and slot, "No doctor with free slot"
    d_ctx = _login_doctor_for(doctor)

    br = requests.post(f"{API}/bookings", json={"doctor_id": doctor["id"], "slot_time": slot},
                       headers=_h(patient), timeout=15)
    assert br.status_code == 200, br.text
    booking = br.json()["booking"]

    requests.post(f"{API}/bookings/{booking['id']}/arrive", headers=_h(patient), timeout=15)
    requests.post(f"{API}/doctor/bookings/{booking['id']}/call-next", headers=_h(d_ctx), timeout=15)

    body = {
        "medications": [
            {"name": "Paracetamol", "dose": "500 mg", "frequency": "TID", "food_instructions": "after", "duration_days": 3}
        ],
        "notes": "Take rest."
    }
    pr = requests.post(f"{API}/doctor/bookings/{booking['id']}/prescription", json=body, headers=_h(d_ctx), timeout=15)
    prescription = pr.json()["prescription"] if pr.status_code == 200 else None

    return {"patient": patient, "booking": booking, "doctor": d_ctx, "doctor_meta": doctor, "prescription": prescription}

