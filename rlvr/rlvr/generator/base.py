"""Base interface for candidate generators."""

from typing import List, Dict, Any, Optional
from abc import ABC, abstractmethod


class CandidateGenerator(ABC):
    """Abstract base class for translation candidate generators."""

    def __init__(self, config: Dict[str, Any]):
        """
        Initialize generator with configuration.

        Args:
            config: Generator configuration dictionary
        """
        self.config = config

    @abstractmethod
    def generate(self,
                 src: str,
                 k: int,
                 prompt: Optional[str] = None,
                 temperature: Optional[float] = None,
                 **kwargs) -> List[str]:
        """
        Generate k translation candidates for the source text.

        Args:
            src: Source text to translate
            k: Number of candidates to generate
            prompt: Optional prompt template
            temperature: Optional temperature override
            **kwargs: Additional generation parameters

        Returns:
            List of k translation candidates
        """
        pass

    def translate(self,
                  src: str,
                  prompt: Optional[str] = None,
                  **kwargs) -> str:
        """
        Generate a single translation (convenience method).

        Args:
            src: Source text to translate
            prompt: Optional prompt template
            **kwargs: Additional generation parameters

        Returns:
            Single translation
        """
        candidates = self.generate(src, k=1, prompt=prompt, **kwargs)
        return candidates[0] if candidates else ""

    def __repr__(self):
        return f"{self.__class__.__name__}(config={self.config})"
