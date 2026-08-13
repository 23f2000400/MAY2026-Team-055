"""Role-based Access Control (RBAC) enforcement tests."""
import requests
from conftest import API, _h


def test_role_patient_cannot_call_doctor(patient_ctx):
    r = requests.get(f"{API}/doctor/queue", headers=_h(patient_ctx), timeout=15)
    assert r.status_code == 403


def test_role_doctor_cannot_call_patient(doctor_ctx):
    r = requests.get(f"{API}/bookings/me", headers=_h(doctor_ctx), timeout=15)
    assert r.status_code == 403
