"""Transcript extraction router for RLVR YouTube Transcript API."""

import re
from typing import List, Optional, Dict, Any

import structlog
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, HttpUrl
from slowapi import Limiter
from slowapi.util import get_remote_address

from config import settings
from services.transcript_service import TranscriptService
from services.hawaiian_service import HawaiianTranslationService

# Initialize router and services
router = APIRouter()
limiter = Limiter(key_func=get_remote_address)
logger = structlog.get_logger()

transcript_service = TranscriptService()
hawaiian_service = HawaiianTranslationService()


# Pydantic models
class TranscriptRequest(BaseModel):
    """Request model for transcript extraction."""
    url: str = Field(..., description="YouTube video URL or video ID")
    language: Optional[str] = Field(default="en", description="Target language code (en, haw)")


class TranscriptSegment(BaseModel):
    """Individual transcript segment."""
    id: int = Field(..., description="Segment ID")
    t: str = Field(..., description="Formatted timestamp (MM:SS)")
    src: str = Field(..., description="Source text (English)")
    target: Optional[str] = Field(default="", description="Target language text (Hawaiian)")
    startTime: float = Field(..., description="Start time in seconds")
    duration: float = Field(..., description="Duration in seconds")


class TranscriptResponse(BaseModel):
    """Response model for transcript extraction."""
    success: bool = Field(..., description="Success status")
    segments: List[TranscriptSegment] = Field(..., description="Transcript segments")
    video_id: str = Field(..., description="YouTube video ID")
    language: str = Field(..., description="Source language")
    target_language: str = Field(..., description="Target language")
    is_generated: bool = Field(..., description="Whether transcript is auto-generated")
    message: str = Field(..., description="Status message")


@router.post("/transcript", response_model=TranscriptResponse)
@limiter.limit("10/minute")  # Rate limit transcript requests
async def extract_transcript(
    request: TranscriptRequest,
    fastapi_request  # FastAPI request object for rate limiting
) -> TranscriptResponse:
    """
    Extract and translate transcript from YouTube video.
    
    Args:
        request: Transcript extraction request
        
    Returns:
        TranscriptResponse with segments and metadata
        
    Raises:
        HTTPException: If URL is invalid or extraction fails
    """
    logger.info(
        "Transcript extraction requested",
        url=request.url,
        target_language=request.language
    )
    
    try:
        # Extract video ID
        video_id = transcript_service.extract_video_id(request.url)
        if not video_id:
            raise HTTPException(
                status_code=400,
                detail="Invalid YouTube URL or video ID"
            )
        
        # Get transcript segments
        segments = await transcript_service.get_transcript_segments(
            video_id=video_id,
            target_language=request.language
        )
        
        # Apply Hawaiian translations if requested
        if request.language == "haw":
            for segment in segments:
                segment["target"] = hawaiian_service.translate(segment["src"])
        
        # Format response
        formatted_segments = [
            TranscriptSegment(**segment) for segment in segments
        ]
        
        message = f"Extracted {len(formatted_segments)} segments"
        if request.language == "haw":
            message += " with Hawaiian translations"
        message += " (sample data for demonstration)"
        
        logger.info(
            "Transcript extraction successful",
            video_id=video_id,
            segment_count=len(formatted_segments),
            target_language=request.language
        )
        
        return TranscriptResponse(
            success=True,
            segments=formatted_segments,
            video_id=video_id,
            language="English",
            target_language=request.language,
            is_generated=True,
            message=message
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Transcript extraction failed",
            error=str(e),
            url=request.url,
            exc_info=True
        )
        raise HTTPException(
            status_code=500,
            detail=f"Failed to extract transcript: {str(e)}"
        )


@router.get("/transcript/{video_id}", response_model=TranscriptResponse)
@limiter.limit("10/minute")
async def get_transcript_by_id(
    video_id: str,
    language: str = "en",
    fastapi_request=None
) -> TranscriptResponse:
    """
    Get transcript by video ID (GET endpoint).
    
    Args:
        video_id: YouTube video ID
        language: Target language code
        
    Returns:
        TranscriptResponse with segments and metadata
    """
    # Create request object and delegate to POST endpoint
    request = TranscriptRequest(url=video_id, language=language)
    return await extract_transcript(request, fastapi_request)