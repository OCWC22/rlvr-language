"""Tests for transcript service."""

import pytest
from services.transcript_service import TranscriptService


class TestTranscriptService:
    """Test cases for TranscriptService."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.service = TranscriptService()
    
    def test_extract_video_id_from_youtube_url(self):
        """Test video ID extraction from YouTube URLs."""
        test_cases = [
            ("https://www.youtube.com/watch?v=H1MjAzoZ_GU", "H1MjAzoZ_GU"),
            ("https://youtu.be/H1MjAzoZ_GU", "H1MjAzoZ_GU"),
            ("https://youtube.com/embed/H1MjAzoZ_GU", "H1MjAzoZ_GU"),
            ("H1MjAzoZ_GU", "H1MjAzoZ_GU"),  # Already a video ID
        ]
        
        for url, expected in test_cases:
            assert self.service.extract_video_id(url) == expected
    
    def test_extract_video_id_invalid_url(self):
        """Test video ID extraction with invalid URLs."""
        invalid_urls = [
            "https://example.com",
            "not_a_url",
            "",
            "https://youtube.com/invalid",
        ]
        
        for url in invalid_urls:
            assert self.service.extract_video_id(url) is None
    
    def test_format_time(self):
        """Test time formatting."""
        test_cases = [
            (0.0, "00:00"),
            (30.5, "00:30"),
            (65.0, "01:05"),
            (3661.0, "61:01"),
        ]
        
        for seconds, expected in test_cases:
            assert self.service.format_time(seconds) == expected
    
    @pytest.mark.asyncio
    async def test_get_transcript_segments_hawaiian_trailer(self):
        """Test transcript extraction for Hawaiian trailer."""
        segments = await self.service.get_transcript_segments("H1MjAzoZ_GU")
        
        assert len(segments) == 10
        assert segments[0]["src"] == "In a world where legends come to life"
        assert segments[0]["id"] == 1
        assert segments[0]["t"] == "00:00"
    
    @pytest.mark.asyncio
    async def test_get_transcript_segments_generic_video(self):
        """Test transcript extraction for generic video."""
        segments = await self.service.get_transcript_segments("test_video_id")
        
        assert len(segments) == 5
        assert segments[0]["src"] == "Welcome to this video"
        assert all(seg["target"] == "" for seg in segments)  # No translation yet