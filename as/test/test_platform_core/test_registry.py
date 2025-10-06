import pytest
import requests_mock
from platform_core.registry import get_platform_commands

def test_get_platform_commands_case_insensitive():
    assert get_platform_commands("DUMMY")
    assert get_platform_commands("dummy")
    assert get_platform_commands("DuMmY")


def test_unsupported_platform_raises_value_error():
    with pytest.raises(ValueError, match="Unsupported platform 'nope'"):
        get_platform_commands("nope")


def test_submit_includes_content_type_and_auth_headers(monkeypatch):
    monkeypatch.setenv("DUMMY_BASE_URL", "http://dummy/")
    prov = get_platform_commands("dummy")
    submit_cmd = prov.submit()

    with requests_mock.Mocker() as m:
        m.post("http://dummy/submit", json={"job_id": "jj"}, status_code=200)
        plan = submit_cmd.execute({"task": "x", "params": {}})

        req = m.request_history[0]
        assert req.headers["Content-Type"] == "application/json"
        assert req.headers["Authorization"] == "Bearer test-token"
        assert req.url == "http://dummy/submit"

    status_cmd = prov.status()
    with requests_mock.Mocker() as m:
        m.get("http://dummy/status/jj", json={"status": "pending"}, status_code=200)
        st = status_cmd.execute(plan)
        assert st.raw_status == {"status": "pending"}
