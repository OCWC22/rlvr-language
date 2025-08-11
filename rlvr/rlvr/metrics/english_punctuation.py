"""
English punctuation metric.
Checks for proper punctuation usage including periods, commas, and capitalization.
"""

import re
from typing import Dict, Any, Optional, List

from .base import Metric


class PunctuationChecker(Metric):
    name = "punctuation"
    version = "1.0"

    def __init__(self, lang_cfg: Dict[str, Any]):
        super().__init__(lang_cfg)

        # Sentence ending punctuation
        self.sentence_endings = {'.', '!', '?'}

        # Common abbreviations that use periods
        self.common_abbreviations = {
            'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr',
            'vs', 'etc', 'inc', 'ltd', 'corp',
            'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec',
            'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun',
            'st', 'nd', 'rd', 'th'  # for 1st, 2nd, etc.
        }

    def _check_sentence_punctuation(self, text: str) -> List[Dict[str, Any]]:
        """Check for proper sentence ending punctuation"""
        errors = []

        # Check if text ends with punctuation
        text_stripped = text.strip()
        if text_stripped and text_stripped[-1] not in self.sentence_endings:
            errors.append({
                'type': 'missing_end_punctuation',
                'position': len(text_stripped),
                'suggestion': 'Add period, question mark, or exclamation point'
            })

        # Check for quote followed by period pattern (common GPT error)
        if text_stripped.endswith('".') or text_stripped.endswith("'."):
            errors.append({
                'type': 'incorrect_quote_punctuation',
                'position': len(text_stripped) - 2,
                'found': text_stripped[-2:],
                'suggestion': 'Move period inside quotes: ."'
            })

        # Check for multiple punctuation marks (except for ?! or !?)
        multi_punct = re.finditer(r'[.!?]{2,}', text)
        for match in multi_punct:
            punct = match.group()
            if punct not in ['?!', '!?', '...']:  # Allow interrobang and ellipsis
                errors.append({
                    'type': 'multiple_punctuation',
                    'found': punct,
                    'position': match.start(),
                    'suggestion': punct[0]  # Just use first punctuation mark
                })

        return errors

    def _check_capitalization(self, text: str) -> List[Dict[str, Any]]:
        """Check for proper capitalization"""
        errors = []

        # Check first letter capitalization
        text_stripped = text.strip()
        if text_stripped and text_stripped[0].islower():
            errors.append({
                'type': 'missing_capital_start',
                'position': 0,
                'suggestion': 'Capitalize first letter'
            })

        # Check for capital letters after periods (new sentences)
        # Account for abbreviations
        sentences = re.split(r'(?<=[.!?])\s+', text)
        position = 0

        for i, sent in enumerate(sentences):
            sent_stripped = sent.strip()
            if sent_stripped and i > 0:  # Not the first sentence
                # Check if previous sentence ended with abbreviation
                prev_sent = sentences[i-1].strip()
                last_word = prev_sent.split(
                )[-1].rstrip('.').lower() if prev_sent else ''

                if last_word not in self.common_abbreviations and sent_stripped[0].islower():
                    errors.append({
                        'type': 'missing_capital_after_period',
                        'position': position,
                        'sentence': sent_stripped[:30] + '...' if len(sent_stripped) > 30 else sent_stripped,
                        'suggestion': 'Capitalize first letter of sentence'
                    })

            position += len(sent) + 1  # +1 for space

        # Check for random capitals in middle of words
        random_caps = re.finditer(r'\b\w*[a-z][A-Z]\w*\b', text)
        for match in random_caps:
            word = match.group()
            # Skip known exceptions like iPhone, eBay, etc.
            if not any(word.startswith(prefix) for prefix in ['i', 'e']) or len(word) < 4:
                errors.append({
                    'type': 'unexpected_capital',
                    'word': word,
                    'position': match.start(),
                    'suggestion': word.lower()
                })

        return errors

    def _check_comma_usage(self, text: str) -> List[Dict[str, Any]]:
        """Check for basic comma usage issues"""
        errors = []

        # Check for missing spaces after commas
        missing_space = re.finditer(r',(?! |\n|$)', text)
        for match in missing_space:
            next_char = text[match.end()] if match.end() < len(text) else ''
            if next_char.isalnum():  # Only flag if followed by letter/number
                errors.append({
                    'type': 'missing_space_after_comma',
                    'position': match.start(),
                    'context': text[max(0, match.start()-10):match.end()+10]
                })

        # Check for spaces before commas
        space_before = re.finditer(r' ,', text)
        for match in space_before:
            errors.append({
                'type': 'space_before_comma',
                'position': match.start(),
                'suggestion': 'Remove space before comma'
            })

        # Check for double commas
        double_comma = re.finditer(r',,+', text)
        for match in double_comma:
            errors.append({
                'type': 'double_comma',
                'position': match.start(),
                'found': match.group(),
                'suggestion': ','
            })

        return errors

    def score(self, text: str, src: Optional[str] = None) -> Dict[str, Any]:
        """Score the text for punctuation issues"""
        all_errors = []

        # Run all checks
        sentence_errors = self._check_sentence_punctuation(text)
        capital_errors = self._check_capitalization(text)
        comma_errors = self._check_comma_usage(text)

        all_errors.extend(sentence_errors)
        all_errors.extend(capital_errors)
        all_errors.extend(comma_errors)

        # Estimate total checkable items
        # (sentences + capitals + commas)
        sentences = len(re.split(r'[.!?]+', text.strip()))
        commas = text.count(',')
        total_checks = sentences * 2 + commas + 1  # rough estimate

        # Calculate score
        score = 1.0 - (len(all_errors) / max(total_checks, 1))

        return {
            "name": self.name,
            "version": self.version,
            "score": max(0.0, score),
            "details": {
                "total_errors": len(all_errors),
                "sentence_errors": len(sentence_errors),
                "capitalization_errors": len(capital_errors),
                "comma_errors": len(comma_errors),
                "errors": all_errors[:10]  # First 10 errors
            }
        }
