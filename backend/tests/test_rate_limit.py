import pytest

from app.utils import rate_limit


class _Req:
    def __init__(self, headers=None, client_host="1.2.3.4"):
        self.headers = headers or {}
        self.client = type("Client", (), {"host": client_host})()


def test_uses_direct_client_ip_when_no_proxy():
    rate_limit.TRUST_PROXY = False
    key = rate_limit.get_client_key(_Req({"x-forwarded-for": "203.0.113.5"}))
    assert key == "1.2.3.4"


def test_trusted_proxy_reads_first_forwarded_for():
    rate_limit.TRUST_PROXY = True
    key = rate_limit.get_client_key(_Req({"x-forwarded-for": "203.0.113.5, 10.0.0.1"}))
    assert key == "203.0.113.5"


def test_trusted_proxy_falls_back_to_real_ip():
    rate_limit.TRUST_PROXY = True
    key = rate_limit.get_client_key(_Req({"x-real-ip": "198.51.100.7"}))
    assert key == "198.51.100.7"


def test_trusted_proxy_prefers_forwarded_for_over_real_ip():
    rate_limit.TRUST_PROXY = True
    key = rate_limit.get_client_key(
        _Req({"x-forwarded-for": "203.0.113.9, 10.0.0.1", "x-real-ip": "198.51.100.7"})
    )
    assert key == "203.0.113.9"


def test_trusted_proxy_without_headers_falls_back_to_direct_ip():
    rate_limit.TRUST_PROXY = True
    key = rate_limit.get_client_key(_Req({}))
    assert key == "1.2.3.4"