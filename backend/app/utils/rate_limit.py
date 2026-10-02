import os

from slowapi import Limiter
from slowapi.util import get_remote_address

TRUST_PROXY = os.getenv("TRUST_PROXY", "false").lower() in ("1", "true", "yes")


def _trusted_proxy_headers(request):
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return None


def get_client_key(request) -> str:
    # TRUST_PROXY is a module global by design so it can be flipped in tests;
    # it is evaluated on every call.
    if TRUST_PROXY:
        client_ip = _trusted_proxy_headers(request)
        if client_ip:
            return client_ip
    return get_remote_address(request)


def get_account_key(request) -> str:
    """Rate-limit key for authenticated, per-student AI endpoints.

    Falls back to the IP key only when auth has not populated
    ``request.state.user_id`` yet. Keying these routes by IP means every
    student behind one school or carrier NAT shares a single budget, so one
    classmate's refreshes rate-limit everyone else.
    """
    user_id = getattr(getattr(request, "state", None), "user_id", None)
    if user_id:
        return f"user:{user_id}"
    return f"ip:{get_client_key(request)}"


limiter = Limiter(key_func=get_client_key)
