import os
import re
import json
import logging
from typing import List, Literal, Optional
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
import httpx
from datetime import datetime
from app.utils.supabase import supabase_request, sanitize_key
from app.utils.auth import require_auth
from app.utils.rate_limit import limiter
from app.utils.day_keys import normalize_day_keys
from app.utils.ai_cache import TTLCache, make_key

logger = logging.getLogger("rekxare.ai")
router = APIRouter()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-3.6-flash"

# Caching keeps identical AI requests off the provider quota (the scaling
# constraint at 100+ users). Safe here because we run a single worker.
ai_response_cache = TTLCache(max_entries=512, default_ttl=3600)
CACHE_TTL_QUIZ = 3600 * 1       # same material re-quizzed shortly after is common
CACHE_TTL_SCHEDULE = 3600 * 6   # same goal + same weekday -> same schedule

MAX_GOAL_LENGTH = 500
MAX_EXISTING_TASKS_LENGTH = 1000
MAX_SUBJECT_LENGTH = 100
MAX_QUIZ_TEXT = 40000

LANG_INSTRUCTIONS = {
    "en": "Respond in English.",
    "badini": "بە بادینی وەڵام بدەوە (عەرەبی-کوردی).",
    "ar": "أجب بالعربية.",
    "sorani": "بە سۆرانی وەڵام بدەوە (عەرەبی-کوردی).",
}


def _strip_json_fences(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        first_nl = text.find("\n")
        if first_nl != -1:
            text = text[first_nl + 1:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
    return text


def _sanitize_prompt_input(text: str, max_len: int) -> str:
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', text)
    return text[:max_len].strip()


async def _call_gemini(prompt: str, temperature: float, max_tokens: int) -> str:
    """Call Gemini API and return the text response."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            url,
            params={"key": GEMINI_API_KEY},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": temperature,
                    "maxOutputTokens": max_tokens,
                },
            },
            timeout=60.0,
        )
    if resp.status_code != 200:
        logger.error("Gemini API error %s: %s", resp.status_code, resp.text[:200])
        raise RuntimeError(f"Gemini returned {resp.status_code}")
    data = resp.json()
    candidates = data.get("candidates", [])
    if not candidates:
        raise RuntimeError("Gemini returned no candidates")
    parts = candidates[0].get("content", {}).get("parts", [])
    text = "".join(p.get("text", "") for p in parts).strip()
    if not text:
        # Thinking-model edge case: reasoning tokens can consume the whole
        # output budget, leaving `content` empty. Treat it as a failure so
        # call_ai() falls back to Groq instead of handing an empty string to
        # the JSON parser and returning a 502.
        raise RuntimeError("Gemini returned empty content")
    return text


async def _call_groq(prompt: str, temperature: float, max_tokens: int) -> str:
    """Call Groq API and return the text response."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            json={
                "model": "qwen/qwen3.8-27b",
                "messages": [{"role": "user", "content": prompt}],
                "temperature": temperature,
                "max_tokens": max_tokens,
            },
            timeout=30.0,
        )
    if resp.status_code != 200:
        logger.error("Groq API error %s: %s", resp.status_code, resp.text[:200])
        raise RuntimeError(f"Groq returned {resp.status_code}")
    result = resp.json()
    return result.get("choices", [{}])[0].get("message", {}).get("content", "")


async def call_ai(prompt: str, temperature: float = 0.4, max_tokens: int = 500, lang: str = "en") -> str:
    """Route by language: Badini/Sorani → Gemini first, EN/AR → Groq first. Fallback to the other provider."""
    kurdish = lang in ("badini", "sorani")
    primary, fallback = (_call_gemini, _call_groq) if kurdish else (_call_groq, _call_gemini)
    primary_key = GEMINI_API_KEY if kurdish else GROQ_API_KEY
    fallback_key = GROQ_API_KEY if kurdish else GEMINI_API_KEY

    if primary_key:
        try:
            return await primary(prompt, temperature, max_tokens)
        except Exception as e:
            logger.warning("Primary AI failed (%s), falling back: %s", "gemini" if kurdish else "groq", e)
    if fallback_key:
        return await fallback(prompt, temperature, max_tokens)
    raise RuntimeError("No AI provider configured")


