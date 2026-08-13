"""Auth & Profile backend tests."""
import time
import requests
from conftest import API, _h


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
