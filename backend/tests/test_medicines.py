"""Daily medicine alarms and dose compliance tests."""
import requests
from conftest import API, _h


def test_medicines_today_flatten(prescription_setup):
    patient = prescription_setup["patient"]
    r = requests.get(f"{API}/medicines/today", headers=_h(patient), timeout=15)
    assert r.status_code == 200


def test_take_dose_idempotent(prescription_setup):
    patient = prescription_setup["patient"]
    p = prescription_setup["prescription"]
    body = {"prescription_id": p["id"], "med_index": 0, "time": "09:00"}
    r = requests.post(f"{API}/medicines/take", json=body, headers=_h(patient), timeout=15)
    assert r.status_code == 200


def test_take_dose_invalid(prescription_setup):
    patient = prescription_setup["patient"]
    p = prescription_setup["prescription"]
    r = requests.post(f"{API}/medicines/take",
                      json={"prescription_id": p["id"], "med_index": 99, "time": "09:00"},
                      headers=_h(patient), timeout=15)
    assert r.status_code == 400


def test_doctor_cannot_take_medicine(doctor_ctx, prescription_setup):
    p = prescription_setup["prescription"]
    r = requests.post(f"{API}/medicines/take",
                      json={"prescription_id": p["id"], "med_index": 0, "time": "09:00"},
                      headers=_h(doctor_ctx), timeout=15)
    assert r.status_code == 403