async def _ai_content_or_502(prompt: str, lang: str, max_tokens: int, temperature: float) -> str:
    """Call call_ai(), converting total provider failure into a 502."""
    try:
        return await call_ai(prompt, temperature=temperature, max_tokens=max_tokens, lang=lang)
    except Exception:
        logger.exception("All AI providers failed")
        raise HTTPException(status_code=502, detail="AI service temporarily unavailable")


def _parse_json(content: str) -> Optional[dict]:
    """Parse model JSON output, tolerating stray text/code fences around it."""
    try:
        parsed = json.loads(_strip_json_fences(content))
        if isinstance(parsed, dict):
            return parsed
    except Exception:
        pass
    try:
        start = content.find("{")
        end = content.rfind("}")
        if start != -1 and end > start:
            parsed = json.loads(content[start : end + 1])
            if isinstance(parsed, dict):
                return parsed
    except Exception:
        pass
    return None


async def _cached_or_produce(key: str, ttl: float, producer):
    """Return a fresh cached response, else run producer and store its output.

    producer may raise HTTPException — nothing is cached on failure, so a
    transient provider error never poisons the cache.
    """
    cached = ai_response_cache.get(key)
    if cached is not None:
        logger.info("AI cache hit for key %s", key[:12])
        return cached
    value = await producer()
    ai_response_cache.set(key, value, ttl=ttl)
    return value


@router.get("/status")
@limiter.limit("30/minute")
async def ai_status(request: Request, lang: str = "en"):
    kurdish = lang in ("badini", "sorani")
    return {
        "gemini": bool(GEMINI_API_KEY),
        "groq": bool(GROQ_API_KEY),
        "primary": "gemini" if kurdish and GEMINI_API_KEY else "groq" if GROQ_API_KEY else "gemini" if GEMINI_API_KEY else "none",
    }


class GenerateScheduleRequest(BaseModel):
    goal: str = Field(max_length=MAX_GOAL_LENGTH)
    preferred_time: Literal["any", "morning", "afternoon", "evening"] = "any"
    rest_days: List[str] = Field(default=[], max_length=7)
    subject_preferences: List[str] = Field(default=[], max_length=20)
    existing_tasks: str = Field(default="", max_length=MAX_EXISTING_TASKS_LENGTH)
    lang: Literal["en", "badini", "ar", "sorani"] = "en"


class AnalyzeRequest(BaseModel):
    lang: Literal["en", "badini", "ar", "sorani"] = "en"
    data: dict = {}


class DashboardRequest(BaseModel):
    lang: Literal["en", "badini", "ar", "sorani"] = "en"
    data: dict = {}


class QuizRequest(BaseModel):
    text: str = Field(min_length=1, max_length=MAX_QUIZ_TEXT)
    subject: str = Field(default="", max_length=MAX_SUBJECT_LENGTH)
    question_count: int = Field(default=5, ge=2, le=10)
    lang: Literal["en", "badini", "ar", "sorani"] = "en"


def _recent_sessions(data: dict, limit: int = 10) -> List[dict]:
    """Recent sessions normalized to {subject, minutes, date}.

    The app persists history as ``session_log`` entries (with ``subject``,
    ``focus_seconds``, ``day``). ``recent_sessions`` was never written by the
    client, so derive it from the log whenever present.
    """
    recent = data.get("recent_sessions") or []
    if not recent:
        log = data.get("session_log") or []
        if isinstance(log, list):
            recent = [
                {
                    "subject": s.get("subject", "?"),
                    "minutes": round((s.get("focus_seconds") or 0) / 60),
                    "date": s.get("day", s.get("started_at", "?")),
                }
                for s in log
            ]
    return recent[-limit:]


