"""Tokenization utilities for text processing."""

import re
from typing import List


def basic_tokenizer(text: str) -> List[str]:
    """
    Basic word tokenizer that preserves Hawaiian diacritics.

    Args:
        text: Input text to tokenize

    Returns:
        List of tokens
    """
    # Split on whitespace while preserving punctuation as separate tokens
    # This regex splits on whitespace and captures punctuation
    tokens = re.findall(r"\b[\w'ʻāēīōūĀĒĪŌŪ]+\b|[.!?;,:]", text)
    return tokens


def tokenize_preserving_position(text: str) -> List[tuple]:
    """
    Tokenize text while preserving original positions.

    Args:
        text: Input text

    Returns:
        List of (token, start_pos, end_pos) tuples
    """
    tokens = []
    # Match words (including Hawaiian chars) and punctuation
    pattern = r"\b[\w'ʻāēīōūĀĒĪŌŪ]+\b|[.!?;,:]"

    for match in re.finditer(pattern, text):
        token = match.group()
        start = match.start()
        end = match.end()
        tokens.append((token, start, end))

    return tokens
