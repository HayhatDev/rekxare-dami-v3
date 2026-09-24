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


limiter = Limiter(key_func=get_client_key)
