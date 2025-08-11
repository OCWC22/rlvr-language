"""
Articles ke/ka metric for Hawaiian.
Checks for proper use of definite articles based on the KEAO rule and exceptions.
"""

import re
from typing import Dict, Any, Optional, Set, List, Tuple
from pathlib import Path

from .base import Metric


class ArticlesKeKa(Metric):
    """Metric that checks for proper ke/ka article usage in Hawaiian."""

    name = "articles_ke_ka"
    version = "1.0"

    def __init__(self, lang_cfg: Dict[str, Any]):
        super().__init__(lang_cfg)

        # Load exceptions to the KEAO rule
        exceptions_path = Path(lang_cfg["resources"]["ke_exceptions"])
        self.ke_exceptions: Set[str] = set()

        with open(exceptions_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    self.ke_exceptions.add(line.lower())

    def _normalize_word(self, word: str) -> str:
        """Remove punctuation and normalize for comparison."""
        return re.sub(r'[.,!?;:"]', '', word).strip()

    def _should_use_ke(self, word: str) -> bool:
        """
        Determine if a word should use 'ke' article.

        KEAO rule: Use 'ke' before words starting with K, E, A, O
        Plus exceptions loaded from file.
        """
        normalized = self._normalize_word(word).lower()

        # Check if it's an exception
        if normalized in self.ke_exceptions:
            return True

        # Apply KEAO rule
        first_letter = normalized[0] if normalized else ''
        # ʻokina words often use ke
        return first_letter in ['k', 'e', 'a', 'o', 'ʻ']

    def _find_article_pairs(self, words: List[str]) -> List[Tuple[int, str, str]]:
        """
        Find all article-noun pairs in the word list.

        Returns list of (index, article, following_word) tuples.
        """
        pairs = []
        for i in range(len(words) - 1):
            word_lower = words[i].lower()
            if word_lower in ['ke', 'ka']:
                next_word = words[i + 1]
                pairs.append((i, words[i], next_word))
        return pairs

    def score(self, text: str, src: Optional[str] = None) -> Dict[str, Any]:
        """
        Score text based on proper ke/ka article usage.

        Rules:
        - Use 'ke' before K, E, A, O words (KEAO rule)
        - Use 'ke' for exception words
        - Use 'ka' for all other cases
        """
        # Tokenize
        words = text.split()

        # Find all article-noun pairs
        pairs = self._find_article_pairs(words)

        if not pairs:
            # No articles found - perfect score
            return {
                "name": self.name,
                "version": self.version,
                "score": 1.0,
                "details": {
                    "checked": 0,
                    "correct": 0,
                    "pairs": []
                }
            }

        # Check each pair
        correct_count = 0
        pair_details = []

        for idx, article, next_word in pairs:
            should_be_ke = self._should_use_ke(next_word)
            is_correct = (should_be_ke and article.lower() == 'ke') or \
                (not should_be_ke and article.lower() == 'ka')

            if is_correct:
                correct_count += 1

            pair_details.append({
                "article": article,
                "word": next_word,
                "correct": is_correct,
                "should_be": "ke" if should_be_ke else "ka",
                "reason": "exception" if next_word.lower() in self.ke_exceptions else "KEAO rule"
            })

        score = correct_count / len(pairs) if pairs else 1.0

        return {
            "name": self.name,
            "version": self.version,
            "score": score,
            "details": {
                "checked": len(pairs),
                "correct": correct_count,
                "pairs": pair_details,
                "errors": [p for p in pair_details if not p["correct"]]
            }
        }
