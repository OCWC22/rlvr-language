"""Text normalization utilities."""

import re
import unicodedata


def normalize_text(text: str, preserve_case: bool = False) -> str:
    """
    Normalize text for consistent processing.

    Args:
        text: Input text
        preserve_case: Whether to preserve original case

    Returns:
        Normalized text
    """
    # Normalize unicode (NFC form for Hawaiian diacritics)
    text = unicodedata.normalize('NFC', text)

    # Replace multiple spaces with single space
    text = re.sub(r'\s+', ' ', text)

    # Strip leading/trailing whitespace
    text = text.strip()

    # Optionally lowercase
    if not preserve_case:
        text = text.lower()

    return text


def normalize_hawaiian_variations(text: str) -> str:
    """
    Normalize common Hawaiian character variations.

    Handles:
    - Different apostrophe types → ʻokina
    - Combining diacritics → precomposed characters
    """
    # Replace various apostrophes with proper ʻokina
    apostrophe_variants = ["'", "'", "'", "`", "ʼ", "′"]
    for variant in apostrophe_variants:
        text = text.replace(variant, "ʻ")

    # Ensure macrons are in NFC form (precomposed)
    text = unicodedata.normalize('NFC', text)

    return text


def strip_diacritics(text: str) -> str:
    """
    Remove all diacritics from text (for base form comparison).

    Args:
        text: Input text with diacritics

    Returns:
        Text without diacritics
    """
    # Remove ʻokina
    text = text.replace('ʻ', '').replace('ʻ', '')

    # Remove macrons
    replacements = {
        'ā': 'a', 'ē': 'e', 'ī': 'i', 'ō': 'o', 'ū': 'u',
        'Ā': 'A', 'Ē': 'E', 'Ī': 'I', 'Ō': 'O', 'Ū': 'U'
    }

    for macron, plain in replacements.items():
        text = text.replace(macron, plain)

    return text
