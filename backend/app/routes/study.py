import re
import math
import logging
import httpx
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field, field_validator
from typing import Optional
from app.utils.supabase import supabase_request, sanitize_key
from app.utils.auth import require_auth
from app.utils.rate_limit import limiter

logger = logging.getLogger("rekxare.study")
router = APIRouter()

_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

# XP model (must match src/utils/rewards.ts in the frontend):
#   - xp_points is CUMULATIVE (never resets).
#   - xp_level = floor(sqrt(xp_points / LEVEL_BASE)) + 1
#   - A completed session earns minutes (1 XP/min) + finish (+5) + variety (+10).
LEVEL_BASE = 50
XP_PER_MINUTE = 1
XP_FINISH_BONUS = 5
XP_VARIETY_BONUS = 10


def xp_level_for(xp: int) -> int:
    return int(math.floor(math.sqrt(max(0, xp) / LEVEL_BASE))) + 1


class StudyData(BaseModel):
    total_seconds: int = Field(default=0, ge=0, le=864000)
    sessions: int = Field(default=0, ge=0, le=10000)
    last_subject: str = "—"
    streak: int = Field(default=0, ge=0, le=3650)
    last_study_date: Optional[str] = None
    daily_seconds: int = Field(default=0, ge=0, le=86400)
    daily_goal_seconds: int = Field(default=7200, ge=60, le=86400)
    xp_points: int = Field(default=0, ge=0, le=1000000)
    xp_level: int = Field(default=1, ge=1, le=10000)
    student_name: str = Field(default="", max_length=100)


class StudySession(BaseModel):
    timestamp: str
    date: str = Field(max_length=10)
    subject: str = Field(max_length=100)
    minutes: int = Field(ge=0, le=480)

    @field_validator("date")
    @classmethod
    def validate_date(cls, v: str) -> str:
        if not _DATE_RE.match(v):
            raise ValueError("date must be in YYYY-MM-DD format")
        return v


@router.get("/me")
@limiter.limit("30/minute")
async def get_study_data(request: Request, user: dict = Depends(require_auth)):
    user_id = sanitize_key(user["sub"])
    try:
        response = await supabase_request("GET", f"study_data?user_key=eq.{user_id}")
        if response and isinstance(response, list) and len(response) > 0:
            return response[0].get("data", {})
        return StudyData().model_dump()
    
    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code
        logger.error("Supabase returned %s for user %s on study_data", status, user_id)
        if status == 404:
            return StudyData().model_dump()
        raise HTTPException(
            status_code=502,
            detail="Unable to load study data. The data service is temporarily unavailable."
        )
    
    except (httpx.ConnectError, httpx.TimeoutException) as exc:
        logger.error("Network error fetching study data for user %s: %s", user_id, exc)
        raise HTTPException(
            status_code=503,
            detail="Unable to reach the data service. Please try again shortly."
        )
    
    except Exception:
        logger.exception("Unexpected error fetching study data for user %s", user_id)
        raise HTTPException(
            status_code=500,
            detail="Something went wrong loading your study data."
        )


@router.post("/me")
@limiter.limit("30/minute")
async def update_study_data(request: Request, data: StudyData, user: dict = Depends(require_auth)):
    user_id = sanitize_key(user["sub"])
    try:
        await supabase_request("POST", "study_data?on_conflict=user_key", {
            "user_key": user_id,
            "data": data.model_dump(),
            "updated_at": "now()",
        }, headers={"Prefer": "resolution=merge-duplicates"})
        return {"status": "saved"}
    except Exception:
        logger.exception("Error saving study data for user %s", user_id)
        raise HTTPException(status_code=500, detail="Failed to save study data")


@router.post("/me/session")
@limiter.limit("10/minute")
async def add_study_session(request: Request, session: StudySession, user: dict = Depends(require_auth)):
    user_id = sanitize_key(user["sub"])
    try:
        response = await supabase_request("GET", f"study_data?user_key=eq.{user_id}")
        current = {}
        if response and isinstance(response, list) and len(response) > 0:
            current = response[0].get("data", {})

        minutes = session.minutes
        last_subject = current.get("last_subject")
        current["total_seconds"] = current.get("total_seconds", 0) + (minutes * 60)
        current["sessions"] = current.get("sessions", 0) + 1
        current["last_subject"] = session.subject
        current["daily_seconds"] = current.get("daily_seconds", 0) + (minutes * 60)

        # Cumulative XP with finish + variety bonuses (mirrors frontend rewards.ts).
        finish_bonus = XP_FINISH_BONUS
        variety_bonus = (
            XP_VARIETY_BONUS
            if session.subject and last_subject and last_subject != "—" and session.subject != last_subject
            else 0
        )
        current["xp_points"] = current.get("xp_points", 0) + (minutes * XP_PER_MINUTE) + finish_bonus + variety_bonus
        current["xp_level"] = xp_level_for(current.get("xp_points", 0))

        today = session.date
        last_date = current.get("last_study_date")
        if last_date == today:
            pass
        elif last_date is None:
            current["streak"] = 1
        else:
            try:
                from datetime import date as _date
                today_dt = _date.fromisoformat(today)
                yesterday_dt = _date.fromordinal(today_dt.toordinal() - 1)
                yesterday = yesterday_dt.isoformat()
            except (ValueError, AttributeError):
                yesterday = ""
            if last_date == yesterday:
                current["streak"] = current.get("streak", 0) + 1
            else:
                current["streak"] = 1
        current["last_study_date"] = today

        await supabase_request("POST", "study_data?on_conflict=user_key", {
            "user_key": user_id,
            "data": current,
            "updated_at": "now()",
        }, headers={"Prefer": "resolution=merge-duplicates"})

        return {"status": "saved", "data": current}
    except Exception:
        logger.exception("Error saving session for user %s", user_id)
        raise HTTPException(status_code=500, detail="Failed to save session")
