from azure.identity import DefaultAzureCredential
from functools import lru_cache
from typing import Dict

_GRAPH_SCOPE = "https://graph.microsoft.com/.default"

@lru_cache(maxsize=1)
def _credential():
    return DefaultAzureCredential(exclude_interactive_browser_credential=False)

def get_graph_token(scopes: list[str] = [_GRAPH_SCOPE]) -> Dict[str, str]:
    token = _credential().get_token(scopes=scopes)
    return {"Authorization": f"Bearer {token.token}"}
