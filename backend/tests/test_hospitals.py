"""Hospital directory backend tests."""
import requests
from conftest import API


def test_list_hospitals():
    r = requests.get(f"{API}/hospitals", timeout=15)
    assert r.status_code == 200
    hospitals = r.json()["hospitals"]
    assert len(hospitals) >= 3
    required_fields = {"id", "name", "city", "area", "rating", "reviews", "image", "tags", "doctor_count", "specialties", "min_fee"}
    for h in hospitals:
        missing = required_fields - set(h.keys())
        assert not missing, f"hospital {h.get('name')} missing fields: {missing}"


def test_hospital_doctors_endpoint():
    hospitals = requests.get(f"{API}/hospitals", timeout=15).json()["hospitals"]
    sanj = next(h for h in hospitals if "sanjeevani" in h["id"])
    r = requests.get(f"{API}/hospitals/{sanj['id']}/doctors", timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert j["hospital"]["id"] == sanj["id"]
    assert "city" in j["hospital"]

    r404 = requests.get(f"{API}/hospitals/does-not-exist/doctors", timeout=15)
    assert r404.status_code == 404
