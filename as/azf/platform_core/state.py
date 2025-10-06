from enum import Enum
from dataclasses import dataclass
from typing import Any, Optional

class JobPhase(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    ERROR = "ERROR"
    TIMEOUT = "TIMEOUT"

TERMINAL = {
    JobPhase.SUCCEEDED,
    JobPhase.FAILED,
    JobPhase.ERROR,
    JobPhase.TIMEOUT
}

@dataclass
class JobState:
    phase: JobPhase
    raw_status: Any
    message: Optional[str] = None
    output: Optional[Any] = None

    @property
    def is_terminal(self) -> bool:
        return self.phase in TERMINAL
