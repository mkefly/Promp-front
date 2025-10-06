from abc import ABC, abstractmethod
from typing import Any, Dict, TypeAlias
from .state import JobState  # Ensure this module exists alongside this file

Plan: TypeAlias = Dict[str, Any]
Payload: TypeAlias = Dict[str, Any]
Info: TypeAlias = Dict[str, Any]

class PrepareCommand(ABC):
    @abstractmethod
    def execute(self, payload: Payload) -> Payload:
        ...

class SubmitCommand(ABC):
    @abstractmethod
    def execute(self, payload: Payload) -> Plan:
        ...

class GetStatusCommand(ABC):
    @abstractmethod
    def execute(self, plan: Plan) -> JobState:
        ...

class CallbackCommand(ABC):
    @abstractmethod
    def execute(self, job_state: JobState) -> Info:
        ...