def build_analyze_prompt(data: dict, lang: str) -> str:
    total_hours = data.get("total_seconds", 0) / 3600
    daily_mins = data.get("daily_seconds", 0) / 60
    daily_goal_mins = data.get("daily_goal_seconds", 0) / 60
    daily_pct = round((daily_mins / max(daily_goal_mins, 1)) * 100)
    xp = data.get("xp_points", 0)
    level = data.get("xp_level", 1)
    streak = data.get("streak", 0)
    sessions = data.get("sessions", 0)
    last_subject = data.get("last_subject", "—")
    recent = _recent_sessions(data, 5)

    recent_text = ""
    if recent:
        recent_lines = []
        for s in recent[-5:]:
            recent_lines.append(f"  - {s.get('subject', '?')}: {s.get('minutes', 0)} min on {s.get('date', '?')}")
        recent_text = "\n".join(recent_lines)

    lang_instruction = LANG_INSTRUCTIONS.get(lang, "Respond in English.")

    return f"""You are a warm, supportive study coach analyzing a student's progress.

{lang_instruction}

STUDENT DATA:
- Total study time: {total_hours:.1f} hours ({data.get('total_seconds', 0)} seconds)
- Total sessions: {sessions}
- Current streak: {streak} days
- Daily goal: {daily_pct}% completed ({daily_mins:.0f}/{daily_goal_mins:.0f} minutes today)
- XP Level: {level} ({xp} points)
- Most studied subject: {last_subject}
- Recent sessions:
{recent_text if recent_text else "  No recent sessions recorded."}

ANALYSIS RULES:
1. Be specific — reference actual numbers from their data.
2. If streak is 0, be extra encouraging about starting fresh.
3. If daily goal is below 50%, gently suggest shorter focused sessions.
4. If daily goal is above 100%, acknowledge the achievement.
5. If total sessions is low, focus on building the habit.
6. If one subject dominates, suggest diversifying.
7. Keep each section under 25 words.
8. Be warm and supportive, never judgmental.

Return ONLY a valid JSON object:
{{
  "insight": "One specific observation about their study pattern (reference a number)",
  "advice": "One actionable suggestion to improve",
  "encouragement": "One warm, personalized motivational message"
}}"""


