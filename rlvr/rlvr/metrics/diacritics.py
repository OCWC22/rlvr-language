"""
Diacritics metric for Hawaiian language.
Checks for proper use of ʻokina (glottal stop) and kahakō (macrons).
"""

import re
from typing import Dict, Any, Optional, Set
from pathlib import Path

from .base import Metric


class Diacritics(Metric):
    """Metric that checks for proper diacritic usage in Hawaiian."""

    name = "diacritics"
    version = "1.0"

    def __init__(self, lang_cfg: Dict[str, Any]):
        super().__init__(lang_cfg)

        # Load the lexicon of words requiring diacritics
        lex_path = Path(lang_cfg["resources"]["lex_diacritics"])
        self.required_forms: Set[str] = set()

        with open(lex_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                # Skip comments and empty lines
                if line and not line.startswith('#'):
                    self.required_forms.add(line.lower())

    def _normalize_word(self, word: str) -> str:
        """Remove punctuation and normalize for comparison."""
        # Remove common punctuation but keep ʻokina
        return re.sub(r'[.,!?;:"]', '', word).strip()

    def _strip_diacritics(self, word: str) -> str:
        """Remove diacritics from a word for base form comparison."""
        # Remove ʻokina
        word = word.replace('ʻ', '').replace('ʻ', '')
        # Remove kahakō (macrons)
        replacements = {
            'ā': 'a', 'ē': 'e', 'ī': 'i', 'ō': 'o', 'ū': 'u',
            'Ā': 'A', 'Ē': 'E', 'Ī': 'I', 'Ō': 'O', 'Ū': 'U'
        }
        for macron, plain in replacements.items():
            word = word.replace(macron, plain)
        return word

    def score(self, text: str, src: Optional[str] = None) -> Dict[str, Any]:
        """
        Score text based on proper diacritic usage.

        Returns 1.0 if all words requiring diacritics have them,
        lower scores for missing diacritics.
        """
        # Tokenize the text
        words = text.split()

        # Track words that need checking
        words_to_check = []
        correct_count = 0

        for word in words:
            normalized = self._normalize_word(word).lower()
            base_form = self._strip_diacritics(normalized)

            # Check if this word's base form matches any required form
            for required in self.required_forms:
                required_base = self._strip_diacritics(required)
                if base_form == required_base:
                    words_to_check.append({
                        'word': word,
                        'normalized': normalized,
                        'required': required,
                        'correct': normalized == required
                    })
                    if normalized == required:
                        correct_count += 1
                    break

        # Calculate score
        if not words_to_check:
            # No words requiring diacritics found - perfect score
            score = 1.0
        else:
            score = correct_count / len(words_to_check)

        return {
            "name": self.name,
            "version": self.version,
            "score": score,
            "details": {
                "checked": len(words_to_check),
                "correct": correct_count,
                "words_checked": [w['word'] for w in words_to_check],
                "errors": [w for w in words_to_check if not w['correct']]
            }
        }
