"""Receptionist overview and stats backend tests."""
import requests
from conftest import API, _h


def test_reception_overview(recep_ctx):
    r = requests.get(f"{API}/reception/overview", headers=_h(recep_ctx), timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert "total" in j
