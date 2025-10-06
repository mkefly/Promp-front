# ... existing code ...

import pytest
import requests
import requests_mock
from platform_core.registry import get_platform_commands
from platform_core.state import JobPhase
import requests_mock
from platform_core.registry import get_platform_commands
from platform_core.state import JobState, JobPhase, TERMINAL

def _make_submit():
    prov = get_platform_commands("dummy")
    return prov.submit()


def _make_status():
    prov = get_platform_commands("dummy")
    return prov.status()


def test_dummy_submit_and_status():
    prov = get_platform_commands("dummy")
    submit_cmd = prov.submit()
    status_cmd = prov.status()

    with requests_mock.Mocker() as m:
        m.post("http://dummy/submit", json={"job_id": "abc"}, status_code=200)
        plan = submit_cmd.execute({"task": "do", "params": {}})
        assert plan["job_id"] == "abc"
        assert plan["platform"] == "dummy"
        assert "aux" in plan and "base" in plan["aux"] and "headers" in plan["aux"]

        m.get("http://dummy/status/abc", json={"status": "running", "message": "ok"}, status_code=200)
        s = status_cmd.execute(plan)
        assert s.phase.value == "RUNNING"
        assert s.message == "ok"

        m.get("http://dummy/status/abc", json={"status": "succeeded"}, status_code=200)
        s2 = status_cmd.execute(plan)
        assert s2.phase.value == "SUCCEEDED"

def test_all_known_statuses_map_correctly():
    prov = get_platform_commands("dummy")
    submit_cmd = prov.submit()
    status_cmd = prov.status()

    with requests_mock.Mocker() as m:
        m.post("http://dummy/submit", json={"job_id": "j1"}, status_code=200)
        plan = submit_cmd.execute({"task": "x", "params": {}})

        cases = {
            "pending": JobPhase.PENDING,
            "running": JobPhase.RUNNING,
            "succeeded": JobPhase.SUCCEEDED,
            "failed": JobPhase.FAILED,
            "error": JobPhase.ERROR,
            "PeNdInG": JobPhase.PENDING,  # case-insensitive
        }
        for input_status, expected_phase in cases.items():
            m.get(f"http://dummy/status/{plan['job_id']}", json={"status": input_status}, status_code=200)
            st = status_cmd.execute(plan)
            assert st.phase is expected_phase

def test_submit_missing_job_id_raises():
    submit_cmd = _make_submit()
    with requests_mock.Mocker() as m:
        m.post("http://dummy/submit", json={}, status_code=200)
        with pytest.raises(RuntimeError, match="did not return 'job_id'"):
            submit_cmd.execute({"task": "x", "params": {}})


def test_submit_http_error_bubbles_up():
    submit_cmd = _make_submit()
    with requests_mock.Mocker() as m:
        m.post("http://dummy/submit", status_code=500)
        with pytest.raises(requests.HTTPError):
            submit_cmd.execute({"task": "x", "params": {}})


def test_status_unknown_maps_to_error_with_message():
    submit_cmd = _make_submit()
    status_cmd = _make_status()
    with requests_mock.Mocker() as m:
        m.post("http://dummy/submit", json={"job_id": "j1"}, status_code=200)
        plan = submit_cmd.execute({"task": "do", "params": {}})

        m.get("http://dummy/status/j1", json={"status": "weird"}, status_code=200)
        st = status_cmd.execute(plan)
        assert st.phase is JobPhase.ERROR
        assert st.message == "Unknown status: weird"


def test_status_error_uses_message_field_if_present():
    submit_cmd = _make_submit()
    status_cmd = _make_status()
    with requests_mock.Mocker() as m:
        m.post("http://dummy/submit", json={"job_id": "j2"}, status_code=200)
        plan = submit_cmd.execute({"task": "do", "params": {}})

        m.get("http://dummy/status/j2", json={"status": "error", "message": "boom"}, status_code=200)
        st = status_cmd.execute(plan)
        assert st.phase is JobPhase.ERROR
        assert st.message == "boom"


def test_status_http_error_bubbles_up():
    submit_cmd = _make_submit()
    status_cmd = _make_status()
    with requests_mock.Mocker() as m:
        m.post("http://dummy/submit", json={"job_id": "j3"}, status_code=200)
        plan = submit_cmd.execute({"task": "do", "params": {}})

        m.get("http://dummy/status/j3", status_code=503)
        with pytest.raises(requests.HTTPError):
            status_cmd.execute(plan)


def test_status_invalid_json_raises():
    submit_cmd = _make_submit()
    status_cmd = _make_status()
    with requests_mock.Mocker() as m:
        m.post("http://dummy/submit", json={"job_id": "j4"}, status_code=200)
        plan = submit_cmd.execute({"task": "do", "params": {}})

        m.get("http://dummy/status/j4", text="not-json", status_code=200)
        with pytest.raises(ValueError):
            status_cmd.execute(plan)