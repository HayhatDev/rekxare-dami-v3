"""Regression tests for provider-side throttling.

Groq caps this account at 1000 output tokens per minute, so oversized
`max_tokens` let one request consume the whole per-minute budget and push other
students into a 429. These tests pin both halves of the fix: requests ask for
what their response actually needs, and provider throttling is reported as a
429 with retry guidance instead of a generic "AI service broken" 502.
"""
import httpx
import pytest
from fastapi import HTTPException

from app.routes import ai as ai_routes
from app.routes.ai import (
    AIProviderRateLimited,
    MAX_TOKENS_ANALYZE,
    MAX_TOKENS_DASHBOARD,
    MAX_TOKENS_GENERATE,
    MAX_TOKENS_QUIZ,
    _ai_content_or_502,
    _call_gemini,
    _call_groq,
    call_ai,
)


class _Response:
    def __init__(self, status_code: int, text: str = "", payload: dict | None = None):
        self.status_code = status_code
        self.text = text
        self._payload = payload or {}

    def json(self) -> dict:
        return self._payload


def _patch_client(monkeypatch, response: _Response) -> list[dict]:
    """Replace httpx.AsyncClient so the provider call returns `response`."""
    seen: list[dict] = []

    class FakeClient:
        def __init__(self, *a, **kw):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

        async def post(self, url, headers=None, json=None, params=None, timeout=None):
            seen.append({"url": url, "json": json, "headers": headers})
            return response

    monkeypatch.setattr(httpx, "AsyncClient", FakeClient)
    return seen


# --- token budgets -------------------------------------------------------
# Groq's limit is 1000 output tokens/minute. Any single request asking for more
# than that can exhaust the shared budget for every concurrent student.


def test_token_budgets_fit_the_groq_per_minute_output_cap():
    budgets = [
        MAX_TOKENS_DASHBOARD,
        MAX_TOKENS_ANALYZE,
        MAX_TOKENS_QUIZ,
        MAX_TOKENS_GENERATE,
    ]
    assert all(b > 0 for b in budgets)
    # Only the schedule JSON genuinely needs more than the cap; it is the one
    # route that must stay generous, and it is cached for hours.
    assert MAX_TOKENS_GENERATE > 1000
    for budget in (MAX_TOKENS_DASHBOARD, MAX_TOKENS_ANALYZE, MAX_TOKENS_QUIZ):
        assert budget <= 1000, "one request must not be able to drain the per-minute cap"


def test_no_route_requests_the_oversized_shared_budget():
    """No route should ask for the old 4000 that caused the outage."""
    import inspect

    assert "max_tokens=4000" not in inspect.getsource(ai_routes)


# --- provider 429 detection ---------------------------------------------


@pytest.mark.asyncio
async def test_groq_429_raises_rate_limited(monkeypatch):
    _patch_client(monkeypatch, _Response(429, "rate limit reached"))
    with pytest.raises(AIProviderRateLimited):
        await _call_groq("hi", 0.4, 500)


@pytest.mark.asyncio
async def test_gemini_429_raises_rate_limited(monkeypatch):
    _patch_client(monkeypatch, _Response(429, "quota exceeded"))
    with pytest.raises(AIProviderRateLimited):
        await _call_gemini("hi", 0.4, 500)


@pytest.mark.asyncio
async def test_groq_500_stays_a_plain_failure(monkeypatch):
    """Only quota refusals are retriable-as-429; a real error is still a 502."""
    _patch_client(monkeypatch, _Response(500, "boom"))
    with pytest.raises(RuntimeError) as exc:
        await _call_groq("hi", 0.4, 500)
    assert not isinstance(exc.value, AIProviderRateLimited)


# --- call_ai routing -----------------------------------------------------


