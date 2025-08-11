"""
English articles (a/an) metric.
Checks for correct usage of indefinite articles based on phonetics.
"""

import re
from typing import Dict, Any, Optional
from pathlib import Path

from .base import Metric


class ArticlesAAn(Metric):
    name = "articles_a_an"
    version = "1.0"

    def __init__(self, lang_cfg: Dict[str, Any]):
        super().__init__(lang_cfg)

        # Load exceptions from file
        self.exceptions_use_a = set()  # Words starting with vowels that use "a"
        self.exceptions_use_an = set()  # Words starting with consonants that use "an"

        if "resources" in lang_cfg and "article_exceptions" in lang_cfg["resources"]:
            exceptions_path = Path(lang_cfg["resources"]["article_exceptions"])
            if exceptions_path.exists():
                self._load_exceptions(exceptions_path)

        # Common vowel sounds at beginning of words
        self.vowel_sounds = set('aeiouAEIOU')

        # Common patterns for silent 'h'
        self.silent_h_patterns = re.compile(
            r'^(hour|honest|honor|honour|heir)', re.IGNORECASE)

        # Patterns for 'u' that sounds like 'yu'
        self.u_consonant_patterns = re.compile(
            r'^(uni|use|usu|uti|ufo)', re.IGNORECASE)

    def _load_exceptions(self, filepath: Path):
        """Load article exceptions from file"""
        current_section = None

        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    if 'use "a"' in line:
                        current_section = 'a'
                    elif 'use "an"' in line:
                        current_section = 'an'
                    continue

                if current_section == 'a':
                    self.exceptions_use_a.add(line.lower())
                elif current_section == 'an':
                    self.exceptions_use_an.add(line.lower())

    def _should_use_an(self, word: str) -> bool:
        """Determine if a word should be preceded by 'an' vs 'a'"""
        if not word:
            return False

        word_lower = word.lower()

        # Check exceptions first
        if word_lower in self.exceptions_use_an:
            return True
        if word_lower in self.exceptions_use_a:
            return False

        # Check for silent h
        if self.silent_h_patterns.match(word):
            return True

        # Check for 'u' that sounds like consonant
        if word[0].lower() == 'u' and self.u_consonant_patterns.match(word):
            return False

        # Check if starts with vowel sound
        return word[0] in self.vowel_sounds

    def score(self, text: str, src: Optional[str] = None) -> Dict[str, Any]:
        """Score the text for correct a/an usage"""
        errors = []
        checks = []

        # Find all instances of 'a' or 'an' followed by a word
        pattern = r'\b(a|an)\s+(\w+)'
        matches = re.finditer(pattern, text, re.IGNORECASE)

        for match in matches:
            article = match.group(1).lower()
            following_word = match.group(2)

            check = {
                'article': article,
                'word': following_word,
                'position': match.start()
            }
            checks.append(check)

            should_be_an = self._should_use_an(following_word)

            if article == 'a' and should_be_an:
                errors.append({
                    'found': f'a {following_word}',
                    'should_be': f'an {following_word}',
                    'position': match.start(),
                    'type': 'a_should_be_an'
                })
            elif article == 'an' and not should_be_an:
                errors.append({
                    'found': f'an {following_word}',
                    'should_be': f'a {following_word}',
                    'position': match.start(),
                    'type': 'an_should_be_a'
                })

        # Calculate score
        score = 1.0 - (len(errors) / max(len(checks), 1))

        return {
            "name": self.name,
            "version": self.version,
            "score": max(0.0, score),
            "details": {
                "checked": len(checks),
                "errors": len(errors),
                "error_list": errors
            }
        }
