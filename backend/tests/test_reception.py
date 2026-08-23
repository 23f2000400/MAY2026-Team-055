"""Receptionist overview and stats backend tests."""
import requests
from conftest import API, _h


def test_reception_overview(recep_ctx):
    r = requests.get(f"{API}/reception/overview", headers=_h(recep_ctx), timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert "total" in j
    assert "doctors" in j
    # Verify all returned doctors belong to the receptionist's assigned hospital
    user_hospital = recep_ctx["user"].get("hospital")
    if user_hospital:
        for doc_entry in j["doctors"]:
            assert doc_entry["doctor"]["hospital"] == user_hospital


def test_reception_doctors(recep_ctx):
    r = requests.get(f"{API}/reception/doctors", headers=_h(recep_ctx), timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert "doctors" in j
    user_hospital = recep_ctx["user"].get("hospital")
    if user_hospital:
        for d in j["doctors"]:
            assert d["hospital"] == user_hospital


def test_receptionist_hospital_isolation(admin_ctx):
    import time
    # 1. Admin creates a receptionist specifically for Meera Multispeciality, Chennai
    email = f"qa+recep_chennai_{int(time.time()*1000)}@nirog.in"
    create_payload = {
        "name": "Chennai Receptionist",
        "email": email,
        "password": "chennaipassword123",
        "hospital": "Meera Multispeciality, Chennai",
        "phone": "+919876543210"
    }
    cr = requests.post(f"{API}/admin/receptionists", json=create_payload, headers=_h(admin_ctx), timeout=15)
    assert cr.status_code == 200, cr.text

    # 2. Login as the Chennai receptionist
    lr = requests.post(f"{API}/auth/login", json={"email": email, "password": "chennaipassword123"}, timeout=15)
    assert lr.status_code == 200, lr.text
    chennai_ctx = lr.json()

    # 3. Fetch reception overview
    ov_r = requests.get(f"{API}/reception/overview", headers=_h(chennai_ctx), timeout=15)
    assert ov_r.status_code == 200
    doctors = ov_r.json()["doctors"]

    # 4. Verify only doctors of Meera Multispeciality, Chennai are visible
    for doc_entry in doctors:
        assert doc_entry["doctor"]["hospital"] == "Meera Multispeciality, Chennai"
        assert "Sanjeevani Clinic" not in doc_entry["doctor"]["hospital"]

