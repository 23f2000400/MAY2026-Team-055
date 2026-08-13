"""Doctor queue management and consultation state tests."""
import requests
from conftest import API, _h


def test_doctor_queue(doctor_ctx):
    r = requests.get(f"{API}/doctor/queue", headers=_h(doctor_ctx), timeout=15)
    assert r.status_code == 200


def test_doctor_call_next_and_complete(doctor_ctx):
    q = requests.get(f"{API}/doctor/queue", headers=_h(doctor_ctx), timeout=15).json()["queue"]
    booked = next((b for b in q if b["status"] == "booked"), None)
    if booked:
        r = requests.post(f"{API}/doctor/bookings/{booked['id']}/call-next", headers=_h(doctor_ctx), timeout=15)
        assert r.status_code == 200


def test_doctor_set_late(doctor_ctx):
    r = requests.post(f"{API}/doctor/set-late", json={"running_late": True, "delay_minutes": 40},
                      headers=_h(doctor_ctx), timeout=15)
    assert r.status_code == 200