def build_generate_prompt(goal: str, preferred_time: str, rest_days: List[str],
                          subject_preferences: List[str], existing_tasks: str, today: str,
                          lang: str = "en") -> str:
    lang_instruction = LANG_INSTRUCTIONS.get(lang, "Respond in English.")
    time_guidance = {
        "morning": "Focus on morning hours (06:00-12:00). User prefers studying early.",
        "afternoon": "Focus on afternoon hours (12:00-18:00). User prefers midday study.",
        "evening": "Focus on evening hours (18:00-23:00). User prefers night study.",
        "any": "Spread study throughout the day (09:00-21:00). User has no time preference."
    }.get(preferred_time, "Spread study throughout the day.")

    rest_line = ""
    if rest_days:
        clean_rest = [_sanitize_prompt_input(d, 20) for d in rest_days[:7]]
        rest_line = f"Preferred rest days: {', '.join(clean_rest)}. Make these days lighter or free."

    subjects_line = ""
    if subject_preferences:
        clean_subjects = [_sanitize_prompt_input(s, MAX_SUBJECT_LENGTH) for s in subject_preferences[:20]]
        subjects_line = f"Subject priority (highest to lowest): {', '.join(clean_subjects)}. Give more time to higher-priority subjects."

    existing_line = ""
    if existing_tasks:
        existing_line = f"""

EXISTING COMMITMENTS (NON-NEGOTIABLE — treat these as FIXED time blocks that cannot be moved or shortened):
The user has told you about their real-life schedule. You MUST:
- Place these commitments at their exact times as fixed blocks
- Build the study schedule AROUND these blocks — never overlap them
- Treat gym, work, classes, commute, meals, etc. as real fixed blocks
- Include breaks after intense activities (e.g., commute time, wind-down after work)
- If the user says "work 9-5", that entire block is occupied — study goes outside it"""

    subjects_display = ", ".join([_sanitize_prompt_input(s, MAX_SUBJECT_LENGTH) for s in subject_preferences[:5]]) if subject_preferences else "General study"

    return f"""You are an expert study planner creating a realistic, personalized weekly schedule.

{lang_instruction}

TODAY IS: {today}
STUDENT GOAL: {goal[:MAX_GOAL_LENGTH]}
SUBJECTS: {subjects_display}
TIME PREFERENCE: {time_guidance}
{rest_line}
{subjects_line}{existing_line}

SCHEDULE RULES:
1. Be REALISTIC. This is a real human, not a robot. Max 3-4 hours of focused study per day — never more.
2. Use 45-50 minute focus blocks with 10-15 minute breaks. Humans cannot focus longer than 50 minutes.
3. Include meal breaks (30 min) if the schedule spans meal times.
4. Harder/higher-priority subjects go in the user's preferred energy window.
5. Alternate subjects — never put the same subject twice in a row.
6. Include 5-10 minute transition breaks between different activities.
7. Include at least one review session per week.
8. Use 24-hour format (HH:MM).
9. Vary the schedule — don't make every day identical. Some days lighter, some heavier.
10. If the user has non-study commitments (work, gym, commute, etc.), place them FIRST as fixed blocks, then fill study around them.
11. Respect rest days — make them free or very light (max 1 hour optional review).
12. Do NOT schedule study sessions before 07:00 or after 22:00 — humans need wind-down time.
13. If the user's stated commitments leave very little time, honestly reduce study blocks rather than cramming.
14. The schedule should feel achievable, not exhausting. A real person should look at it and think "I can do this."

Return ONLY a valid JSON object with EXACTLY these property keys:
- The JSON property keys (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday) must ALWAYS be the exact English strings above.
- NEVER translate the day keys — only the task names and the explanation may be in the student's language.

{{
  "Monday": [{{"start": "HH:MM", "end": "HH:MM", "task": "Task name", "type": "study|commitment|break"}}],
  "Tuesday": [...],
  "Wednesday": [...],
  "Thursday": [...],
  "Friday": [...],
  "Saturday": [...],
  "Sunday": [...]
}}

Each task must have:
- "start": start time in HH:MM 24-hour format
- "end": end time in HH:MM 24-hour format
- "task": descriptive name (e.g., "Math - Calculus Practice", "Work", "Gym", "Lunch Break")
- "type": "study" for study blocks, "commitment" for user's existing obligations (work, gym, class, etc.), "break" for rest/meal/transition

Also include a brief explanation field:
{{
  ...days...,
  "explanation": "Brief explanation of why you structured the schedule this way (2-3 sentences max)"
}}"""


@router.post("/analyze")
@limiter.limit("10/hour")
async def analyze_study_data(request: Request, body: AnalyzeRequest, user: dict = Depends(require_auth)):
    if not GROQ_API_KEY and not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="AI service not configured")

    user_id = sanitize_key(user["sub"])

    study_data = {}
    client_data = body.data if isinstance(body.data, dict) else {}
    if (
        client_data.get("total_seconds")
        or client_data.get("sessions")
        or client_data.get("session_log")
    ):
        study_data = client_data
    else:
        try:
            response = await supabase_request("GET", f"study_data?user_key=eq.{user_id}")
            if response and isinstance(response, list) and len(response) > 0:
                study_data = response[0].get("data", {})
        except Exception:
            logger.exception("Error fetching study data for AI analysis, user %s", user_id)
            study_data = {}

    prompt = build_analyze_prompt(study_data, body.lang or "en")

    try:
        content = await call_ai(prompt, temperature=0.4, max_tokens=2000, lang=body.lang or "en")
    except Exception:
        logger.exception("All AI providers failed for /analyze")
        raise HTTPException(status_code=502, detail="AI service temporarily unavailable")

    try:
        parsed = json.loads(_strip_json_fences(content))
        return {
            "insight": str(parsed.get("insight", ""))[:500],
            "advice": str(parsed.get("advice", ""))[:500],
            "encouragement": str(parsed.get("encouragement", ""))[:500],
        }
    except Exception:
        return {
            "insight": content[:200] if content else "",
            "advice": "",
            "encouragement": "",
        }


