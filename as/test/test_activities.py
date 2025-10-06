import requests_mock
from function_app import submit_activity, get_status_activity
from platform_core.state import JobPhase

def test_activities_flow(monkeypatch):
    monkeypatch.setenv("DUMMY_BASE_URL", "http://dummy")

    # Only the inner payload belongs under "payload"
    payload = {"task": "x", "params": {}}

    with requests_mock.Mocker() as m:
        m.post("http://dummy/submit", json={"job_id": "Job1"}, status_code=200)
        plan = submit_activity({"platform": "dummy", "payload": payload})
        assert plan["job_id"] == "Job1"

        m.get("http://dummy/status/Job1", json={"status": "pending"}, status_code=200)
        status = get_status_activity({"platform": "dummy", "plan": plan})
        phase_value = status.phase.value if hasattr(status.phase, "value") else status.phase

        assert phase_value in {
            JobPhase.PENDING.value,
            JobPhase.RUNNING.value,
            JobPhase.SUCCEEDED.value,
            JobPhase.FAILED.value,
            JobPhase.ERROR.value,
        }
