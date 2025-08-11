"""
English spelling metric.
Checks for common misspellings and typos.
"""

import re
import json
from typing import Dict, Any, Optional, Set, List
from pathlib import Path

from .base import Metric


class SpellingChecker(Metric):
    name = "spelling"
    version = "1.0"

    def __init__(self, lang_cfg: Dict[str, Any]):
        super().__init__(lang_cfg)

        # Load common misspellings
        self.common_errors = {}
        self.homophones = {}

        if "resources" in lang_cfg and "common_misspellings" in lang_cfg["resources"]:
            misspellings_path = Path(
                lang_cfg["resources"]["common_misspellings"])
            if misspellings_path.exists():
                with open(misspellings_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.common_errors = data.get("common_errors", {})
                    self.homophones = data.get("homophones", {})

        # Build reverse mapping for faster lookup
        self.error_to_correct = {
            error.lower(): correct for error, correct in self.common_errors.items()}

        # Common patterns for doubled letters that shouldn't be
        self.double_letter_errors = {
            'untill': 'until',
            'allways': 'always',
            'wellcome': 'welcome',
            'tommorrow': 'tomorrow',
            'dissappoint': 'disappoint',
            'occassion': 'occasion'
        }

        # Merge with common errors
        self.error_to_correct.update(self.double_letter_errors)

    def _check_word_spelling(self, word: str) -> Optional[Dict[str, Any]]:
        """Check if a word is misspelled"""
        # Remove punctuation from word edges
        clean_word = word.strip('.,!?;:"\'')
        word_lower = clean_word.lower()

        # Check against known misspellings
        if word_lower in self.error_to_correct:
            return {
                'misspelled': clean_word,
                'correction': self.error_to_correct[word_lower],
                'type': 'common_misspelling'
            }

        # Check for missing apostrophes in contractions
        contractions = {
            'dont': "don't",
            'doesnt': "doesn't",
            'didnt': "didn't",
            'wont': "won't",
            'cant': "can't",
            'couldnt': "couldn't",
            'shouldnt': "shouldn't",
            'wouldnt': "wouldn't",
            'isnt': "isn't",
            'arent': "aren't",
            'wasnt': "wasn't",
            'werent': "weren't",
            'hasnt': "hasn't",
            'havent': "haven't",
            'hadnt': "hadn't"
        }

        if word_lower in contractions:
            return {
                'misspelled': clean_word,
                'correction': contractions[word_lower],
                'type': 'missing_apostrophe'
            }

        return None

    def _check_homophones(self, text: str) -> List[Dict[str, Any]]:
        """Check for potential homophone errors (context-based)"""
        warnings = []
        text_lower = text.lower()

        # Check there/their/they're
        if 'their' in text_lower or 'there' in text_lower or "they're" in text_lower or 'theyre' in text_lower:
            # Simple heuristics for common errors
            if re.search(r'\btheir\s+(is|are|was|were)\b', text_lower):
                warnings.append({
                    'found': 'their',
                    'context': 'before a verb',
                    'suggestion': "they're (they are)",
                    'type': 'homophone_warning'
                })

            if re.search(r'\bover\s+their\b', text_lower) and not re.search(r'\bover\s+their\s+\w+s\b', text_lower):
                warnings.append({
                    'found': 'their',
                    'context': 'after "over"',
                    'suggestion': 'there',
                    'type': 'homophone_warning'
                })

        # Check your/you're
        if re.search(r'\byour\s+(going|coming|doing|making|taking)', text_lower):
            warnings.append({
                'found': 'your',
                'context': 'before verb+ing',
                'suggestion': "you're (you are)",
                'type': 'homophone_warning'
            })

        # Check its/it's
        if re.search(r'\bits\s+(been|going|coming|getting|become)', text_lower):
            warnings.append({
                'found': 'its',
                'context': 'before auxiliary/verb',
                'suggestion': "it's (it is/has)",
                'type': 'homophone_warning'
            })

        return warnings

    def score(self, text: str, src: Optional[str] = None) -> Dict[str, Any]:
        """Score the text for spelling errors"""
        errors = []
        warnings = []
        words_checked = 0

        # Split text into words
        words = re.findall(r'\b\w+(?:\'t|\'s|\'re|\'ve|\'ll|\'d)?\b', text)

        for word in words:
            words_checked += 1

            # Check spelling
            error = self._check_word_spelling(word)
            if error:
                error['position'] = text.find(word)
                errors.append(error)

        # Check homophones (these are warnings, not definite errors)
        homophone_warnings = self._check_homophones(text)
        warnings.extend(homophone_warnings)

        # Calculate score (only count definite errors, not warnings)
        score = 1.0 - (len(errors) / max(words_checked, 1))

        return {
            "name": self.name,
            "version": self.version,
            "score": max(0.0, score),
            "details": {
                "words_checked": words_checked,
                "errors_found": len(errors),
                "errors": errors[:10],  # Limit to first 10 errors
                "warnings": warnings[:5]  # Include some homophone warnings
            }
        }
