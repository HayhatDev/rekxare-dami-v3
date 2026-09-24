"""Small in-process TTL cache for expensive AI responses.

Single-worker deployment assumption (see backend/Dockerfile: one uvicorn
worker), so a bounded in-memory cache is safe and needs no external
infrastructure. If the service ever runs multiple workers or instances, move
this to Redis or a shared store.
"""
import hashlib
import json
import threading
import time
from collections import OrderedDict
from typing import Any, Optional


class TTLCache:
    """Thread-safe, bounded, in-memory cache with TTL expiry and LRU eviction."""

    def __init__(self, max_entries: int = 256, default_ttl: float = 3600.0):
        self._max_entries = max_entries
        self._default_ttl = default_ttl
        self._data: "OrderedDict[str, tuple[float, Any]]" = OrderedDict()
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        now = time.monotonic()
        with self._lock:
            item = self._data.get(key)
            if item is None:
                return None
            expires_at, value = item
            if expires_at <= now:
                del self._data[key]
                return None
            self._data.move_to_end(key)
            return value

    def set(self, key: str, value: Any, ttl: Optional[float] = None) -> None:
        now = time.monotonic()
        expires_at = now + (float(ttl) if ttl is not None else self._default_ttl)
        with self._lock:
            self._data[key] = (expires_at, value)
            self._data.move_to_end(key)
            while len(self._data) > self._max_entries:
                self._data.popitem(last=False)

    def clear(self) -> None:
        with self._lock:
            self._data.clear()


def make_key(*parts: Any) -> str:
    """Stable SHA-256 key across JSON-safe scalars/lists/dicts.

    Dicts are sorted before serialization so identical payloads with different
    key order hash the same.
    """
    digest = hashlib.sha256()
    for part in parts:
        blob = json.dumps(part, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
        digest.update(blob.encode("utf-8"))
        digest.update(b"\x1f")
    return digest.hexdigest()