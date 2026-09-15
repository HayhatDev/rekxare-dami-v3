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

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")

_JWKS_TTL_SECONDS = 3600

_jwks_cache: dict | None = None
_jwks_cached_at: float = 0.0


async def _fetch_jwks() -> dict | None:
    global _jwks_cache, _jwks_cached_at
    if _jwks_cache is not None and (time.monotonic() - _jwks_cached_at) < _JWKS_TTL_SECONDS:
        return _jwks_cache
    if not SUPABASE_URL:
        return None
    try:
        jwks_url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
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


async def decode_token(token: str) -> dict:
    header = _get_token_header(token)
    alg = header.get("alg") if header else None
    kid = header.get("kid") if header else None

    if alg in ("ES256", "RS256", "RS384", "RS512", "ES384", "ES512"):
        jwks = await _fetch_jwks()
        if jwks and "keys" in jwks:
            try:
                keyset = PyJWKSet.from_dict(jwks)
                if kid:
                    signing_key = keyset[kid]
                else:
                    signing_key = keyset.keys[0]
                payload = jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=[alg],
                    audience="authenticated",
                )
                return payload
            except KeyError:
                logger.warning("No matching key found for kid=%s in JWKS", kid)
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token key not found")
            except jwt.ExpiredSignatureError:
                logger.warning("Token expired for user")
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
            except jwt.InvalidTokenError as e:
                logger.warning("Invalid %s token: %s — %s", alg, type(e).__name__, e)
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        else:
            logger.error("Token uses %s but JWKS could not be fetched from Supabase", alg)
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Could not fetch signing keys from Supabase",
            )

    secret = SUPABASE_JWT_SECRET
    if not secret:
        logger.error("SUPABASE_JWT_SECRET is not set — cannot verify HS256 tokens")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Auth not configured",
        )
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"], audience="authenticated")
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired for user")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError as e:
        logger.warning("Invalid HS256 token: %s — %s", type(e).__name__, e)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


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