@pytest.mark.asyncio
async def test_primary_rate_limit_skips_retry_and_uses_fallback(monkeypatch):
    """A throttled primary cannot recover in 0.7s, so retrying only delays
    the fallback that actually has a chance of succeeding."""
    attempts = []

    async def primary(prompt, temperature, max_tokens):
        attempts.append("primary")
        raise AIProviderRateLimited("Groq returned 429")

    async def fallback(prompt, temperature, max_tokens):
        attempts.append("fallback")
        return "ok from fallback"

    monkeypatch.setattr(ai_routes, "GROQ_API_KEY", "k")
    monkeypatch.setattr(ai_routes, "GEMINI_API_KEY", "k")
    monkeypatch.setattr(ai_routes, "_call_groq", primary)
    monkeypatch.setattr(ai_routes, "_call_gemini", fallback)
    monkeypatch.setattr(ai_routes, "_RETRY_DELAY_SECONDS", 0)
    monkeypatch.setattr(ai_routes, "_PRIMARY_RETRIES", 2)

    out = await call_ai("hi", 0.4, 500, lang="en")
    assert out == "ok from fallback"
    # More retries configured than the old code would have used: a throttled
    # provider must still be tried exactly once.
    assert attempts == ["primary", "fallback"], "must not retry a throttled provider"


@pytest.mark.asyncio
async def test_both_providers_rate_limited_surfaces_as_rate_limited(monkeypatch):
    async def primary(prompt, temperature, max_tokens):
        raise AIProviderRateLimited("429")

    async def fallback(prompt, temperature, max_tokens):
        raise AIProviderRateLimited("429")

    monkeypatch.setattr(ai_routes, "GROQ_API_KEY", "k")
    monkeypatch.setattr(ai_routes, "GEMINI_API_KEY", "k")
    monkeypatch.setattr(ai_routes, "_call_groq", primary)
    monkeypatch.setattr(ai_routes, "_call_gemini", fallback)

    with pytest.raises(AIProviderRateLimited):
        await call_ai("hi", 0.4, 500, lang="en")


@pytest.mark.asyncio
async def test_transient_failure_still_retries_primary(monkeypatch):
    """Non-quota errors keep the original retry behaviour."""
    attempts = []

    async def primary(prompt, temperature, max_tokens):
        attempts.append("primary")
        raise RuntimeError("Groq returned 500")

    async def fallback(prompt, temperature, max_tokens):
        return "ok from fallback"

    monkeypatch.setattr(ai_routes, "GROQ_API_KEY", "k")
    monkeypatch.setattr(ai_routes, "GEMINI_API_KEY", "k")
    monkeypatch.setattr(ai_routes, "_call_groq", primary)
    monkeypatch.setattr(ai_routes, "_call_gemini", fallback)
    monkeypatch.setattr(ai_routes, "_RETRY_DELAY_SECONDS", 0)

    assert await call_ai("hi", 0.4, 500, lang="en") == "ok from fallback"
    assert len(attempts) == 2, "a 500 is worth one retry"


# --- HTTP mapping --------------------------------------------------------


@pytest.mark.asyncio
async def test_rate_limited_becomes_429_with_retry_after(monkeypatch):
    async def failing(prompt, temperature=0.4, max_tokens=500, lang="en"):
        raise AIProviderRateLimited("all throttled")

    monkeypatch.setattr(ai_routes, "call_ai", failing)

    with pytest.raises(HTTPException) as exc:
        await _ai_content_or_502("hi", "en", 500, 0.4)

    assert exc.value.status_code == 429
    assert exc.value.headers.get("Retry-After") == "60"
    assert "busy" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_real_outage_still_becomes_502(monkeypatch):
    async def failing(prompt, temperature=0.4, max_tokens=500, lang="en"):
        raise RuntimeError("All AI providers failed")

    monkeypatch.setattr(ai_routes, "call_ai", failing)

    with pytest.raises(HTTPException) as exc:
        await _ai_content_or_502("hi", "en", 500, 0.4)

    assert exc.value.status_code == 502