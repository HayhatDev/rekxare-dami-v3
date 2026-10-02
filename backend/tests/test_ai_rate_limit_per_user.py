"""End-to-end check that the AI rate limits are keyed per student.

The unit test for get_account_key proves the key function works in isolation.
This test proves the wiring that actually matters: FastAPI resolves the auth
dependency before slowapi's decorator checks the limit, so request.state.user_id
is populated in time. If that ordering ever breaks, students go back to sharing
one bucket by IP -- which is the bug this whole change exists to fix.
"""
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.utils.auth import require_auth
from app.utils.rate_limit import get_account_key, get_client_key, limiter


@pytest.fixture
def client(monkeypatch):
    """Two students sharing one client IP, hitting a per-account limited route."""
    from app.utils import auth as auth_mod

    users = {"token-a": "student-a", "token-b": "student-b"}

    async def fake_decode_token(token: str) -> dict:
        if token not in users:
            from fastapi import HTTPException

            raise HTTPException(status_code=401, detail="Invalid token")
        return {"sub": users[token]}

    monkeypatch.setattr(auth_mod, "decode_token", fake_decode_token)

    from fastapi import Request
    from fastapi.responses import JSONResponse
    from slowapi.errors import RateLimitExceeded

    app = FastAPI()
    app.state.limiter = limiter

    @app.exception_handler(RateLimitExceeded)
    async def _on_limit(request, exc: RateLimitExceeded):
        return JSONResponse(status_code=429, content={"error": f"Rate limit exceeded: {exc.detail}"})

    @app.get("/probe")
    @limiter.limit("2/hour", key_func=get_account_key)
    async def probe(request: Request, user: dict = Depends(require_auth)):
        return {"user": user.get("sub")}

    limiter.reset()
    with TestClient(app) as c:
        yield c
    limiter.reset()


def test_students_behind_one_ip_have_separate_budgets(client):
    """The whole point: same IP, different students, independent limits."""
    r = client.get("/probe", headers={"Authorization": "Bearer token-a"})
    assert r.status_code == 200
    assert r.json() == {"user": "student-a"}

    r = client.get("/probe", headers={"Authorization": "Bearer token-a"})
    assert r.status_code == 200

    # Exhaust student-a's 2/hour budget.
    r = client.get("/probe", headers={"Authorization": "Bearer token-a"})
    assert r.status_code == 429, "third call should exhaust the limit"

    # Student-b shares the same client IP but must NOT be affected.
    r = client.get("/probe", headers={"Authorization": "Bearer token-b"})
    assert r.status_code == 200, "a classmate's limit must not rate-limit this student"
    assert r.json() == {"user": "student-b"}

    r = client.get("/probe", headers={"Authorization": "Bearer token-b"})
    assert r.status_code == 200
    r = client.get("/probe", headers={"Authorization": "Bearer token-b"})
    assert r.status_code == 429, "student-b has their own independent budget"


def test_unauthenticated_requests_are_rejected(client):
    r = client.get("/probe")
    assert r.status_code == 401
