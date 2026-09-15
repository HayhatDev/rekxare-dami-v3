import os
import re
from pathlib import Path
import httpx
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BACKEND_DIR / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

_SAFE_KEY_RE = re.compile(r"[^a-zA-Z0-9_-]")

_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=30.0)
    return _client


def _server_key() -> str:
    """Return the service role key for server-side ops, falling back to anon key."""
    return SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY


async def supabase_request(method: str, path: str, data=None, headers: dict | None = None):
    """Make an async request to Supabase REST API using the service role key."""
    key = _server_key()
    req_headers = {
        "Authorization": f"Bearer {key}",
        "apikey": key,
        "Content-Type": "application/json"
    }
    if headers:
        req_headers.update(headers)

    client = _get_client()
    response = await client.request(
        method,
        f"{SUPABASE_URL}/rest/v1/{path}",
        headers=req_headers,
        json=data
    )
    response.raise_for_status()
    return response.json() if response.text else {}


def get_supabase():
    """For compatibility with existing code."""
    return {"url": SUPABASE_URL, "key": _server_key()}


def sanitize_key(user_id: str) -> str:
    """Strip all characters except alphanumerics, underscores, and hyphens. Max 128 chars."""
    return _SAFE_KEY_RE.sub("", user_id)[:128]