"""Health check router for RLVR YouTube Transcript API."""

from datetime import datetime
from typing import Dict, Any

import structlog
from fastapi import APIRouter
from slowapi import Limiter
from slowapi.util import get_remote_address

from config import settings

# Initialize router and limiter
router = APIRouter()
limiter = Limiter(key_func=get_remote_address)
logger = structlog.get_logger()


@router.get("/health", response_model=Dict[str, Any])
@limiter.limit("10/minute")  # Rate limit health checks
async def health_check(request):
    """
    Health check endpoint.
    
    Returns:
        Dict containing health status, service info, and timestamp
    """
    logger.info("Health check requested")
    
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version,
        "environment": settings.environment,
        "timestamp": datetime.utcnow().isoformat(),
        "features": {
            "hawaiian_translations": True,
            "youtube_transcript_extraction": True,
            "rate_limiting": settings.rate_limit_enabled,
        }
    }