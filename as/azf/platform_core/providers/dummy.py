import os
import requests
from typing import Dict, Any

from ..tokens import get_graph_token
from ..commands import PrepareCommand, SubmitCommand, GetStatusCommand, Plan
from ..state import JobState, JobPhase
from ..registry import platform, Provider

class DummySubmit(SubmitCommand):
    def __init__(self):
        pass

    def execute(self, payload: Dict[str, Any]) -> Plan:
        base = os.environ["DUMMY_BASE_URL"].rstrip("/")
        headers = {"Content-Type": "application/json", **get_graph_token()}

        res = requests.post(f"{base}/submit", json=payload, headers=headers, timeout=30)
        res.raise_for_status()
        job_id = (res.json() or {}).get("job_id")
        if not job_id:
            raise RuntimeError("Dummy submit did not return 'job_id'")

        return {
            "platform": "dummy",
            "job_id": str(job_id),
            "aux": {"base": base, "headers": headers},
        }

class DummyGetStatus(GetStatusCommand):
    def execute(self, plan: Plan) -> JobState:
        base = plan["aux"]["base"]
        headers = plan["aux"]["headers"]
        job_id = plan["job_id"]

        res = requests.get(f"{base}/status/{job_id}", headers=headers, timeout=15)
        res.raise_for_status()
        j = res.json() or {}

        status = (j.get("status") or "").lower()
        phase = {
            "pending":   JobPhase.PENDING,
            "running":   JobPhase.RUNNING,
            "succeeded": JobPhase.SUCCEEDED,
            "failed":    JobPhase.FAILED,
            "error":     JobPhase.ERROR,
        }.get(status, JobPhase.ERROR)
        msg = j.get("message") if phase is not JobPhase.ERROR or status == "error" else f"Unknown status: {status}"
        return JobState(phase, raw_status=j, message=msg)

@platform("dummy")
class DummyProvider(Provider):
    prepare  = PrepareCommand
    submit   = DummySubmit
    status   = DummyGetStatus
