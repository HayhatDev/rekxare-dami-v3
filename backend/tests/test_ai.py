import pytest
from app.routes import ai


class _Resp:
    def __init__(self, status_code, body):
        self.status_code = status_code
        self._body = body

    def json(self):
        return self._body

    @property
    def text(self):
        return str(self._body)


class _CtxClient:
    def __init__(self, resp):
        self._resp = resp

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    async def post(self, *a, **k):
        return self._resp


@pytest.mark.asyncio
async def test_gemini_empty_content_raises(monkeypatch):
    """Thinking-model empty reply must raise so call_ai can fall back to Groq."""
    body = {"candidates": [{"content": {}, "finishReason": "MAX_TOKENS"}]}
    monkeypatch.setattr(ai.httpx, "AsyncClient", lambda *a, **k: _CtxClient(_Resp(200, body)))
    with pytest.raises(RuntimeError, match="empty content"):
        await ai._call_gemini("hi", 0.4, 20)


@pytest.mark.asyncio
async def test_gemini_non200_raises(monkeypatch):
    monkeypatch.setattr(ai.httpx, "AsyncClient", lambda *a, **k: _CtxClient(_Resp(503, {})))
    with pytest.raises(RuntimeError, match="503"):
        await ai._call_gemini("hi", 0.4, 20)


@pytest.mark.asyncio
async def test_gemini_happy_path_returns_text(monkeypatch):
    body = {"candidates": [{"content": {"parts": [{"text": "ئەوەیە نموونە"}]}}]}
    monkeypatch.setattr(ai.httpx, "AsyncClient", lambda *a, **k: _CtxClient(_Resp(200, body)))
    out = await ai._call_gemini("hi", 0.4, 20)
    assert "نموونە" in out


@pytest.mark.asyncio
async def test_kurdish_routes_to_gemini_first_falls_back_to_groq(monkeypatch):
    """badini/sorani use Gemini as primary; failed Gemini falls back to Groq."""
    calls = []

    async def gemini_fail(prompt, t, m):
        calls.append("gemini")
        raise RuntimeError("Gemini returned empty content")

    async def gemini_ok(prompt, t, m):
        calls.append("gemini")
        return "ئەوەیە وەڵام"

    async def groq_ok(prompt, t, m):
        calls.append("groq")
        return '{"questions": []}'

    monkeypatch.setattr(ai, "_PRIMARY_RETRIES", 0)
    monkeypatch.setattr(ai, "_call_gemini", gemini_fail)
    monkeypatch.setattr(ai, "_call_groq", groq_ok)
    monkeypatch.setattr(ai, "GEMINI_API_KEY", "set")
    monkeypatch.setattr(ai, "GROQ_API_KEY", "set")
    out = await ai.call_ai("hi", lang="badini")
    assert out == '{"questions": []}'
    assert calls == ["gemini", "groq"]

    calls.clear()
    monkeypatch.setattr(ai, "_call_gemini", gemini_ok)
    out = await ai.call_ai("hi", lang="sorani")
    assert "وەڵام" in out
    assert calls == ["gemini"]


@pytest.mark.asyncio
async def test_english_routes_to_groq_first(monkeypatch):
    calls = []

    async def groq_ok(prompt, t, m):
        calls.append("groq")
        return "ok"

    async def gemini_ok(prompt, t, m):
        calls.append("gemini")
        return "should-not-be-first"

    monkeypatch.setattr(ai, "_call_gemini", gemini_ok)
    monkeypatch.setattr(ai, "_call_groq", groq_ok)
    monkeypatch.setattr(ai, "GEMINI_API_KEY", "set")
    monkeypatch.setattr(ai, "GROQ_API_KEY", "set")
    out = await ai.call_ai("hi", lang="en")
    assert out == "ok"
    assert calls == ["groq"]


@pytest.mark.asyncio
async def test_call_ai_retries_transient_primary_failure_then_succeeds(monkeypatch):
    """A blip on the primary provider is retried in place, not sent to the fallback."""
    calls = []

    async def gemini_flaky(prompt, t, m):
        calls.append("gemini")
        if len(calls) == 1:
            raise RuntimeError("Gemini returned 503")
        return '{"questions": []}'

    async def groq_unreachable(prompt, t, m):
        calls.append("groq")
        return "should-not-be-reached"

    monkeypatch.setattr(ai, "_RETRY_DELAY_SECONDS", 0.0)
    monkeypatch.setattr(ai, "_call_gemini", gemini_flaky)
    monkeypatch.setattr(ai, "_call_groq", groq_unreachable)
    monkeypatch.setattr(ai, "GEMINI_API_KEY", "set")
    monkeypatch.setattr(ai, "GROQ_API_KEY", "set")
    out = await ai.call_ai("hi", lang="badini")
    assert out == '{"questions": []}'
    assert calls == ["gemini", "gemini"]


@pytest.mark.asyncio
async def test_call_ai_retries_primary_then_falls_back_when_persistent(monkeypatch):
    """Persistent primary failure: default 1 retry (2 attempts), then fallback."""
    calls = []

    async def gemini_down(prompt, t, m):
        calls.append("gemini")
        raise RuntimeError("Gemini returned empty content")

    async def groq_ok(prompt, t, m):
        calls.append("groq")
        return '{"questions": []}'

    monkeypatch.setattr(ai, "_RETRY_DELAY_SECONDS", 0.0)
    monkeypatch.setattr(ai, "_call_gemini", gemini_down)
    monkeypatch.setattr(ai, "_call_groq", groq_ok)
    monkeypatch.setattr(ai, "GEMINI_API_KEY", "set")
    monkeypatch.setattr(ai, "GROQ_API_KEY", "set")
    out = await ai.call_ai("hi", lang="badini")
    assert out == '{"questions": []}'
    assert calls == ["gemini", "gemini", "groq"]


def test_lang_instructions_distinguish_kurdish_dialects():
    assert "بادینی" in ai.LANG_INSTRUCTIONS["badini"]
    assert "سۆرانی" in ai.LANG_INSTRUCTIONS["sorani"]
    for lang in ("en", "badini", "ar", "sorani"):
        assert lang in ai.LANG_INSTRUCTIONS


def test_parse_json_clean_object():
    assert ai._parse_json('{"a": 1}') == {"a": 1}


def test_parse_json_strips_code_fences():
    out = ai._parse_json("```json\n{\"a\": 1}\n```")
    assert out == {"a": 1}


def test_parse_json_recovers_embedded_object():
    out = ai._parse_json('Here you go {\"a\": 1}. Let me know if helpful.')
    assert out == {"a": 1}


def test_parse_json_returns_none_on_garbage():
    assert ai._parse_json("no json here") is None
    assert ai._parse_json('{"broken":') is None


@pytest.mark.asyncio
async def test_ai_content_or_502_returns_content(monkeypatch):
    async def ok(prompt, temperature, max_tokens, lang):
        return '{"a": 1}'

    monkeypatch.setattr(ai, "call_ai", ok)
    out = await ai._ai_content_or_502("prompt", "en", 100, 0.4)
    assert out == '{"a": 1}'


@pytest.mark.asyncio
async def test_ai_content_or_502_raises_on_provider_failure(monkeypatch):
    from fastapi import HTTPException

    async def fail(prompt, temperature, max_tokens, lang):
        raise RuntimeError("all providers down")

    monkeypatch.setattr(ai, "call_ai", fail)
    with pytest.raises(HTTPException) as exc:
        await ai._ai_content_or_502("prompt", "en", 100, 0.4)
    assert exc.value.status_code == 502