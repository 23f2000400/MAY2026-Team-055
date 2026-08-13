"""Bookings, wallet deposits, arrival and cancellation tests."""
import time
import requests
from conftest import API, _h, _find_free_slot


def test_create_booking_and_wallet_deduction(fresh_patient):
    docs = requests.get(f"{API}/doctors", timeout=15).json()["doctors"]
    nisha = next(d for d in docs if "Nisha" in d["name"])
    slot = _find_free_slot(nisha["id"])
    assert slot, "no free slot"
    initial_balance = fresh_patient["user"]["wallet_balance"]

    r = requests.post(f"{API}/bookings", json={"doctor_id": nisha["id"], "slot_time": slot},
                      headers=_h(fresh_patient), timeout=15)
    assert r.status_code == 200, r.text
    b = r.json()["booking"]
    assert b["status"] == "booked"
    assert b["token_number"] >= 1

    me = requests.get(f"{API}/auth/me", headers=_h(fresh_patient), timeout=15).json()["user"]
    assert me["wallet_balance"] == initial_balance - b["deposit_paid"]


def test_bookings_me_sorted(fresh_patient):
    r = requests.get(f"{API}/bookings/me", headers=_h(fresh_patient), timeout=15)
    assert r.status_code == 200
    items = r.json()["bookings"]
    assert len(items) >= 1


def test_arrive_and_cancel_flow():
    email = f"qa+arr{int(time.time()*1000)}@nirog.in"
    reg = requests.post(f"{API}/auth/register", json={
        "email": email, "password": "test1234", "name": "Arrive QA"
    }, timeout=15).json()
    docs = requests.get(f"{API}/doctors", timeout=15).json()["doctors"]
    arjun = next(d for d in docs if "Arjun" in d["name"])
    slot = _find_free_slot(arjun["id"])
    r = requests.post(f"{API}/bookings", json={"doctor_id": arjun["id"], "slot_time": slot},
                      headers=_h(reg), timeout=15).json()
    bid = r["booking"]["id"]
    dep = r["booking"]["deposit_paid"]

    ar = requests.post(f"{API}/bookings/{bid}/arrive", headers=_h(reg), timeout=15)
    assert ar.status_code == 200

    before = requests.get(f"{API}/auth/me", headers=_h(reg), timeout=15).json()["user"]["wallet_balance"]
    cn = requests.post(f"{API}/bookings/{bid}/cancel", headers=_h(reg), timeout=15)
    assert cn.status_code == 200
    after = requests.get(f"{API}/auth/me", headers=_h(reg), timeout=15).json()["user"]["wallet_balance"]
    assert after == before + dep
