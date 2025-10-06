import os
import sys
import pytest
import time

_TESTS_DIR = os.path.dirname(__file__)
_AZF_DIR = os.path.abspath(os.path.join(_TESTS_DIR, "..", "azf"))
if _AZF_DIR not in sys.path:
    sys.path.insert(0, _AZF_DIR)

import platform_core.providers.dummy  # noqa: F401

def pytest_configure(config):
    config.addinivalue_line(
        "markers",
        "no_token_patch: skip/alter token patching in tests that need raw behavior",
    )

@pytest.fixture(autouse=True)
def _env_dummy_base_url(monkeypatch):
    monkeypatch.setenv("DUMMY_BASE_URL", "http://dummy")
    yield

@pytest.fixture(autouse=True)
def _patch_credential(monkeypatch, request):
    if request.node.get_closest_marker("no_token_patch"):
        yield
        return

    class _FakeAccessToken:
        def __init__(self, token="test-token", expires_in=3600):
            self.token = token
            self.expires_on = int(time.time()) + expires_in

    class _FakeCredential:
        def get_token(self, *scopes, **kwargs):
            if not scopes and "scopes" in kwargs:
                _ = kwargs["scopes"]
            return _FakeAccessToken()

    fake_cred = _FakeCredential()

    try:
        import platform_core.tokens as tokens_mod
        monkeypatch.setattr(tokens_mod, "_credential", lambda: fake_cred, raising=True)
    except ImportError:
        pass

    try:
        import azf.platform_core.tokens as tokens_mod_azf
        monkeypatch.setattr(tokens_mod_azf, "_credential", lambda: fake_cred, raising=True)
    except ImportError:
        pass

    yield

