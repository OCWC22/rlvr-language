"""
English subject-verb agreement metric.
Checks for agreement between subjects and verbs in sentences.
"""

import re
import json
from typing import Dict, Any, Optional, List, Tuple
from pathlib import Path

from .base import Metric


class SubjectVerbAgreement(Metric):
    name = "subject_verb_agreement"
    version = "1.0"

    def __init__(self, lang_cfg: Dict[str, Any]):
        super().__init__(lang_cfg)

        # Common singular subjects
        self.singular_subjects = {
            'he', 'she', 'it', 'this', 'that', 'everyone', 'everybody',
            'someone', 'somebody', 'anyone', 'anybody', 'no one', 'nobody',
            'each', 'either', 'neither', 'one', 'every', 'a', 'an'
        }

        # Common plural subjects
        self.plural_subjects = {
            'they', 'we', 'these', 'those', 'many', 'few', 'several',
            'both', 'all', 'some', 'most'
        }

        # Load irregular verbs if available
        self.irregular_verbs = {}
        if "resources" in lang_cfg and "irregular_verbs" in lang_cfg["resources"]:
            verbs_path = Path(lang_cfg["resources"]["irregular_verbs"])
            if verbs_path.exists():
                with open(verbs_path, 'r', encoding='utf-8') as f:
                    self.irregular_verbs = json.load(f)

        # Basic verb forms
        self.be_forms = {
            'singular': {'is', 'was'},
            'plural': {'are', 'were'},
            'first_person': {'am'}
        }

        self.have_forms = {
            'singular': {'has'},
            'plural': {'have'}
        }

        self.do_forms = {
            'singular': {'does'},
            'plural': {'do'}
        }

    def _identify_subject_type(self, subject: str) -> Optional[str]:
        """Identify if subject is singular or plural"""
        subject_lower = subject.lower().strip()

        # Check pronouns first
        if subject_lower == 'i':
            return 'first_person_singular'
        elif subject_lower == 'you':
            return 'second_person'  # Could be singular or plural
        elif subject_lower in self.singular_subjects:
            return 'singular'
        elif subject_lower in self.plural_subjects:
            return 'plural'

        # Check for plural endings
        if subject_lower.endswith('s') and not subject_lower.endswith('ss'):
            # Likely plural noun
            return 'plural'

        # Check for compound subjects (and)
        if ' and ' in subject_lower:
            return 'plural'

        # Default to singular for other cases
        return 'singular'

    def _check_verb_agreement(self, subject: str, verb: str) -> Optional[Dict[str, Any]]:
        """Check if verb agrees with subject"""
        subject_type = self._identify_subject_type(subject)
        verb_lower = verb.lower()

        # Check 'be' verbs
        if verb_lower in self.be_forms['singular'] | self.be_forms['plural'] | self.be_forms['first_person']:
            if subject_type == 'singular' and verb_lower in self.be_forms['plural']:
                return {
                    'error': 'singular_subject_plural_verb',
                    'subject': subject,
                    'verb': verb,
                    'suggestion': 'is' if verb_lower == 'are' else 'was'
                }
            elif subject_type == 'plural' and verb_lower in self.be_forms['singular']:
                return {
                    'error': 'plural_subject_singular_verb',
                    'subject': subject,
                    'verb': verb,
                    'suggestion': 'are' if verb_lower == 'is' else 'were'
                }
            elif subject_type == 'first_person_singular' and verb_lower not in {'am', 'was'}:
                return {
                    'error': 'first_person_wrong_verb',
                    'subject': subject,
                    'verb': verb,
                    'suggestion': 'am' if verb_lower in ['is', 'are'] else 'was'
                }

        # Check 'have' verbs
        elif verb_lower in self.have_forms['singular'] | self.have_forms['plural']:
            if subject_type in ['singular', 'first_person_singular'] and verb_lower == 'have':
                # This is often okay, but flag for third person singular
                if subject.lower() in ['he', 'she', 'it']:
                    return {
                        'error': 'third_person_singular_have',
                        'subject': subject,
                        'verb': verb,
                        'suggestion': 'has'
                    }
            elif subject_type == 'plural' and verb_lower == 'has':
                return {
                    'error': 'plural_subject_has',
                    'subject': subject,
                    'verb': verb,
                    'suggestion': 'have'
                }

        # Check 'do' verbs
        elif verb_lower in self.do_forms['singular'] | self.do_forms['plural']:
            if subject_type == 'plural' and verb_lower == 'does':
                return {
                    'error': 'plural_subject_does',
                    'subject': subject,
                    'verb': verb,
                    'suggestion': 'do'
                }
            elif subject_type == 'singular' and subject.lower() in ['he', 'she', 'it'] and verb_lower == 'do':
                return {
                    'error': 'third_person_singular_do',
                    'subject': subject,
                    'verb': verb,
                    'suggestion': 'does'
                }

        # Check regular verbs with -s ending
        elif subject_type == 'plural' and verb_lower.endswith('s') and not verb_lower.endswith('ss'):
            # Plural subjects generally don't use -s form
            base_verb = verb[:-1] if verb.endswith('s') else verb
            return {
                'error': 'plural_subject_s_verb',
                'subject': subject,
                'verb': verb,
                'suggestion': base_verb
            }
        elif subject_type == 'singular' and subject.lower() in ['he', 'she', 'it']:
            # Third person singular usually needs -s
            if not verb_lower.endswith('s') and verb_lower not in ['was', 'is', 'has', 'does', 'can', 'will', 'would', 'could', 'should', 'may', 'might']:
                return {
                    'error': 'third_person_singular_missing_s',
                    'subject': subject,
                    'verb': verb,
                    'suggestion': self._add_s_to_verb(verb)
                }

        return None

    def _add_s_to_verb(self, verb: str) -> str:
        """Add -s to verb following English rules"""
        if verb.endswith('y') and len(verb) > 1 and verb[-2] not in 'aeiou':
            return verb[:-1] + 'ies'
        elif verb.endswith(('s', 'x', 'z', 'ch', 'sh')):
            return verb + 'es'
        else:
            return verb + 's'

    def score(self, text: str, src: Optional[str] = None) -> Dict[str, Any]:
        """Score the text for subject-verb agreement"""
        errors = []
        checks = []

        # Split into sentences
        sentences = re.split(r'[.!?]+', text.strip())

        for sent in sentences:
            sent = sent.strip()
            if not sent:
                continue

            # Pattern to find subject-verb pairs
            # This is simplified - real parsing would be more complex
            patterns = [
                # Pronoun + verb
                r'\b(I|you|he|she|it|we|they)\s+(\w+)',
                # Article + noun + verb
                r'\b(a|an|the)\s+(\w+)\s+(\w+)',
                # Determiner + noun + verb
                r'\b(this|that|these|those|every|each)\s+(\w+)\s+(\w+)',
                # Simple noun + verb
                r'^(\w+)\s+(\w+)',
            ]

            for pattern in patterns:
                matches = re.finditer(pattern, sent, re.IGNORECASE)
                for match in matches:
                    groups = match.groups()
                    if len(groups) == 2:
                        subject, verb = groups
                    elif len(groups) == 3:
                        # For patterns with article/determiner
                        if groups[0].lower() in ['a', 'an', 'the']:
                            subject = f"{groups[0]} {groups[1]}"
                            verb = groups[2]
                        else:
                            subject = f"{groups[0]} {groups[1]}"
                            verb = groups[2]
                    else:
                        continue

                    # Skip if verb is not actually a verb (basic check)
                    if verb.lower() in ['the', 'a', 'an', 'and', 'or', 'but', 'with', 'to', 'for', 'in', 'on', 'at']:
                        continue

                    check = {
                        'subject': subject,
                        'verb': verb,
                        'sentence': sent[:50] + '...' if len(sent) > 50 else sent
                    }
                    checks.append(check)

                    # Check agreement
                    error = self._check_verb_agreement(subject, verb)
                    if error:
                        error['sentence'] = check['sentence']
                        errors.append(error)

                    # Only check first valid pattern per sentence to avoid duplicates
                    break

        # Calculate score
        score = 1.0 - (len(errors) / max(len(checks), 1))

        return {
            "name": self.name,
            "version": self.version,
            "score": max(0.0, score),
            "details": {
                "checks_performed": len(checks),
                "errors_found": len(errors),
                "errors": errors[:5]  # Limit to first 5 errors
            }
        }
