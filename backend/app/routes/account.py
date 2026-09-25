import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request

from app.utils.auth import require_auth
from app.utils.rate_limit import limiter
from app.utils.supabase import (
    SUPABASE_KEY,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL,
    sanitize_key,
    supabase_request,
)

logger = logging.getLogger("rekxare.account")
router = APIRouter()

# Every table holding per-user data. study_data and user_prefs are normally
# written by the browser (anon key + RLS) and schedules by the service role,
# so RLS has no DELETE policies and the browser cannot purge them. All three
# are deleted here with the service-role key, which bypasses RLS.
USER_DATA_TABLES = ("study_data", "user_prefs", "schedules")


async def _delete_auth_user(user_id: str) -> None:
    """Delete the Supabase Auth user via the GoTrue Admin API (service role)."""
    base = SUPABASE_URL.strip().rstrip("/")
    if not base:
        raise RuntimeError("SUPABASE_URL is not configured")
    key = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY
    url = f"{base}/auth/v1/admin/users/{user_id}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.delete(
            url,
            headers={"Authorization": f"Bearer {key}", "apikey": key},
        )
        if response.status_code not in (200, 204):
            raise RuntimeError(
                f"GoTrue delete failed: {response.status_code} {response.text[:200]}"
            )


async def _purge_user_data(user_id: str) -> list[str]:
    """Delete every per-user table row for this user; returns purged tables."""
    purged = []
    for table in USER_DATA_TABLES:
        try:
            await supabase_request("DELETE", f"{table}?user_key=eq.{user_id}")
            purged.append(table)
        except Exception as exc:
            logger.warning("Failed to purge %s for user %s: %s", table, user_id, exc)
    return purged


@router.delete("/account")
@limiter.limit("5/minute")
async def delete_account(request: Request, user: dict = Depends(require_auth)):
    user_id = sanitize_key(user["sub"])
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    await _purge_user_data(user_id)

    try:
        await _delete_auth_user(user_id)
    except Exception as exc:
        logger.error("Failed to delete auth user %s: %s", user_id, exc)
        raise HTTPException(
            status_code=502,
            detail="Unable to delete your account. Please try again shortly.",
        )

    return {"status": "deleted"}