
from typing import Dict, Type, Any
from .commands import PrepareCommand, SubmitCommand, GetStatusCommand, CallbackCommand

_REGISTRY: Dict[str, "Provider"] = {}

class Provider:
    prepare: Type[PrepareCommand]
    submit: Type[SubmitCommand]
    status: Type[GetStatusCommand]
    callback: Type[CallbackCommand]

def platform(name: str):
    def _wrap(cls: Type[Provider]):
        _REGISTRY[name.lower()] = cls
        return cls
    return _wrap

def get_platform_commands(platform: str) -> Type[Provider]:
    try:
        prov = _REGISTRY[platform.lower()]
    except KeyError as e:
        raise ValueError(f"Unsupported platform '{platform}'") from e
    return prov
