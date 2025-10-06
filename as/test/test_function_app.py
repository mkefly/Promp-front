# test_function_app.py
import asyncio
import json
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from types import SimpleNamespace
from typing import Callable, Dict, Any, Iterable, List
from unittest.mock import AsyncMock, Mock, call
from platform_core.state import JobState
import pytest
import azure.functions as func
import azure.durable_functions as df
from azure.durable_functions.testing import orchestrator_generator_wrapper

from function_app import (
    http_start,
    orchestrate_submission,
    submit_activity,
    get_status_activity,
    callback_activity,
)


class FakeTask:
    def __init__(self, result=None):
        self.result = result

@pytest.fixture
def fake_task_cls():
    return FakeTask

@pytest.fixture
def start_time():
    return datetime(2023, 1, 1, 12, 0, tzinfo=timezone.utc)

@pytest.fixture
def http_start_func():
    return http_start.build().get_user_function().client_function

@pytest.fixture
def orchestrator_func():
    return orchestrate_submission.build().get_user_function().orchestrator_function

@pytest.fixture
def make_http_request():
    def _make(method="POST", url="/api/orchestrators/dummy", route_params=None, body=None, headers=None, params=None):
        return func.HttpRequest(
            method=method,
            url=url,
            headers=headers or {},
            params=params or {},
            route_params=route_params or {},
            body=(json.dumps(body).encode("utf-8") if body is not None else b""),
        )
    return _make

@pytest.fixture
def make_ctx(fake_task_cls):
    def _make(
        input_payload: Dict[str, Any],
        *,
        now: datetime,
        call_activity_side_effect: Callable[[str, Dict[str, Any]], FakeTask],
        timer_advances_time: bool = True,
    ):
        ctx = Mock(spec=df.DurableOrchestrationContext)
        ctx.get_input.return_value = input_payload
        ctx.current_utc_datetime = now

        def timer_side_effect(fire_at):
            if timer_advances_time:
                ctx.current_utc_datetime = fire_at
            return fake_task_cls(None)

        ctx.call_activity.side_effect = call_activity_side_effect
        ctx.create_timer.side_effect = timer_side_effect
        return ctx
    return _make

def run_orchestrator(orchestrator_func, ctx) -> List[Any]:
    user_orchestrator = orchestrator_func(ctx)
    return list(orchestrator_generator_wrapper(user_orchestrator))

def test_http_start_adds_platform_and_starts_instance(http_start_func, make_http_request):
    body = {"payload": {"foo": "bar"}, "callback_url": "http://callback.example/test"}
    req = make_http_request(route_params={"platform": "dummy"}, body=body)

    client = Mock(spec=df.DurableOrchestrationClient)
    client.start_new = AsyncMock(return_value="iid-123")
    client.create_check_status_response = Mock(return_value="check-status-response")

    result = asyncio.run(http_start_func(req, client))

    client.start_new.assert_called_once_with(
        "orchestrate_submission",
        client_input={"payload": {"foo": "bar"}, "callback_url": "http://callback.example/test", "platform": "dummy"},
    )
    client.create_check_status_response.assert_called_once_with(req, "iid-123")
    assert result == "check-status-response"

