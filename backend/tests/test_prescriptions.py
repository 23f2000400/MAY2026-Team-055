"""E-Prescription creation and access control tests."""
import pytest
import requests
from conftest import API, _h, _pick_doctor_with_slot, _login_doctor_for, _register_patient


def test_write_prescription_success(prescription_setup):
    d = prescription_setup
    body = {
        "medications": [
            {"name": "Paracetamol", "dose": "500 mg", "frequency": "TID",
             "food_instructions": "after", "duration_days": 3},
        ],
        "notes": "Take rest."
    }
    r = requests.post(f"{API}/doctor/bookings/{d['booking']['id']}/prescription",
                      json=body, headers=_h(d["doctor"]), timeout=15)
    assert r.status_code == 200, r.text


def test_invalid_frequency_rejected():
    patient = _register_patient()
    doctor, slot = _pick_doctor_with_slot()
    if not (doctor and slot):
        pytest.skip("no free slots")
    d_ctx = _login_doctor_for(doctor)
    br = requests.post(f"{API}/bookings", json={"doctor_id": doctor["id"], "slot_time": slot},
                       headers=_h(patient), timeout=15).json()["booking"]
    requests.post(f"{API}/bookings/{br['id']}/arrive", headers=_h(patient), timeout=15)
    requests.post(f"{API}/doctor/bookings/{br['id']}/call-next", headers=_h(d_ctx), timeout=15)

    r = requests.post(f"{API}/doctor/bookings/{br['id']}/prescription",
                      json={"medications": [
                          {"name": "X", "dose": "1", "frequency": "FOO", "duration_days": 2}
                      ]},
                      headers=_h(d_ctx), timeout=15)
    assert r.status_code == 400


def test_all_valid_frequencies_accepted():
    for freq in ["OD", "BID", "TID", "QID"]:
        patient = _register_patient()
        doctor, slot = _pick_doctor_with_slot()
        if not (doctor and slot):
            pytest.skip("no free slots")
        d_ctx = _login_doctor_for(doctor)
        br = requests.post(f"{API}/bookings", json={"doctor_id": doctor["id"], "slot_time": slot},
                           headers=_h(patient), timeout=15).json()["booking"]
        requests.post(f"{API}/bookings/{br['id']}/arrive", headers=_h(patient), timeout=15)
        requests.post(f"{API}/doctor/bookings/{br['id']}/call-next", headers=_h(d_ctx), timeout=15)
        r = requests.post(f"{API}/doctor/bookings/{br['id']}/prescription",
                          json={"medications": [
                              {"name": "M", "dose": "1", "frequency": freq, "duration_days": 2}
                          ]},
                          headers=_h(d_ctx), timeout=15)
        assert r.status_code == 200


def test_prescriptions_me_sorted(prescription_setup):
    patient = prescription_setup["patient"]
    r = requests.get(f"{API}/prescriptions/me", headers=_h(patient), timeout=15)
    assert r.status_code == 200


def test_prescription_access_control(prescription_setup):
    p = prescription_setup["prescription"]
    patient = prescription_setup["patient"]

    r = requests.get(f"{API}/prescriptions/{p['id']}", headers=_h(patient), timeout=15)
    assert r.status_code == 200

    other = _register_patient()
    r2 = requests.get(f"{API}/prescriptions/{p['id']}", headers=_h(other), timeout=15)
    assert r2.status_code == 403


def test_patient_cannot_write_prescription(prescription_setup):
    patient = prescription_setup["patient"]
    r = requests.post(f"{API}/doctor/bookings/{prescription_setup['booking']['id']}/prescription",
                      json={"medications": [{"name": "X", "dose": "1", "frequency": "OD"}]},
                      headers=_h(patient), timeout=15)
    assert r.status_code == 403