def build_dashboard_prompt(data: dict, lang: str) -> str:
    total_hours = data.get("total_seconds", 0) / 3600
    daily_mins = data.get("daily_seconds", 0) / 60
    daily_goal_mins = data.get("daily_goal_seconds", 0) / 60
    daily_pct = round((daily_mins / max(daily_goal_mins, 1)) * 100)
    xp = data.get("xp_points", 0)
    level = data.get("xp_level", 1)
    streak = data.get("streak", 0)
    sessions = data.get("sessions", 0)
    last_subject = data.get("last_subject", "—")
    recent = _recent_sessions(data, 10)

    subject_times: dict[str, float] = {}
    for s in recent:
        subj = s.get("subject", "Unknown")
        mins = s.get("minutes", 0)
        subject_times[subj] = subject_times.get(subj, 0) + mins

    subject_lines = ""
    if subject_times:
        total_mins = sum(subject_times.values())
        for subj, mins in sorted(subject_times.items(), key=lambda x: -x[1]):
            pct = round((mins / max(total_mins, 1)) * 100)
            subject_lines += f"  - {subj}: {mins:.0f} minutes ({pct}%)\n"

    recent_text = ""
    if recent:
        recent_lines = []
        for s in recent[-10:]:
            recent_lines.append(f"  - {s.get('subject', '?')}: {s.get('minutes', 0)} min on {s.get('date', '?')}")
        recent_text = "\n".join(recent_lines)

    lang_instruction = LANG_INSTRUCTIONS.get(lang, "Respond in English.")

    return f"""You are an expert education analyst providing a comprehensive study dashboard for a student.

{lang_instruction}

STUDENT DATA:
- Total study time: {total_hours:.1f} hours
- Total sessions: {sessions}
- Current streak: {streak} days
- Daily goal completion: {daily_pct}% ({daily_mins:.0f}/{daily_goal_mins:.0f} minutes)
- XP Level: {level} ({xp} points)
- Primary subject: {last_subject}

SUBJECT BREAKDOWN:
{subject_lines if subject_lines else "  No subject data recorded."}

RECENT SESSIONS:
{recent_text if recent_text else "  No recent sessions."}

Return ONLY a valid JSON object with this exact structure:
{{
  "summary": "2-3 sentence overview of the student's study performance",
  "strengths": ["strength 1 (be specific, reference a number)", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1 (be specific, reference a number)", "weakness 2", "weakness 3"],
  "weekly_trend": "improving" | "stable" | "declining",
  "subject_breakdown": [
    {{"subject": "Subject Name", "hours": 1.5, "percentage": 35, "trend": "up" | "down" | "stable"}}
  ],
  "recommendations": ["recommendation 1 (actionable)", "recommendation 2", "recommendation 3", "recommendation 4"],
  "score": 78
}}

RULES:
1. Score must be 0-100 based on consistency, goal completion, streak, and variety.
2. strengths: list exactly 3, reference actual data.
3. weaknesses: list exactly 3, be constructive not harsh.
4. subject_breakdown: include all subjects with hours, percentage, and trend.
5. recommendations: list exactly 4, each actionable and specific.
6. weekly_trend: infer from streak and recent session patterns.
7. Keep each string under 80 characters."""


