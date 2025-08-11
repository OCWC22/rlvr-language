"""OpenAI LLM-based candidate generator."""

import os
from typing import List, Dict, Any, Optional
import logging
from pathlib import Path

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    # Try to load from current directory, then parent directory
    if Path('.env').exists():
        load_dotenv('.env')
    elif Path('../.env').exists():
        load_dotenv('../.env')
except ImportError:
    pass

from .base import CandidateGenerator

# Only import openai if it's being used
try:
    import openai
except ImportError:
    openai = None

logger = logging.getLogger(__name__)


class OpenAIGenerator(CandidateGenerator):
    """Generator using OpenAI's API for translation."""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)

        if openai is None:
            raise ImportError(
                "openai package not installed. Run: pip install openai")

        # Get API key from environment or config
        api_key = config.get("api_key") or os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ValueError(
                "OpenAI API key not found in config or OPENAI_API_KEY env var")

        self.client = openai.OpenAI(api_key=api_key)
        self.model = config.get("model", "gpt-5")
        self.default_temperature = config.get("temperature", 0.9)
        self.default_top_p = config.get("top_p", 0.95)

        # GPT-5 only supports temperature=1, so we need to handle this
        self.is_gpt5 = "gpt-5" in self.model.lower()

    def generate(self,
                 src: str,
                 k: int,
                 prompt: Optional[str] = None,
                 temperature: Optional[float] = None,
                 **kwargs) -> List[str]:
        """Generate k translation candidates using OpenAI."""

        if not prompt:
            prompt = "Translate the following English text to Hawaiian:"

        # Format the prompt with the source text
        if "{src}" in prompt:
            full_prompt = prompt.format(src=src)
        else:
            full_prompt = f"{prompt}\n\nInput: {src}\nOutput:"

        temperature = temperature or self.default_temperature

        candidates = []

        # Generate k different candidates
        for i in range(k):
            try:
                # Prepare API call parameters
                api_params = {
                    "model": self.model,
                    "messages": [
                        {"role": "system",
                            "content": "You are a Hawaiian language translator."},
                        {"role": "user", "content": full_prompt}
                    ],
                    "top_p": self.default_top_p,
                    "max_completion_tokens": kwargs.get(
                        "max_completion_tokens", kwargs.get("max_tokens", 2000)),
                    "n": 1,  # Generate one at a time for diversity
                }

                # Only add temperature if not GPT-5 (GPT-5 only supports default temp=1)
                if not self.is_gpt5:
                    api_params["temperature"] = temperature

                # Add seed if provided
                if "seed" in kwargs:
                    api_params["seed"] = kwargs.get("seed", i)

                response = self.client.chat.completions.create(**api_params)

                translation = response.choices[0].message.content.strip()
                candidates.append(translation)

            except Exception as e:
                logger.error(f"Error generating candidate {i+1}: {e}")
                # Add a fallback translation
                candidates.append(f"[Translation error: {str(e)}]")

        return candidates
