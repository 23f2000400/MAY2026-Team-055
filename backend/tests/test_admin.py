"""Admin Superuser backend tests for doctor & hospital management."""
import time
import requests
from conftest import API, _h


def test_admin_create_doctor(admin_ctx):
    email = f"qa+doc{int(time.time()*1000)}@nirog.in"
    payload = {
        "name": "Dr. QA Admin Test",
        "email": email,
        "password": "test1234password",
        "specialty": "Neurologist",
        "hospital": "Sanjeevani Clinic, Bengaluru",
        "fee": 850,
        "experience_years": 14,
        "rating": 4.9,
        "phone": "+919876500111"
    }
    r = requests.post(f"{API}/admin/doctors", json=payload, headers=_h(admin_ctx), timeout=15)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["ok"] is True
    assert j["doctor"]["email"] == email
    assert j["doctor"]["role"] == "doctor"


def test_admin_create_hospital(admin_ctx):
    name = f"QA Hospital {int(time.time()*1000)}"
    payload = {
        "name": name,
        "city": "Bengaluru",
        "area": "Koramangala",
        "rating": 4.9,
        "reviews": 150,
        "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "tags": ["24x7 ICU", "NABH"],
        "specialties": ["Cardiology", "Neurology"],
        "min_fee": 700.0
    }
    r = requests.post(f"{API}/admin/hospitals", json=payload, headers=_h(admin_ctx), timeout=15)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["ok"] is True
    assert j["hospital"]["name"] == name


def test_admin_create_receptionist(admin_ctx):
    email = f"qa+recep{int(time.time()*1000)}@nirog.in"
    payload = {
        "name": "QA Receptionist Test",
        "email": email,
        "password": "test1234password",
        "hospital": "Sanjeevani Clinic, Bengaluru",
        "phone": "+919876500222"
    }
    r = requests.post(f"{API}/admin/receptionists", json=payload, headers=_h(admin_ctx), timeout=15)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["ok"] is True
    assert j["receptionist"]["email"] == email
    assert j["receptionist"]["role"] == "reception"

    # Verify listing includes the receptionist
    lr = requests.get(f"{API}/admin/receptionists", headers=_h(admin_ctx), timeout=15)
    assert lr.status_code == 200
    receps = lr.json().get("receptionists", [])
    assert any(x["email"] == email for x in receps)


def test_patient_cannot_access_admin_endpoints(patient_ctx):
    r = requests.get(f"{API}/admin/users", headers=_h(patient_ctx), timeout=15)
    assert r.status_code == 403

