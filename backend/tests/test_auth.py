import base64
import time
import uuid

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec, rsa
from fastapi import HTTPException

from app.utils import auth

SUPABASE_URL = "https://example.supabase.co"
AUTH_ISSUER = f"{SUPABASE_URL}/auth/v1"
STRONG_SECRET = "a-dedicated-long-random-supabase-jwt-secret-2026"
LEAKED_DEFAULT_SECRET = "super-secret-jwt-token-with-at-least-32-characters-long"
KID = "test-signing-key-1"


def _b64u(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _claims(**overrides) -> dict:
    claims = {
        "sub": str(uuid.uuid4()),
        "aud": "authenticated",
        "iss": AUTH_ISSUER,
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,
    }
    claims.update(overrides)
    return claims


def _rsa_jwk(public_key, kid: str = KID) -> dict:
    n = public_key.public_numbers().n
    e = public_key.public_numbers().e
    return {
        "kty": "RSA",
        "use": "sig",
        "kid": kid,
        "n": _b64u(n.to_bytes((n.bit_length() + 7) // 8, "big")),
        "e": _b64u(e.to_bytes((e.bit_length() + 7) // 8, "big")),
    }


def _ec_p256_jwk(public_key, kid: str = KID) -> dict:
    x = public_key.public_numbers().x
    y = public_key.public_numbers().y
    return {
        "kty": "EC",
        "crv": "P-256",
        "use": "sig",
        "kid": kid,
        "x": _b64u(x.to_bytes(32, "big")),
        "y": _b64u(y.to_bytes(32, "big")),
    }


def _fake_jwks(jwks):
    async def _fetch() -> dict | None:
        return jwks

    return _fetch


@pytest.fixture(autouse=True)
def _auth_env(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", SUPABASE_URL)
    monkeypatch.setenv("SUPABASE_JWT_SECRET", STRONG_SECRET)
    auth._jwks_cache = None
    auth._jwks_cached_at = 0.0


@pytest.fixture
def rsa_keypair():
    private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return private, private.public_key()


@pytest.fixture
def ec_p256_keypair():
    private = ec.generate_private_key(ec.SECP256R1())
    return private, private.public_key()


def _rs256_token(private_key, *, kid: str | None = KID, **claims) -> str:
    headers = {"kid": kid} if kid else {}
    return jwt.encode(_claims(**claims), private_key, algorithm="RS256", headers=headers)


def _hs256_token(secret=STRONG_SECRET, **claims) -> str:
    return jwt.encode(_claims(**claims), secret, algorithm="HS256")


@pytest.mark.asyncio
async def test_rs256_valid_jwks_token_accepted(rsa_keypair, monkeypatch):
    private, public = rsa_keypair
    monkeypatch.setattr(auth, "_fetch_jwks", _fake_jwks({"keys": [_rsa_jwk(public)]}))
    payload = await auth.decode_token(_rs256_token(private))
    assert payload["aud"] == "authenticated"
    assert payload["iss"] == AUTH_ISSUER
    assert payload["sub"]


@pytest.mark.asyncio
async def test_rs256_jwks_unavailable_fails_closed(rsa_keypair, monkeypatch):
    private, _ = rsa_keypair
    monkeypatch.setattr(auth, "_fetch_jwks", _fake_jwks(None))
    with pytest.raises(HTTPException) as exc:
        await auth.decode_token(_rs256_token(private))
    assert exc.value.status_code == 503


@pytest.mark.asyncio
async def test_rs256_token_without_kid_rejected(rsa_keypair, monkeypatch):
    private, public = rsa_keypair
    monkeypatch.setattr(auth, "_fetch_jwks", _fake_jwks({"keys": [_rsa_jwk(public)]}))
    with pytest.raises(HTTPException) as exc:
        await auth.decode_token(_rs256_token(private, kid=None))
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_rs256_token_with_unknown_kid_rejected(rsa_keypair, monkeypatch):
    private, public = rsa_keypair
    monkeypatch.setattr(auth, "_fetch_jwks", _fake_jwks({"keys": [_rsa_jwk(public)]}))
    with pytest.raises(HTTPException) as exc:
        await auth.decode_token(_rs256_token(private, kid="attacker-key"))
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_rs256_token_with_ec_key_of_same_kid_rejected(rsa_keypair, ec_p256_keypair, monkeypatch):
    private, _ = rsa_keypair
    _, ec_public = ec_p256_keypair
    jwks = {"keys": [_ec_p256_jwk(ec_public)]}
    monkeypatch.setattr(auth, "_fetch_jwks", _fake_jwks(jwks))
    with pytest.raises(HTTPException) as exc:
        await auth.decode_token(_rs256_token(private))
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_rs256_wrong_issuer_rejected(rsa_keypair, monkeypatch):
    private, public = rsa_keypair
    monkeypatch.setattr(auth, "_fetch_jwks", _fake_jwks({"keys": [_rsa_jwk(public)]}))
    token = _rs256_token(private, iss="https://evil.example/auth/v1")
    with pytest.raises(HTTPException) as exc:
        await auth.decode_token(token)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_alg_none_rejected():
    token = jwt.encode(_claims(), None, algorithm="none")
    with pytest.raises(HTTPException) as exc:
        await auth.decode_token(token)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_unknown_algorithm_does_not_fall_through_to_hs256():
    token = jwt.encode(_claims(), STRONG_SECRET, algorithm="HS384")
    with pytest.raises(HTTPException) as exc:
        await auth.decode_token(token)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_hs256_forged_with_wrong_issuer_rejected_never_verified():
    token = _hs256_token(secret=STRONG_SECRET, iss="https://evil.example/auth/v1")
    with pytest.raises(HTTPException) as exc:
        await auth.decode_token(token)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_hs256_token_signed_with_public_default_secret_rejected():
    token = _hs256_token(secret=LEAKED_DEFAULT_SECRET)
    with pytest.raises(HTTPException) as exc:
        await auth.decode_token(token)
    assert exc.value.status_code == 401


@pytest.mark.asyncio
async def test_hs256_with_public_default_secret_configured_refused(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", LEAKED_DEFAULT_SECRET)
    token = _hs256_token(secret=LEAKED_DEFAULT_SECRET)
    with pytest.raises(HTTPException) as exc:
        await auth.decode_token(token)
    assert exc.value.status_code == 503


@pytest.mark.asyncio
async def test_hs256_missing_strong_secret_fails_closed(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "")
    token = _hs256_token(secret="")
    with pytest.raises(HTTPException) as exc:
        await auth.decode_token(token)
    assert exc.value.status_code == 503


@pytest.mark.asyncio
async def test_hs256_valid_token_with_strong_secret_accepted():
    payload = await auth.decode_token(_hs256_token())
    assert payload["iss"] == AUTH_ISSUER
    assert payload["aud"] == "authenticated"


class _FakeResponse:
    def __init__(self, body):
        self._body = body

    def raise_for_status(self):
        pass

    def json(self):
        return self._body


class _FakeClient:
    def __init__(self, captured, *args, **kwargs):
        self._captured = captured

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        return False

    async def get(self, url):
        self._captured["url"] = url
        return _FakeResponse({"keys": []})


@pytest.mark.asyncio
async def test_fetch_jwks_uses_supabase_url(monkeypatch):
    captured: dict = {}
    monkeypatch.setattr(
        auth.httpx, "AsyncClient", lambda *args, **kwargs: _FakeClient(captured)
    )
    await auth._fetch_jwks()
    assert captured["url"] == f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"


@pytest.mark.asyncio
async def test_malformed_token_rejected():
    with pytest.raises(HTTPException) as exc:
        await auth.decode_token("not.a-jwt")
    assert exc.value.status_code == 401