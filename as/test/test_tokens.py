import pytest
from platform_core import tokens


@pytest.mark.no_token_patch
def test_get_graph_token_formats_header_and_uses_default_scope(monkeypatch):
    tokens._credential.cache_clear()

    class FakeCred:
        def get_token(self, scopes):
            assert scopes == ["https://graph.microsoft.com/.default"]
            return type("Tok", (), {"token": "abc"})()

    monkeypatch.setattr(tokens, "DefaultAzureCredential", lambda **_: FakeCred())
    assert tokens.get_graph_token() == {"Authorization": "Bearer abc"}


@pytest.mark.no_token_patch
def test_get_graph_token_custom_scopes(monkeypatch):
    tokens._credential.cache_clear()

    seen = {}

    class FakeCred:
        def get_token(self, scopes):
            seen["scopes"] = scopes
            return type("Tok", (), {"token": "xyz"})()

    monkeypatch.setattr(tokens, "DefaultAzureCredential", lambda **_: FakeCred())
    out = tokens.get_graph_token(scopes=["scope-1", "scope-2"])
    assert out == {"Authorization": "Bearer xyz"}
    assert seen["scopes"] == ["scope-1", "scope-2"]


@pytest.mark.no_token_patch
def test_credential_lru_cache_reuses_same_instance(monkeypatch):
    tokens._credential.cache_clear()

    instances = []

    class FakeCred:
        def __init__(self):
            instances.append(self)
        def get_token(self, scopes):
            return type("Tok", (), {"token": "t"})()

    monkeypatch.setattr(tokens, "DefaultAzureCredential", lambda **_: FakeCred())
    tokens.get_graph_token()
    tokens.get_graph_token()
    assert len(instances) == 1