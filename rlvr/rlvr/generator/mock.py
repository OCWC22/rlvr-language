"""Mock generator for testing without API calls."""

import random
from typing import List, Dict, Any, Optional

from .base import CandidateGenerator


class MockGenerator(CandidateGenerator):
    """Mock generator that returns predefined translations for testing."""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)

        # Predefined mock translations with varying quality
        self.mock_translations = {
            "We already finished the report.": [
                "Ua pau ka hōʻike.",  # Good - correct diacritics and article
                "Ua pau ke hoike.",   # Missing diacritics
                "Ua pau ka hoike.",   # Missing diacritics
                "Ua pau ke hōʻike.",  # Wrong article
            ],
            "Do not go there.": [
                "Mai hele ʻoe i laila.",  # Good
                "Mai hele oe i laila.",   # Missing ʻokina
                "ʻAʻole hele i laila.",   # Different construction
                "No hele i laila.",       # Wrong negation
            ],
            "It is not raining.": [
                "ʻAʻole e ua ana.",      # Good - correct TAM
                "ʻAʻole ua.",            # Invalid TAM combo
                "Aole e ua ana.",        # Missing ʻokina
                "ʻAʻole i ua.",          # Wrong TAM particle
            ],
            "The children are playing.": [
                "Ke pāʻani nei nā keiki.",  # Good
                "Ke paani nei na keiki.",   # Missing diacritics
                "Ka pāʻani nei nā keiki.",  # Wrong article (should be ke)
                "E pāʻani ana nā keiki.",   # Alternative TAM
            ]
        }

    def generate(self,
                 src: str,
                 k: int,
                 prompt: Optional[str] = None,
                 temperature: Optional[float] = None,
                 **kwargs) -> List[str]:
        """Generate mock translation candidates."""

        # Check if we have predefined translations
        if src in self.mock_translations:
            candidates = self.mock_translations[src].copy()
            # Add variations if we need more
            while len(candidates) < k:
                base = random.choice(candidates)
                # Create variation by randomly removing diacritics
                variation = base.replace('ʻ', '').replace(
                    'ā', 'a').replace('ō', 'o')
                candidates.append(variation)
            return candidates[:k]

        # Generic mock translations for unknown inputs
        base_translations = [
            f"Hawaiian translation of: {src}",
            f"Ke {src} nei.",
            f"ʻO ka {src}.",
            f"Ua {src}.",
        ]

        candidates = []
        for i in range(k):
            if i < len(base_translations):
                candidates.append(base_translations[i])
            else:
                # Add variations
                candidates.append(f"Translation {i+1}: {src}")

        return candidates
