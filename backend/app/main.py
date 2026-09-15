import os
import sys
import logging
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("rekxare")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000").split(",")

if not SUPABASE_URL or not SUPABASE_KEY:
    logger.warning("SUPABASE_URL or SUPABASE_KEY not set — Supabase features disabled")

if not SUPABASE_SERVICE_ROLE_KEY:
    if os.getenv("ENVIRONMENT", "production") == "production":
        logger.critical("SUPABASE_SERVICE_ROLE_KEY is required in production")
        sys.exit(1)
    logger.warning("SUPABASE_SERVICE_ROLE_KEY not set — falling back to anon key (RLS bypass disabled)")

if not SUPABASE_JWT_SECRET:
    logger.warning("SUPABASE_JWT_SECRET not set — HS256 authentication disabled")

if not GROQ_API_KEY:
    logger.warning("GROQ_API_KEY not set — Groq AI disabled")
if not GEMINI_API_KEY:
    logger.warning("GEMINI_API_KEY not set — Gemini AI disabled")
if not GROQ_API_KEY and not GEMINI_API_KEY:
    logger.warning("No AI provider configured — AI features disabled")

from app.utils.rate_limit import limiter

app = FastAPI(
    title="Rekxare Dami API",
    description="Backend for Rekxare Dami V3",
    version="3.0.0",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.get("/")
@limiter.limit("30/minute")
async def root(request: Request):
    return {"message": "Rekxare Dami API V3 is running!"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


from app.routes import study, schedule, ai
from app.utils.auth import require_auth
from fastapi import Depends
app.include_router(study.router, prefix="/api/study", tags=["study"])
app.include_router(schedule.router, prefix="/api/schedule", tags=["schedule"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])


@app.get("/api/auth/check")
@limiter.limit("30/minute")
async def auth_check(request: Request, user: dict = Depends(require_auth)):
    return {"authenticated": True, "user_id": user.get("sub", "unknown")}
