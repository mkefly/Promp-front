import azure.functions as func
import azure.durable_functions as df
from datetime import timedelta
from typing import Dict, Any
from platform_core.registry import get_platform_commands
from platform_core.state import JobState, JobPhase
from platform_core.commands import Plan
import requests
import json

app = df.DFApp(http_auth_level=func.AuthLevel.ANONYMOUS)

@app.route(route="orchestrators/{platform}", methods=["POST"])
@app.durable_client_input(client_name="client")
async def http_start(req: func.HttpRequest, client: df.DurableOrchestrationClient):
    platform = req.route_params.get("platform")
    body = req.get_json()
    body = body or {}
    body["platform"] = platform
    instance_id = await client.start_new("orchestrate_submission", client_input=body)
    return client.create_check_status_response(req, instance_id)


@app.orchestration_trigger(context_name="ctx")
def orchestrate_submission(ctx: df.DurableOrchestrationContext):
    req: Dict[str, Any] = ctx.get_input() or {}
    platform = req["platform"]
    payload = req["payload"]
    callback_url = req["callback_url"]
    poll_s = int(req.get("poll_s", 10))
    timeout_s = int(req.get("timeout_s", 3600))

    prepared_payload = yield ctx.call_activity(
        "prepare_activity",
        {
            "platform": platform, 
            "payload": payload
        }
    )

    plan = yield ctx.call_activity(
        "submit_activity",
        {
            "platform": platform, 
            "payload": prepared_payload
        }
    )

    final_job_state = yield from wait_for_plan_status(
        ctx=ctx,
        platform=platform,
        plan=plan,
        timeout_s=timeout_s, 
        poll_s=poll_s
    )

    yield ctx.call_activity(
        "callback_activity",
        {
            "callback_url": callback_url,
            "result": final_job_state
        }
    )

    return final_job_state

@app.activity_trigger(input_name="submit")
def submit_activity(submit: Dict[str, Any]) -> Plan:
    submit_cmd = get_platform_commands(submit["platform"]).submit()
    plan = submit_cmd.execute(submit["payload"])
    return plan

@app.activity_trigger(input_name="args")
def get_status_activity(plan: Dict[str, Any]) -> JobState:
    status_cmd = get_platform_commands(plan["platform"]).status()
    state: JobState = status_cmd.execute(plan["plan"])
    return state

@app.activity_trigger(input_name="args")
def callback_activity(args: Dict[str, Any]) -> None:
    callback_url = args["callback_url"]
    result = args["result"]
    headers = {"Content-Type": "application/json"}
    requests.post(callback_url, data=json.dumps(result), headers=headers, timeout=30)


def wait_for_plan_status(ctx, platform, plan, timeout_s, poll_s) -> JobState:
    deadline = ctx.current_utc_datetime + timedelta(seconds=timeout_s)

    while True:
        job_state: JobState = yield ctx.call_activity(
            "get_status_activity",
            {"platform": platform, "plan": plan}
        )
        if job_state.is_terminal:
            break

        now = ctx.current_utc_datetime
        if now >= deadline:
            job_state.phase = JobPhase.TIMEOUT
            break

        yield ctx.create_timer(now + timedelta(seconds=poll_s))
    return job_state