def build_quiz_prompt(text: str, subject: str, question_count: int, lang: str) -> str:
    lang_instruction = LANG_INSTRUCTIONS.get(lang, "Respond in English.")
    subject_line = f"SUBJECT: {subject}" if subject else "SUBJECT: General study material"

    return f"""You are a study assistant creating a multiple-choice quiz from a student's study material.

{lang_instruction}

{subject_line}
STUDY MATERIAL (this may contain OCR or copy errors — use your best judgment and ignore obvious noise):
{text}

RULES:
1. Create NO MORE THAN {question_count} questions, as close to {question_count} as the material genuinely allows.
2. If the material is too thin, messy, or of poor quality to support that many, create FEWER questions (minimum 1) and set "note" to a brief explanation in the student's language.
3. Each question must be answerable SOLELY from the material. Do NOT invent or import outside facts.
4. 4 options per question, exactly one correct. "correct" is the 0-based index of the right option.
5. Include a one-sentence "explanation" per question.
6. Write questions in the student's language and prefer terminology used in the material.
7. If the material has no usable content, return "questions": [] and set "note" to explain why.

Return ONLY a valid JSON object:
{{
  "questions": [
    {{"question": "...", "options": ["a", "b", "c", "d"], "correct": 0, "explanation": "..."}}
  ],
  "note": ""
}}"""


def _resolve_correct_index(raw, options) -> int:
    """Best-effort resolution of the correct answer index from model output."""
    n = len(options)
    if n == 0:
        return 0
    if isinstance(raw, bool):
        return 0
    if isinstance(raw, int):
        return min(max(raw, 0), n - 1)
    if isinstance(raw, float):
        return _resolve_correct_index(int(raw), options)
    if isinstance(raw, str):
        s = raw.strip()
        if len(s) == 1 and s.lower() in "abcd":
            return min(max("abcd".index(s.lower()), 0), n - 1)
        for i, opt in enumerate(options):
            if opt.strip().lower() == s.lower():
                return i
    return 0


def _normalize_questions(raw, question_count: int) -> List[dict]:
    """Validate and normalize model output into QuizQuestion objects."""
    questions = []
    for q in (raw.get("questions") or [])[:question_count]:
        if not isinstance(q, dict):
            continue
        question = str(q.get("question", "")).strip()
        options = [str(o).strip() for o in (q.get("options") or [])]
        options = [o for o in options if o][:4]
        if not question or len(options) < 2:
            continue
        correct = _resolve_correct_index(q.get("correct"), options)
        questions.append({
            "question": question[:500],
            "options": options,
            "correct": correct,
            "explanation": str(q.get("explanation", "")).strip()[:500],
        })
    return questions


@router.post("/quiz")
@limiter.limit("20/hour")
async def generate_quiz(request: Request, body: QuizRequest, user: dict = Depends(require_auth)):
    if not GROQ_API_KEY and not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="AI service not configured")

    text = _sanitize_prompt_input(body.text, MAX_QUIZ_TEXT)
    if len(text) < 10:
        raise HTTPException(status_code=400, detail="Text is too short to create a quiz")

    subject = _sanitize_prompt_input(body.subject, MAX_SUBJECT_LENGTH)
    lang = body.lang or "en"
    key = make_key("quiz", lang, text, subject, body.question_count)

    async def produce():
        prompt = build_quiz_prompt(text, subject, body.question_count, lang)
        content = await _ai_content_or_502(prompt, lang, max_tokens=4000, temperature=0.4)
        parsed = _parse_json(content)
        if parsed is None:
            logger.error("Failed to parse quiz response for user %s", user["sub"])
            raise HTTPException(status_code=502, detail="AI returned an invalid response")
        questions = _normalize_questions(parsed, body.question_count)
        if not questions:
            note = str(parsed.get("note", "")).strip()[:500]
            raise HTTPException(status_code=422, detail=note or "AI could not extract usable questions")
        note = str(parsed.get("note", "")).strip()[:500]
        return {"questions": questions, "note": note}

    return await _cached_or_produce(key, CACHE_TTL_QUIZ, produce)


