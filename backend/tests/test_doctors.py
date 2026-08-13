"""Doctor directory and slots backend tests."""
import requests
from conftest import API


def test_list_doctors():
    r = requests.get(f"{API}/doctors", timeout=15)
    assert r.status_code == 200
    docs = r.json()["doctors"]
    names = {d["name"] for d in docs}
    assert len(docs) >= 7
    for expected in ["Kavya", "Rohan", "Sneha"]:
        assert any(expected in n for n in names), f"missing doctor {expected}"
    for d in docs:
        assert "avatar" in d
        assert "experience_years" in d
        assert "rating" in d


def test_doctor_slots():
    docs = requests.get(f"{API}/doctors", timeout=15).json()["doctors"]
    kavya = next(d for d in docs if "Kavya" in d["name"])
    r = requests.get(f"{API}/doctors/{kavya['id']}/slots", timeout=15)
    assert r.status_code == 200
    slots = r.json()["slots"]
    assert len(slots) == 14
    assert all("time" in s and "available" in s for s in slots)
