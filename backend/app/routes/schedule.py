import logging
import httpx
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field, model_validator
from typing import List
from app.utils.supabase import supabase_request, sanitize_key
from app.utils.auth import require_auth
from app.utils.rate_limit import limiter
from app.utils.day_keys import normalize_day_keys

logger = logging.getLogger("rekxare.schedule")
router = APIRouter()


class Task(BaseModel):
    id: str = Field(max_length=64)
    start: str = Field(max_length=5)
    end: str = Field(max_length=5)
    task: str = Field(max_length=200)
    done: bool = False


class DaySchedule(BaseModel):
    Monday: List[Task] = []
    Tuesday: List[Task] = []
    Wednesday: List[Task] = []
    Thursday: List[Task] = []
    Friday: List[Task] = []
    Saturday: List[Task] = []
    Sunday: List[Task] = []

    @model_validator(mode="before")
    @classmethod
    def _clean_localized_day_keys(cls, data):
        """Coerce localized/stale JSON day keys to canonical English before validation."""
        if isinstance(data, dict):
            return normalize_day_keys(data)
        return data


@router.get("/me")
@limiter.limit("30/minute")
async def get_schedule(request: Request, user: dict = Depends(require_auth)):
    user_id = sanitize_key(user["sub"])
    try:
        response = await supabase_request("GET", f"schedules?user_key=eq.{user_id}")
        if response and isinstance(response, list) and len(response) > 0:
            return response[0].get("schedule", {})
        return DaySchedule().model_dump()
    
    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code
        logger.error("Supabase returned %s for user %s on schedule", status, user_id)
        if status == 404:
            return DaySchedule().model_dump()
        raise HTTPException(
            status_code=502,
            detail="Unable to load your schedule. The data service is temporarily unavailable."
        )
    
    except (httpx.ConnectError, httpx.TimeoutException) as exc:
        logger.error("Network error fetching schedule for user %s: %s", user_id, exc)
        raise HTTPException(
            status_code=503,
            detail="Unable to reach the data service. Please try again shortly."
        )
    
    except Exception:
        logger.exception("Unexpected error fetching schedule for user %s", user_id)
        raise HTTPException(
            status_code=500,
            detail="Something went wrong loading your schedule."
        )


@router.post("/me")
@limiter.limit("20/minute")
async def update_schedule(request: Request, schedule: DaySchedule, user: dict = Depends(require_auth)):
    user_id = sanitize_key(user["sub"])
    try:
        await supabase_request("POST", "schedules?on_conflict=user_key", {
            "user_key": user_id,
            "schedule": schedule.model_dump(),
            "updated_at": "now()",
        }, headers={"Prefer": "resolution=merge-duplicates"})
        return {"status": "saved"}
    except Exception:
        logger.exception("Error saving schedule for user %s", user_id)
        raise HTTPException(status_code=500, detail="Failed to save schedule")