@pytest.mark.parametrize(
    "payload,poll_s,timeout_s,sequence,expect_timer_calls,expect_values_last",
    [
        (
            {"x": 1}, 5, 600,
            [JobState(phase="SUCCEEDED", raw_status={"ok": True}, message="done", output=["1", "2"])],
            0,
            {
                "phase": "SUCCEEDED", "raw_status": {"ok": True}, "message": "done", "output": ["1", "2"],
            },
        ),
        (
            {"x": 2}, 10, 120,
            [
                JobState(phase="RUNNING",  raw_status={"step": 1}, message="still running"),
                JobState(phase="SUCCEEDED", raw_status={"step": 2}, message="done", output=["1", "2"]),
            ],
            1,
            {
                "phase": "SUCCEEDED", "raw_status": {"step": 2}, "message": "done", "output": ["1", "2"],
            },
        ),
    ],
)
def test_orchestrator_paths(
    orchestrator_func,
    make_ctx,
    start_time,
    fake_task_cls,
    payload,
    poll_s,
    timeout_s,
    sequence: Iterable[JobState],
    expect_timer_calls: int,
    expect_values_last: Dict[str, Any],
):
    job_id = "jid-imm" if len(sequence) == 1 else "jid-poll"
    req_input = {
        "platform": "dummy",
        "payload": payload,
        "callback_url": "http://callback.example/test" if len(sequence) == 1 else "http://callback.example/after-poll",
        "poll_s": poll_s,
        "timeout_s": timeout_s,
    }
    plan = {"platform": "dummy", "job_id": job_id}
    seq_iter = iter(sequence)

    def call_activity_side_effect(name, args):
        if name == "prepare_activity":
            assert args["platform"] == "dummy"
            assert args["payload"] == payload
            return fake_task_cls(payload)

        if name == "submit_activity":
            assert args["platform"] == "dummy"
            assert args["payload"] == payload
            return fake_task_cls(plan)

        if name == "get_status_activity":
            assert args["platform"] == "dummy"
            assert args["plan"] == plan
            s = next(seq_iter)
            return fake_task_cls(JobState(**{"phase": s.phase, "raw_status": s.raw_status, "message": s.message, "output": s.output}))

        if name == "callback_activity":
            return fake_task_cls(None)

        raise AssertionError(f"Unexpected activity: {name}")

    ctx = make_ctx(req_input, now=start_time, call_activity_side_effect=call_activity_side_effect, timer_advances_time=True)
    values = run_orchestrator(orchestrator_func, ctx)

    get_status_calls = [c for c in ctx.call_activity.call_args_list if c.args[0] == "get_status_activity"]
    assert len(get_status_calls) == len(sequence)

    assert ctx.create_timer.call_count == expect_timer_calls

    callback_calls = [c for c in ctx.call_activity.call_args_list if c.args[0] == "callback_activity"]
    assert len(callback_calls) == 1
    cb_payload = callback_calls[0].args[1]
    assert "callback_url" in cb_payload and "result" in cb_payload
    # get_status_activity is mocked to return dicts, so this stays a dict here
    assert cb_payload["result"].phase == expect_values_last["phase"]

    assert values[-1] == JobState(**expect_values_last)

def test_submit_activity_invokes_platform_submit(monkeypatch):
    import function_app

    submit_cmd = Mock()
    submit_cmd.execute.return_value = {"job_id": "jid-123"}
    registry = Mock()
    registry.submit.return_value = submit_cmd

    monkeypatch.setattr(function_app, "get_platform_commands", lambda platform: registry)

    args = {"platform": "dummy", "payload": {"k": "v"}}
    result = submit_activity(args)

    registry.submit.assert_called_once_with()
    submit_cmd.execute.assert_called_once_with({"k": "v"})
    assert result == {"job_id": "jid-123"}

@pytest.mark.parametrize(
    "phase,message,raw,expected_phase",
    [
        ("SUCCEEDED", "ok", {"progress": 100}, "SUCCEEDED"),
        ("FAILED", "boom", {"err": "E"}, "FAILED"),
        ("RUNNING", "still", {"pct": 50}, "RUNNING"),
    ],
)
def test_get_status_activity_maps_jobstate(monkeypatch, phase, message, raw, expected_phase):
    import function_app

    fake_state = SimpleNamespace(
        phase=SimpleNamespace(value=phase),
        raw_status=raw,
        message=message,
    )

    status_cmd = Mock()
    status_cmd.execute.return_value = fake_state
    registry = Mock()
    registry.status.return_value = status_cmd

    monkeypatch.setattr(function_app, "get_platform_commands", lambda platform: registry)

    args = {"platform": "dummy", "plan": {"job_id": "jid-123"}}
    result = get_status_activity(args)

    registry.status.assert_called_once_with()
    status_cmd.execute.assert_called_once_with({"job_id": "jid-123"})

    # Adapted to object-style response (not dict)
    assert result.phase.value == expected_phase
    assert result.raw_status == raw
    assert result.message == message

def test_callback_activity_posts_json(monkeypatch):
    import function_app

    post_mock = Mock()
    monkeypatch.setattr(function_app, "requests", SimpleNamespace(post=post_mock))

    args = {
        "callback_url": "http://callback.example/receive",
        "result": {"phase": "SUCCEEDED", "data": {"a": 1}},
    }
    callback_activity(args)

    post_mock.assert_called_once()
    (url,) = post_mock.call_args.args
    assert url == "http://callback.example/receive"
    kwargs = post_mock.call_args.kwargs
    assert kwargs["headers"] == {"Content-Type": "application/json"}
    assert kwargs["timeout"] == 30
    assert json.loads(kwargs["data"]) == {"phase": "SUCCEEDED", "data": {"a": 1}}