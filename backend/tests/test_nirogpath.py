"""NirogPath backend regression tests: auth, doctors, bookings, doctor queue, reception, roles."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://127.0.0.1:8000").rstrip("/")
API = f"{BASE_URL}/api"


PATIENT = ("patient@nirog.in", "nirog1234")
DOCTOR = ("kavya@nirog.in", "nirog1234")
RECEP = ("admin@nirog.in", "nirog1234")


def _login(email, pw):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": pw}, timeout=15)
    assert r.status_code == 200, f"login failed {email}: {r.status_code} {r.text}"
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


# ---- Auth ----
def test_login_patient(patient_ctx):
    assert patient_ctx["user"]["email"] == "patient@nirog.in"
    assert patient_ctx["user"]["role"] == "patient"
    assert "token" in patient_ctx


def test_auth_me(patient_ctx):
    r = requests.get(f"{API}/auth/me", headers=_h(patient_ctx), timeout=15)
    assert r.status_code == 200
    assert r.json()["user"]["email"] == "patient@nirog.in"


def test_register_new_patient():
    email = f"qa+{int(time.time()*1000)}@nirog.in"
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": "test1234", "name": "QA User", "phone": "+911111111111"
    }, timeout=15)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["user"]["wallet_balance"] == 2000
    assert j["user"]["role"] == "patient"
    assert "token" in j


# ---- Doctors ----
def test_list_doctors():
    r = requests.get(f"{API}/doctors", timeout=15)
    assert r.status_code == 200
    docs = r.json()["doctors"]
    names = {d["name"] for d in docs}
    assert len(docs) >= 7, f"expected at least 7 doctors, got {len(docs)}: {names}"
    for expected in ["Kavya", "Rohan", "Sneha", "Arjun", "Priya", "Nisha", "Vikram"]:
        assert any(expected in n for n in names), f"missing doctor {expected}"
    # New fields expected by BookingFlow
    for d in docs:
        assert "avatar" in d
        assert "experience_years" in d
        assert "rating" in d


# ---- Hospitals (new) ----
def test_list_hospitals():
    r = requests.get(f"{API}/hospitals", timeout=15)
    assert r.status_code == 200
    hospitals = r.json()["hospitals"]
    assert len(hospitals) >= 3
    ids = {h["id"] for h in hospitals}
    required_fields = {"id", "name", "city", "area", "rating", "reviews", "image", "tags", "doctor_count", "specialties", "min_fee"}
    for h in hospitals:
        missing = required_fields - set(h.keys())
        assert not missing, f"hospital {h.get('name')} missing fields: {missing}"
    # Count per hospital
    by_id = {h["id"]: h for h in hospitals}
    sanj = next(h for h in hospitals if "sanjeevani" in h["id"])
    aar = next(h for h in hospitals if "aarogya" in h["id"])
    meera = next(h for h in hospitals if "meera" in h["id"])
    assert sanj["doctor_count"] >= 3
    assert aar["doctor_count"] >= 2
    assert meera["doctor_count"] >= 2


def test_hospital_doctors_endpoint():
    hospitals = requests.get(f"{API}/hospitals", timeout=15).json()["hospitals"]
    sanj = next(h for h in hospitals if "sanjeevani" in h["id"])
    r = requests.get(f"{API}/hospitals/{sanj['id']}/doctors", timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert j["hospital"]["id"] == sanj["id"]
    assert "city" in j["hospital"]
    assert len(j["doctors"]) >= 3
    names = {d["name"] for d in j["doctors"]}
    assert any("Kavya" in n for n in names)
    assert any("Rohan" in n for n in names)
    assert any("Sneha" in n for n in names)

    # Unknown hospital -> 404
    r404 = requests.get(f"{API}/hospitals/does-not-exist/doctors", timeout=15)
    assert r404.status_code == 404


def test_doctor_slots():
    docs = requests.get(f"{API}/doctors", timeout=15).json()["doctors"]
    kavya = next(d for d in docs if "Kavya" in d["name"])
    r = requests.get(f"{API}/doctors/{kavya['id']}/slots", timeout=15)
    assert r.status_code == 200
    slots = r.json()["slots"]
    assert len(slots) == 14
    assert all("time" in s and "available" in s for s in slots)


# ---- Bookings ----
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


def test_create_booking_and_wallet_deduction(fresh_patient):
    docs = requests.get(f"{API}/doctors", timeout=15).json()["doctors"]
    nisha = next(d for d in docs if "Nisha" in d["name"])  # fee 600 -> deposit 120
    slot = _find_free_slot(nisha["id"])
    assert slot, "no free slot"
    initial_balance = fresh_patient["user"]["wallet_balance"]

    r = requests.post(f"{API}/bookings", json={"doctor_id": nisha["id"], "slot_time": slot},
                      headers=_h(fresh_patient), timeout=15)
    assert r.status_code == 200, r.text
    b = r.json()["booking"]
    assert b["status"] == "booked"
    assert b["token_number"] >= 1
    assert b["deposit_paid"] == 120

    # Wallet deducted
    me = requests.get(f"{API}/auth/me", headers=_h(fresh_patient), timeout=15).json()["user"]
    assert me["wallet_balance"] == initial_balance - 120

    # Double booking same slot -> 400
    r2 = requests.post(f"{API}/bookings", json={"doctor_id": nisha["id"], "slot_time": slot},
                       headers=_h(fresh_patient), timeout=15)
    assert r2.status_code == 400

    # Invalid slot -> 400
    r3 = requests.post(f"{API}/bookings", json={"doctor_id": nisha["id"], "slot_time": "23:59"},
                       headers=_h(fresh_patient), timeout=15)
    assert r3.status_code == 400


def test_bookings_me_sorted(fresh_patient):
    r = requests.get(f"{API}/bookings/me", headers=_h(fresh_patient), timeout=15)
    assert r.status_code == 200
    items = r.json()["bookings"]
    assert len(items) >= 1
    if len(items) > 1:
        assert items[0]["created_at"] >= items[1]["created_at"]


def test_arrive_and_cancel_flow():
    # Fresh patient dedicated for this test
    email = f"qa+arr{int(time.time()*1000)}@nirog.in"
    reg = requests.post(f"{API}/auth/register", json={
        "email": email, "password": "test1234", "name": "Arrive QA"
    }, timeout=15).json()
    docs = requests.get(f"{API}/doctors", timeout=15).json()["doctors"]
    arjun = next(d for d in docs if "Arjun" in d["name"])  # fee 900 -> deposit 180
    slot = _find_free_slot(arjun["id"])
    r = requests.post(f"{API}/bookings", json={"doctor_id": arjun["id"], "slot_time": slot},
                      headers=_h(reg), timeout=15).json()
    bid = r["booking"]["id"]
    dep = r["booking"]["deposit_paid"]

    # arrive
    ar = requests.post(f"{API}/bookings/{bid}/arrive", headers=_h(reg), timeout=15)
    assert ar.status_code == 200
    assert ar.json()["booking"]["status"] == "arrived"

    # cancel refunds
    # Get balance before cancel
    before = requests.get(f"{API}/auth/me", headers=_h(reg), timeout=15).json()["user"]["wallet_balance"]
    cn = requests.post(f"{API}/bookings/{bid}/cancel", headers=_h(reg), timeout=15)
    assert cn.status_code == 200
    after = requests.get(f"{API}/auth/me", headers=_h(reg), timeout=15).json()["user"]["wallet_balance"]
    assert after == before + dep


# ---- Doctor endpoints ----
def test_doctor_queue(doctor_ctx):
    r = requests.get(f"{API}/doctor/queue", headers=_h(doctor_ctx), timeout=15)
    assert r.status_code == 200
    q = r.json()["queue"]
    assert isinstance(q, list)
    if len(q) > 1:
        assert q[0]["token_number"] <= q[1]["token_number"]


def test_doctor_call_next_and_complete(doctor_ctx):
    q = requests.get(f"{API}/doctor/queue", headers=_h(doctor_ctx), timeout=15).json()["queue"]
    booked = next((b for b in q if b["status"] == "booked"), None)
    if booked:
        r = requests.post(f"{API}/doctor/bookings/{booked['id']}/call-next", headers=_h(doctor_ctx), timeout=15)
        assert r.status_code == 200
    in_consult = next((b for b in q if b["status"] == "in_consult"), None)
    if in_consult:
        r = requests.post(f"{API}/doctor/bookings/{in_consult['id']}/complete", headers=_h(doctor_ctx), timeout=15)
        assert r.status_code == 200


def test_doctor_set_late(doctor_ctx):
    r = requests.post(f"{API}/doctor/set-late", json={"running_late": True, "delay_minutes": 40},
                      headers=_h(doctor_ctx), timeout=15)
    assert r.status_code == 200
    q = requests.get(f"{API}/doctor/queue", headers=_h(doctor_ctx), timeout=15).json()["queue"]
    flagged = [b for b in q if b["status"] in ("booked", "arrived")]
    if flagged:
        assert all(b["running_late"] for b in flagged)
    # reset
    requests.post(f"{API}/doctor/set-late", json={"running_late": False, "delay_minutes": 0},
                  headers=_h(doctor_ctx), timeout=15)


# ---- Reception ----
def test_reception_overview(recep_ctx):
    r = requests.get(f"{API}/reception/overview", headers=_h(recep_ctx), timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert len(j["doctors"]) >= 7
    assert "total" in j
    for k in ["booked", "arrived", "in_consult", "completed", "cancelled"]:
        assert k in j["total"]


# ---- Role enforcement ----
def test_role_patient_cannot_call_doctor(patient_ctx):
    r = requests.get(f"{API}/doctor/queue", headers=_h(patient_ctx), timeout=15)
    assert r.status_code == 403


def test_role_doctor_cannot_call_patient(doctor_ctx):
    r = requests.get(f"{API}/bookings/me", headers=_h(doctor_ctx), timeout=15)
    assert r.status_code == 403
