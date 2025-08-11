"""Tests for Hawaiian translation service."""

import pytest
from services.hawaiian_service import HawaiianTranslationService


class TestHawaiianTranslationService:
    """Test cases for HawaiianTranslationService."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.service = HawaiianTranslationService()
    
    def test_direct_translations(self):
        """Test direct word translations."""
        test_cases = [
            ("hello", "aloha"),
            ("family", "ʻohana"),
            ("ocean", "kai"),
            ("beautiful", "nani"),
            ("thank you", "mahalo"),
            ("island", "mokupuni"),
        ]
        
        for english, expected_hawaiian in test_cases:
            assert self.service.translate(english) == expected_hawaiian
    
    def test_partial_matching(self):
        """Test partial word matching in phrases."""
        test_cases = [
            ("The beautiful sunset", "nani"),
            ("My family is here", "ʻohana"),
            ("Look at the ocean", "kai"),
            ("Hello everyone", "aloha"),
        ]
        
        for phrase, expected_hawaiian in test_cases:
            assert self.service.translate(phrase) == expected_hawaiian
    
    def test_contextual_translations(self):
        """Test contextual pattern matching."""
        test_cases = [
            ("Hi there!", "Aloha!"),
            ("Thanks so much!", "Mahalo!"),
            ("This is gorgeous!", "Nani!"),
            ("Tell me a story", "Moʻolelo"),
            ("He's a real hero", "Hoa koa"),
        ]
        
        for phrase, expected in test_cases:
            assert self.service.translate(phrase) == expected
    
    def test_empty_and_edge_cases(self):
        """Test edge cases and empty inputs."""
        assert self.service.translate("") == ""
        assert self.service.translate("   ") == "(ʻŌlelo Hawaiʻi)"
        assert self.service.translate("xyz123nonexistent") == "(ʻŌlelo Hawaiʻi)"
    
    def test_case_insensitive(self):
        """Test case insensitive matching."""
        test_cases = [
            ("HELLO", "aloha"),
            ("Hello", "aloha"),
            ("hELLo", "aloha"),
            ("FAMILY", "ʻohana"),
        ]
        
        for phrase, expected in test_cases:
            assert self.service.translate(phrase) == expected
    
    def test_translation_info(self):
        """Test detailed translation information."""
        info = self.service.get_translation_info("family")
        
        assert info["original"] == "family"
        assert info["translation"] == "ʻohana"
        assert info["language_code"] == "haw"
        assert info["language_name"] == "ʻŌlelo Hawaiʻi (Hawaiian)"
        assert info["confidence"] == "high"
    
    def test_translation_info_contextual(self):
        """Test translation info for contextual matches."""
        info = self.service.get_translation_info("Unknown phrase here")
        
        assert info["confidence"] == "contextual"
        assert info["language_code"] == "haw"