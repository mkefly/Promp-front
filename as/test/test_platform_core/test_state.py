
import requests_mock
from platform_core.registry import get_platform_commands
from platform_core.state import JobState, JobPhase, TERMINAL

def test_terminal_set():
    assert JobState(JobPhase.SUCCEEDED, {}).is_terminal
    assert JobState(JobPhase.FAILED, {}).is_terminal
    assert JobState(JobPhase.ERROR, {}).is_terminal
    assert not JobState(JobPhase.RUNNING, {}).is_terminal


def test_terminal_phases_constant_matches_and_property():
    expected = {JobPhase.SUCCEEDED, JobPhase.FAILED, JobPhase.ERROR, JobPhase.TIMEOUT}
    assert TERMINAL == expected
    assert JobState(JobPhase.TIMEOUT, {}).is_terminal
    assert not JobState(JobPhase.PENDING, {}).is_terminal


def test_jobstate_message_optional_and_raw_status_passthrough():
    raw = {"status": "running", "extra": 1}
    s = JobState(JobPhase.RUNNING, raw_status=raw)
    assert s.raw_status is raw
    assert s.message is None
