"""
TAM (Tense-Aspect-Mood) particles metric for Hawaiian.
Checks for proper use of TAM particles, especially after negation (ʻAʻole).
"""

import re
import json
from typing import Dict, Any, Optional, List
from pathlib import Path

from .base import Metric


class TAMParticles(Metric):
    """Metric that checks for proper TAM particle usage in Hawaiian."""

    name = "tam_particles"
    version = "1.0"

    def __init__(self, lang_cfg: Dict[str, Any]):
        super().__init__(lang_cfg)

        # Load TAM regex patterns
        tam_path = Path(lang_cfg["resources"]["tam_regex"])
        with open(tam_path, 'r', encoding='utf-8') as f:
            self.patterns = json.load(f)

        # Compile regex patterns
        self.neg_marker_re = re.compile(
            self.patterns["neg"]["marker"], re.IGNORECASE)
        self.verb_pattern = self.patterns.get(
            "verb_pattern", r"[A-Za-zāēīōūĀĒĪŌŪ][a-zāēīōū]*")

    def _check_negative_context(self, text: str) -> Dict[str, Any]:
        """Check TAM particles in negative context."""
        # Look for ʻAʻole
        neg_match = self.neg_marker_re.search(text)
        if not neg_match:
            return {"has_negative": False, "valid": True, "details": "No negative marker found"}

        # Check for valid patterns after ʻAʻole
        valid_patterns = []
        for pattern_template in self.patterns["neg"]["valid"]:
            pattern = pattern_template.replace("VERB", self.verb_pattern)
            if re.search(pattern, text, re.IGNORECASE):
                valid_patterns.append(pattern_template)

        # Check for invalid patterns
        invalid_patterns = []
        for pattern_template in self.patterns["neg"].get("invalid", []):
            pattern = pattern_template.replace("VERB", self.verb_pattern)
            if re.search(pattern, text, re.IGNORECASE):
                invalid_patterns.append(pattern_template)

        return {
            "has_negative": True,
            "valid": len(valid_patterns) > 0 and len(invalid_patterns) == 0,
            "valid_patterns": valid_patterns,
            "invalid_patterns": invalid_patterns,
            "details": f"Found {len(valid_patterns)} valid, {len(invalid_patterns)} invalid patterns"
        }

    def _check_affirmative_context(self, text: str) -> Dict[str, Any]:
        """Check TAM particles in affirmative context."""
        valid_patterns = []
        for pattern_template in self.patterns["aff"]["valid"]:
            pattern = pattern_template.replace("VERB", self.verb_pattern)
            if re.search(pattern, text, re.IGNORECASE):
                valid_patterns.append(pattern_template)

        # In affirmative, we're more lenient - if we find any valid pattern, it's good
        # If no TAM patterns found, it might be a stative sentence which is also valid
        return {
            "has_negative": False,
            "valid": True,  # Affirmative sentences are generally valid
            "valid_patterns": valid_patterns,
            "details": f"Found {len(valid_patterns)} TAM patterns"
        }

    def score(self, text: str, src: Optional[str] = None) -> Dict[str, Any]:
        """
        Score text based on proper TAM particle usage.

        Special attention to:
        - ʻAʻole + ua (invalid combination)
        - ʻAʻole + i/e (valid negative past/future)
        - Proper affirmative TAM markers
        """
        # Check if text has negative marker
        neg_check = self._check_negative_context(text)

        if neg_check["has_negative"]:
            # Scoring for negative sentences
            if neg_check["valid"]:
                score = 1.0
            else:
                # Penalize invalid patterns more heavily
                if neg_check["invalid_patterns"]:
                    score = 0.0  # Hard fail for invalid combinations like "ʻAʻole ua"
                else:
                    score = 0.5  # No valid pattern found, but no invalid either

            details = neg_check
        else:
            # Scoring for affirmative sentences
            aff_check = self._check_affirmative_context(text)
            score = 1.0 if aff_check["valid"] else 0.7
            details = aff_check

        return {
            "name": self.name,
            "version": self.version,
            "score": score,
            "details": details
        }
