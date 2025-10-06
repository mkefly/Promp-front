# mlflow_provider.py

from __future__ import annotations

import os
import mlflow
from typing import Any, Dict, List, TypeAlias

from .commands import (
    PrepareCommand,
    SubmitCommand,
    GetStatusCommand,
    CallbackCommand,
)
from .registry import platform, Provider
from .state import JobState, JobPhase


Plan: TypeAlias = Dict[str, Any]
Payload: TypeAlias = Dict[str, Any]
Info: TypeAlias = Dict[str, Any]


class MlflowPrepare(PrepareCommand):
    def execute(self, payload: Payload) -> Payload:
        exp_name = payload.get("experiment_name")
        catalog = payload.get("catalog")
        schema = payload.get("schema")
        volume = payload.get("volume")

        if not exp_name:
            raise ValueError("Missing 'experiment_name' in payload.")
        if not (catalog and schema and volume):
            raise ValueError("Missing Unity Catalog location. Provide 'catalog', 'schema', and 'volume'.")

        uc_exp_name = f"{catalog}.{schema}.{exp_name}"
        artifact_location = f"dbfs:/Volumes/{catalog}/{schema}/{volume}"

        existing = mlflow.get_experiment_by_name(uc_exp_name)
        if existing is None:
            exp_id = mlflow.create_experiment(name=uc_exp_name, artifact_location=artifact_location)
        else:
            exp_id = existing.experiment_id

        new_payload: Payload = dict(payload)
        new_payload["experiment_id"] = exp_id
        new_payload["experiment_name"] = uc_exp_name
        return new_payload


class MlflowSubmit(SubmitCommand):
    def execute(self, payload: Payload) -> Plan:
        exp_id = payload.get("experiment_id")

        if not exp_id:
            raise ValueError("Missing 'experiment_id' in payload. Run PrepareCommand first.")


        plan: Plan = dict(payload)
        plan.update({"experiment_id": exp_id})
        return plan


class MlflowGetStatus(GetStatusCommand):
    def execute(self, plan: Plan) -> JobState:
        exp_id = plan.get("experiment_id")
        filter_string = plan.get("filter_string")
        if not exp_id:
            return JobState(
                phase=JobPhase.ERROR,
                raw_status=None,
                message="Missing 'experiment_id' in plan",
                output=None,
            )

        try:
            runs = mlflow.search_runs(experiment_ids=[exp_id])
        except Exception as e:
            return JobState(
                phase=JobPhase.ERROR,
                raw_status=None,
                message=f"Error searching runs: {e}",
                output=None,
            )

        if not runs:
            # 👉 As requested: pending until one run starts (no internal waiting)
            return JobState(
                phase=JobPhase.PENDING,
                raw_status={"active": 0, "total": 0},
                message="No runs found for this experiment yet.",
                output=None,
            )

        def _is_active_status(status: str | None) -> bool:
            s = (status or "").upper()
            return s in {"SCHEDULED", "RUNNING"}


        def _is_failed_status(status: str | None) -> bool:
            s = (status or "").upper()
            return s in {"FAILED", "KILLED"}

        active = [r for r in runs if _is_active_status(r.info.status)]
        failed = [r for r in runs if _is_failed_status(r.info.status)]

        if active:
            return JobState(
                phase=JobPhase.RUNNING,
                raw_status={"active": len(active), "total": len(runs)},
                message=None,
                output=None,
            )

        model_ids = mlflow.search_logged_models(
            experiment_ids=[exp_id],
            filter_string=filter_string, 
            output_format="list"
        )

        phase = JobPhase.FAILED if failed and not model_ids else JobPhase.SUCCEEDED
        return JobState(
            phase=phase,
            raw_status={"active": 0, "total": len(runs)},
            message=None,
            output={"model_ids": model_ids},
        )


class MlflowCallback(CallbackCommand):
    def execute(self, job_state: JobState) -> Info:
        """
        No-op callback; returns a small echo payload so callers can chain behavior if desired.
        """
        out: Info = {
            "phase": getattr(job_state, "phase", None),
            "output": getattr(job_state, "output", None),
        }
        return out


@platform("mlflow")
class MlflowProvider(Provider):
    prepare = MlflowPrepare
    submit = MlflowSubmit
    status = MlflowGetStatus
    callback = MlflowCallback
