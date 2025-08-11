"""
Metrics module for RLVR framework.
Provides pluggable, verifiable metrics for scoring translations.
"""

from .base import Metric
from .diacritics import Diacritics
from .tam_particles import TAMParticles
from .articles_ke_ka import ArticlesKeKa
from .english_articles import ArticlesAAn
from .english_subject_verb import SubjectVerbAgreement
from .english_spelling import SpellingChecker
from .english_punctuation import PunctuationChecker

__all__ = [
    'Metric',
    'Diacritics',
    'TAMParticles',
    'ArticlesKeKa',
    'ArticlesAAn',
    'SubjectVerbAgreement',
    'SpellingChecker',
    'PunctuationChecker'
]