@router.post("/generate")
@limiter.limit("30/hour")
async def generate_schedule(request: Request, body: GenerateScheduleRequest, user: dict = Depends(require_auth)):
    if not GROQ_API_KEY and not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="AI service not configured")

    # Sanitize up front so the cache key exactly matches the prompt inputs
    # (identical prompt -> identical key -> cache hit).
    goal = _sanitize_prompt_input(body.goal, MAX_GOAL_LENGTH)
    existing = _sanitize_prompt_input(body.existing_tasks, MAX_EXISTING_TASKS_LENGTH)
    rest_days = [_sanitize_prompt_input(d, 20) for d in body.rest_days[:7]]
    subjects = [_sanitize_prompt_input(s, MAX_SUBJECT_LENGTH) for s in body.subject_preferences[:20]]
    today = datetime.now().strftime("%A")
    lang = body.lang or "en"
    key = make_key("generate", lang, today, goal, body.preferred_time, rest_days, subjects, existing)

    async def produce():
        prompt = build_generate_prompt(goal, body.preferred_time, rest_days,
                                       subjects, existing, today, lang)
        content = await _ai_content_or_502(prompt, lang, max_tokens=4000, temperature=0.3)
        parsed = _parse_json(content)
        if parsed is None:
            logger.exception("Failed to parse AI response")
            raise HTTPException(status_code=502, detail="AI returned an invalid response")
        explanation = str(parsed.pop("explanation", ""))[:1000]
        return {"schedule": normalize_day_keys(parsed), "explanation": explanation}

    return await _cached_or_produce(key, CACHE_TTL_SCHEDULE, produce)


@router.post("/dashboard")
@limiter.limit("5/hour")
async def dashboard_analysis(request: Request, body: DashboardRequest, user: dict = Depends(require_auth)):
    if not GROQ_API_KEY and not GEMINI_API_KEY:
        raise HTTPException(status_code=503, detail="AI service not configured")

    user_id = sanitize_key(user["sub"])

    study_data = {}
    client_data = body.data if isinstance(body.data, dict) else {}
    if (
        client_data.get("total_seconds")
        or client_data.get("sessions")
        or client_data.get("session_log")
    ):
        study_data = client_data
    else:
        try:
            response = await supabase_request("GET", f"study_data?user_key=eq.{user_id}")
            if response and isinstance(response, list) and len(response) > 0:
                study_data = response[0].get("data", {})
        except Exception:
            logger.exception("Error fetching study data for dashboard, user %s", user_id)
            study_data = {}

    prompt = build_dashboard_prompt(study_data, body.lang or "en")

    try:
        content = await call_ai(prompt, temperature=0.4, max_tokens=4000, lang=body.lang or "en")
    except Exception:
        logger.exception("All AI providers failed for /dashboard")
        raise HTTPException(status_code=502, detail="AI service temporarily unavailable")

    try:
        parsed = json.loads(_strip_json_fences(content))
        return {
            "summary": str(parsed.get("summary", ""))[:500],
            "strengths": [str(s)[:120] for s in (parsed.get("strengths") or [])[:3]],
            "weaknesses": [str(w)[:120] for w in (parsed.get("weaknesses") or [])[:3]],
            "weekly_trend": str(parsed.get("weekly_trend", "stable")),
            "subject_breakdown": [
                {
                    "subject": str(s.get("subject", ""))[:100],
                    "hours": round(float(s.get("hours", 0)), 1),
                    "percentage": int(s.get("percentage", 0)),
                    "trend": str(s.get("trend", "stable")),
                }
                for s in (parsed.get("subject_breakdown") or [])[:10]
            ],
            "recommendations": [str(r)[:150] for r in (parsed.get("recommendations") or [])[:4]],
            "score": max(0, min(100, int(parsed.get("score", 0)))),
        }
    except Exception:
        logger.exception("Failed to parse dashboard response")
        return {
            "summary": content[:300] if content else "",
            "strengths": [],
            "weaknesses": [],
            "weekly_trend": "stable",
            "subject_breakdown": [],
            "recommendations": [],
            "score": 0,
        }



