import time

import pytest

from app.utils.ai_cache import TTLCache, make_key
from app.routes.ai import _cached_or_produce, ai_response_cache


def test_make_key_stable_and_sensitive():
    k1 = make_key("quiz", "badini", "text", "biology", 5)
    k2 = make_key("quiz", "badini", "text", "biology", 5)
    k3 = make_key("quiz", "badini", "text", "physics", 5)
    assert k1 == k2
    assert k1 != k3
    assert len(k1) == 64


def test_make_key_dict_order_independent():
    a = make_key({"goal": "x", "rest_days": ["Fri"]})
    b = make_key({"rest_days": ["Fri"], "goal": "x"})
    assert a == b


def test_make_key_unicode_stable():
    a = make_key("لە بادین", {"قوتابی": 1})
    b = make_key("لە بادین", {"قوتابی": 1})
    assert a == b


def test_ttl_cache_set_get_expire():
    cache = TTLCache(default_ttl=0.1)
    cache.set("a", {"x": 1})
    assert cache.get("a") == {"x": 1}
    time.sleep(0.3)
    assert cache.get("a") is None


def test_ttl_cache_custom_ttl():
    cache = TTLCache(default_ttl=60)
    cache.set("short", "v", ttl=0.1)
    time.sleep(0.3)
    assert cache.get("short") is None
    cache.set("long", "v")
    assert cache.get("long") == "v"


def test_ttl_cache_lru_evicts_oldest():
    cache = TTLCache(max_entries=2, default_ttl=60)
    cache.set("a", 1)
    cache.set("b", 2)
    cache.set("c", 3)  # evicts the least-recently-used: "a"
    assert cache.get("a") is None
    # touch "b" so "c" becomes the least-recently-used
    assert cache.get("b") == 2
    cache.set("d", 4)  # evicts "c"
    assert cache.get("c") is None
    assert cache.get("b") == 2
    assert cache.get("d") == 4


def test_ttl_cache_clear():
    cache = TTLCache()
    cache.set("a", 1)
    cache.clear()
    assert cache.get("a") is None


@pytest.mark.asyncio
async def test_cached_or_produce_hits_cache_and_skips_producer(monkeypatch):
    ai_response_cache.clear()
    ai_response_cache.set("k", {"questions": ["cached"]})
    calls = []

    async def producer():
        calls.append(1)
        return {"questions": ["fresh"]}

    out = await _cached_or_produce("k", 60, producer)
    assert out == {"questions": ["cached"]}
    assert calls == []


@pytest.mark.asyncio
async def test_cached_or_produce_miss_produces_and_stores(monkeypatch):
    ai_response_cache.clear()
    produced = {"questions": ["fresh"]}
    calls = []

    async def producer():
        calls.append(1)
        return produced

    out = await _cached_or_produce("k", 60, producer)
    assert calls == [1]
    assert out == produced
    assert ai_response_cache.get("k") == produced


@pytest.mark.asyncio
async def test_cached_or_produce_does_not_store_on_exception(monkeypatch):
    from fastapi import HTTPException

    ai_response_cache.clear()

    async def producer():
        raise HTTPException(status_code=502, detail="AI service temporarily unavailable")

    with pytest.raises(HTTPException):
        await _cached_or_produce("k", 60, producer)
    assert ai_response_cache.get("k") is None