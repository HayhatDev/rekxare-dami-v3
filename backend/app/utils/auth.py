import os
import json
import time
import base64
import logging
import jwt
import httpx
from jwt import PyJWKSet
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger("rekxare.auth")

security = HTTPBearer(auto_error=False)

_JWKS_TTL_SECONDS = 3600

_ASYMMETRIC_ALGORITHMS = ("RS256", "RS384", "RS512", "ES256", "ES384", "ES512")
_ALGORITHM_KEY_TYPE = {
    "RS256": "RSA",
    "RS384": "RSA",
    "RS512": "RSA",
    "ES256": "EC",
    "ES384": "EC",
    "ES512": "EC",
}

# The default Supabase JWT secret shipped in generated .env files is public
# knowledge. It must never be accepted as an HS256 signing secret.
_KNOWN_PUBLIC_JWT_SECRETS = {
    "super-secret-jwt-token-with-at-least-32-characters-long",
}

_jwks_cache: dict | None = None
_jwks_cached_at: float = 0.0


async def _fetch_jwks() -> dict | None:
    global _jwks_cache, _jwks_cached_at
    if _jwks_cache is not None and (time.monotonic() - _jwks_cached_at) < _JWKS_TTL_SECONDS:
        return _jwks_cache
    supabase_url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    if not supabase_url:
        return None
    try:
        jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(jwks_url)
            resp.raise_for_status()
            _jwks_cache = resp.json()
            _jwks_cached_at = time.monotonic()
            logger.info("Fetched Supabase JWKS from %s (%d keys)", jwks_url, len(_jwks_cache.get("keys", [])))
            return _jwks_cache
    except Exception as e:
        logger.warning("Failed to fetch Supabase JWKS: %s", e)
        return None


def _get_token_header(token: str) -> dict | None:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64 = parts[0]
        mod = len(header_b64) % 4
        if mod:
            header_b64 += "=" * (4 - mod)
        return json.loads(base64.urlsafe_b64decode(header_b64))
    except Exception:
        return None


def _expected_issuers() -> list[str]:
    supabase_url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    if not supabase_url:
        return []
    if supabase_url.endswith("/auth/v1"):
        return [supabase_url]
    return [f"{supabase_url}/auth/v1"]


def _reject(message: str) -> None:
    logger.warning("Rejected token: %s", message)
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


async def decode_token(token: str) -> dict:
    header = _get_token_header(token)
    alg = header.get("alg") if header else None
    kid = header.get("kid") if header else None

    issuers = _expected_issuers()
    if not issuers:
        logger.error("SUPABASE_URL is not set — cannot validate token issuer")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth not configured",
        )

    if alg in _ASYMMETRIC_ALGORITHMS:
        jwks = await _fetch_jwks()
        if not (jwks and jwks.get("keys")):
            logger.error("Token uses %s but JWKS could not be fetched from Supabase", alg)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Could not fetch signing keys from Supabase",
            )
        try:
            if not kid:
                _reject(f"{alg} token without a kid")
            if not any(entry.get("kid") == kid for entry in jwks["keys"]):
                _reject(f"kid={kid} not found in Supabase JWKS")
            keyset = PyJWKSet.from_dict(jwks)
            signing_key = keyset[kid]
            if signing_key.key_type != _ALGORITHM_KEY_TYPE[alg]:
                _reject(
                    f"kid={kid} is key type {signing_key.key_type}, not {_ALGORITHM_KEY_TYPE[alg]}"
                )
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=[alg],
                audience="authenticated",
                issuer=issuers,
            )
            return payload
        except KeyError:
            _reject(f"kid={kid} not usable from Supabase JWKS")
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired for user")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
        except jwt.InvalidTokenError as e:
            _reject(f"{alg} verification failed: {type(e).__name__} — {e}")

    if alg == "HS256":
        secret = os.getenv("SUPABASE_JWT_SECRET", "")
        if not secret or secret in _KNOWN_PUBLIC_JWT_SECRETS or len(secret) < 32:
            logger.error(
                "HS256 token but SUPABASE_JWT_SECRET is missing, weak, or a well-known default"
            )
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Auth not configured",
            )
        try:
            payload = jwt.decode(
                token,
                secret,
                algorithms=["HS256"],
                audience="authenticated",
                issuer=issuers,
            )
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired for user")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
        except jwt.InvalidTokenError as e:
            _reject(f"HS256 verification failed: {type(e).__name__} — {e}")

    # alg "none", missing, or unknown — reject. Never fall through to another algorithm.
    _reject(f"unsupported algorithm {alg!r}")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    if not credentials:
        logger.warning("No Authorization header provided")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return await decode_token(credentials.credentials)


async def require_auth(
    user: dict = Depends(get_current_user),
) -> dict:
    user_id = user.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    return user
