"""
Bidirectional generator wrapper for RLVR.
Handles both English->Hawaiian and Hawaiian->English translations.
"""

from typing import List, Dict, Any, Optional, Literal
import logging
from pathlib import Path

from .base import CandidateGenerator

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

logger = logging.getLogger(__name__)

TranslationDirection = Literal["en_to_haw", "haw_to_en", "auto"]


class BiDirectionalGenerator(CandidateGenerator):
    """
    Wrapper that handles both translation directions with appropriate
    models and prompts for each direction.
    """

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)

        # Store base config
        self.config = config

        # Initialize OpenAI client
        self._init_openai()

        # Store direction-specific prompts
        self.prompts = {
            "en_to_haw": config.get("generator", {}).get("params", {}).get("prompt_template", ""),
            "haw_to_en": ""  # Will be set from English config
        }

        # Default generation parameters
        self.default_params = {
            "temperature": 0.7,
            "top_p": 0.9,
            "max_completion_tokens": 2000
        }

    def _init_openai(self):
        """Initialize OpenAI client"""
        import os
        try:
            from openai import OpenAI
            api_key = os.environ.get('OPENAI_API_KEY')
            if not api_key:
                raise ValueError("OPENAI_API_KEY environment variable not set")
            self.client = OpenAI(api_key=api_key)
            self.model = "gpt-5"
        except ImportError:
            raise ImportError("Please install openai: pip install openai")

    def set_prompt_for_direction(self, direction: str, prompt_template: str):
        """Set prompt template for a specific direction"""
        self.prompts[direction] = prompt_template

    def detect_direction(self, text: str) -> str:
        """Auto-detect translation direction based on text"""
        # Hawaiian markers
        hawaiian_markers = ['ʻ', 'ō', 'ā', 'ē',
                            'ī', 'ū', 'Ō', 'Ā', 'Ē', 'Ī', 'Ū']

        # Check for Hawaiian diacritics
        if any(marker in text for marker in hawaiian_markers):
            return "haw_to_en"

        # Check for common Hawaiian words (without diacritics)
        hawaiian_words = {
            'aloha', 'mahalo', 'keiki', 'ohana', 'lei', 'hula', 'kai',
            'mauka', 'makai', 'pau', 'wiki', 'lanai', 'kokua', 'malama',
            'ke', 'ka', 'na', 'he', 'ua', 'e', 'i', 'o', 'no', 'ma'
        }

        words = text.lower().split()
        hawaiian_count = sum(1 for w in words if w in hawaiian_words)

        # If more than 20% of words are Hawaiian, assume Hawaiian source
        if len(words) > 0 and hawaiian_count / len(words) > 0.2:
            return "haw_to_en"

        return "en_to_haw"

    def generate(
        self,
        src: str,
        k: int = 12,
        direction: Optional[TranslationDirection] = None,
        prompt: Optional[str] = None,
        **kwargs
    ) -> List[str]:
        """
        Generate k translation candidates.

        Args:
            src: Source text to translate
            k: Number of candidates to generate
            direction: Translation direction (en_to_haw, haw_to_en, or auto)
            prompt: Custom prompt template (overrides default)
            **kwargs: Additional parameters (temperature, top_p, etc.)
        """

        # Determine direction
        if direction is None or direction == "auto":
            direction = self.detect_direction(src)

        logger.info(f"Translating {direction}: '{src[:50]}...'")

        # Get appropriate prompt
        if prompt is None:
            prompt = self.prompts.get(direction, "")
            if not prompt:
                # Fallback prompts
                if direction == "en_to_haw":
                    prompt = "Translate the following English text to Hawaiian:\n\nEnglish: {src}\nHawaiian:"
                else:  # haw_to_en
                    prompt = "Translate the following Hawaiian text to English:\n\nHawaiian: {src}\nEnglish:"

        # Format prompt with source text
        formatted_prompt = prompt.replace("{src}", src)

        # Merge parameters
        gen_params = self.default_params.copy()
        if "params" in self.config.get("generator", {}):
            gen_params.update(self.config["generator"]["params"])
        gen_params.update(kwargs)

        # Generate candidates
        candidates = []

        try:
            for i in range(k):
                # Vary temperature slightly for diversity
                temp = gen_params.get("temperature", 0.7)
                temp_variation = temp + (i * 0.05) if i < 4 else temp + 0.2

                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "You are an expert translator."},
                        {"role": "user", "content": formatted_prompt}
                    ],
                    temperature=min(temp_variation, 1.0),
                    top_p=gen_params.get("top_p", 0.9),
                    max_completion_tokens=gen_params.get(
                        "max_completion_tokens", gen_params.get("max_tokens", 2000)),
                    n=1
                )

                candidate = response.choices[0].message.content.strip()

                # Post-process based on direction
                if direction == "haw_to_en":
                    candidate = self._post_process_english(candidate)

                candidates.append(candidate)

        except Exception as e:
            logger.error(f"Error generating candidates: {str(e)}")
            # Return at least what we have
            if not candidates:
                candidates = [f"Error: {str(e)}"]

        # Remove duplicates while preserving order
        seen = set()
        unique_candidates = []
        for c in candidates:
            if c not in seen:
                seen.add(c)
                unique_candidates.append(c)

        return unique_candidates[:k]

    def _post_process_english(self, text: str) -> str:
        """Post-process English translations"""
        # Ensure first letter is capitalized
        if text and text[0].islower():
            text = text[0].upper() + text[1:]

        # Ensure ends with punctuation
        if text and text[-1] not in '.!?':
            text += '.'

        # Remove any leading/trailing quotes that might have been added
        text = text.strip('"\'')

        return text

    def translate(self, src: str, direction: Optional[str] = None, **kwargs) -> str:
        """
        Translate text and return single best candidate.
        Convenience method that returns first candidate.
        """
        candidates = self.generate(src, k=1, direction=direction, **kwargs)
        return candidates[0] if candidates else ""
