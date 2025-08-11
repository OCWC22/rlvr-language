"""Base class for all metrics."""

from typing import Dict, Any, Optional
from abc import ABC, abstractmethod


class Metric(ABC):
    """Base class for all verifiable metrics."""

    name: str = "base"
    version: str = "1.0"

    def __init__(self, lang_cfg: Dict[str, Any]):
        """
        Initialize metric with language configuration.

        Args:
            lang_cfg: Language configuration dictionary containing resources, etc.
        """
        self.lang_cfg = lang_cfg

    @abstractmethod
    def score(self, text: str, src: Optional[str] = None) -> Dict[str, Any]:
        """
        Score the given text.

        Args:
            text: Target language text to score
            src: Optional source text for context

        Returns:
            Dictionary with:
                - name: metric name
                - version: metric version
                - score: float between 0 and 1
                - details: additional scoring details
        """
        pass

    def __repr__(self):
        return f"{self.__class__.__name__}(name={self.name}, version={self.version})"
