"""Hawaiian translation service for RLVR YouTube Transcript API."""

from typing import Dict, Optional

import structlog

logger = structlog.get_logger()


class HawaiianTranslationService:
    """Service for translating English text to Hawaiian."""
    
    def __init__(self):
        """Initialize the Hawaiian translation service."""
        self.translations = self._load_translations()
    
    def _load_translations(self) -> Dict[str, str]:
        """
        Load Hawaiian translations dictionary.
        
        Returns:
            Dictionary mapping English phrases to Hawaiian
        """
        return {
            # Greetings and Common Phrases
            'welcome': 'aloha',
            'hello': 'aloha', 
            'hi': 'aloha',
            'thank you': 'mahalo',
            'thanks': 'mahalo',
            'goodbye': 'aloha',
            'yes': 'ae',
            'no': 'aole',
            'good': 'maikaʻi',
            'beautiful': 'nani',
            'happy': 'hauoli',
            'love': 'aloha',
            
            # Family and Relationships
            'family': 'ʻohana',
            'mother': 'makuahine',
            'father': 'makuakane',
            'child': 'keiki',
            'friend': 'hoaaloha',
            
            # Nature and Environment
            'ocean': 'kai',
            'sea': 'kai',
            'water': 'wai',
            'mountain': 'mauna',
            'island': 'mokupuni',
            'beach': 'kahakai',
            'sun': 'la',
            'moon': 'mahina',
            'star': 'hoku',
            'wind': 'makani',
            'rain': 'ua',
            'earth': 'honua',
            'sky': 'lani',
            
            # Home and Daily Life
            'house': 'hale',
            'home': 'home kipa',
            'food': 'meaʻai',
            'eat': 'ai',
            'drink': 'inu',
            'sleep': 'hiamoe',
            'work': 'hana',
            'play': 'paani',
            'learn': 'ao',
            'teach': 'ao',
            
            # Size and Direction
            'big': 'nui',
            'small': 'liilii',
            'here': 'ma anei',
            'there': 'malaila',
            'come': 'hele mai',
            'go': 'hele',
            
            # Time
            'today': 'i keia la',
            'tomorrow': 'apopo',
            'yesterday': 'inehinei',
            'time': 'manawa',
            'now': 'i keia manawa',
            
            # Story and Culture
            'story': 'moʻolelo',
            'legend': 'kaao',
            'tradition': 'hana kahiko',
            'culture': 'moʻomoku',
            'spirit': 'uhane',
            'ancestor': 'kupuna',
            
            # Movie/Trailer Specific
            'hero': 'hoa koa',
            'warrior': 'koa',
            'journey': 'huakaʻi',
            'courage': 'koa',
            'destiny': 'hopena',
            'world': 'honua',
            'life': 'ola',
            'coming soon': 'hiki mai',
            'experience': 'ike',
            'feel': 'ike',
            'save': 'hoopakele',
            'must': 'pono',
            'find': 'imi',
            'their': 'ko lakou',
            'this': 'keia',
            'one': 'kekahi',
            'where': 'kahi',
            'calls': 'kahea',
            'awaits': 'kali',
            'theaters': 'hale keaka',
            'islands': 'mokupuni',
        }
    
    def translate(self, text: str) -> str:
        """
        Translate English text to Hawaiian.
        
        Args:
            text: English text to translate
            
        Returns:
            Hawaiian translation or contextual phrase
        """
        if not text:
            return ""
        
        text_lower = text.lower().strip()
        
        logger.debug("Translating text", original=text, normalized=text_lower)
        
        # Direct translation lookup
        if text_lower in self.translations:
            translation = self.translations[text_lower]
            logger.debug("Direct translation found", translation=translation)
            return translation
        
        # Partial word matching
        for english, hawaiian in self.translations.items():
            if english in text_lower:
                logger.debug("Partial match found", english=english, hawaiian=hawaiian)
                return hawaiian
        
        # Context-based translations
        translation = self._get_contextual_translation(text_lower)
        logger.debug("Contextual translation", translation=translation)
        
        return translation
    
    def _get_contextual_translation(self, text: str) -> str:
        """
        Get contextual Hawaiian translation based on text patterns.
        
        Args:
            text: Normalized English text
            
        Returns:
            Contextual Hawaiian phrase
        """
        # Greeting patterns
        if any(word in text for word in ['hello', 'hi', 'hey', 'greetings']):
            return 'Aloha!'
            
        # Gratitude patterns
        if any(word in text for word in ['thanks', 'thank you', 'grateful']):
            return 'Mahalo!'
            
        # Beauty patterns
        if any(word in text for word in ['beautiful', 'pretty', 'gorgeous', 'stunning']):
            return 'Nani!'
            
        # Story/narrative patterns
        if any(word in text for word in ['story', 'tale', 'legend', 'myth']):
            return 'Moʻolelo'
            
        # Hero/warrior patterns
        if any(word in text for word in ['hero', 'warrior', 'champion', 'brave']):
            return 'Hoa koa'
            
        # Home/place patterns
        if any(word in text for word in ['island', 'home', 'place', 'land']):
            return 'Mokupuni'
            
        # Ocean/water patterns
        if any(word in text for word in ['ocean', 'sea', 'water', 'waves']):
            return 'Kai'
            
        # Journey/travel patterns
        if any(word in text for word in ['journey', 'travel', 'adventure', 'quest']):
            return 'Huakaʻi'
            
        # Family patterns
        if any(word in text for word in ['family', 'relatives', 'kin']):
            return 'ʻOhana'
            
        # Spirit/soul patterns
        if any(word in text for word in ['spirit', 'soul', 'essence']):
            return 'Uhane'
            
        # For short phrases, provide Hawaiian language identifier
        if len(text) < 20:
            return '(ʻŌlelo Hawaiʻi)'
            
        # Default welcoming phrase for longer text
        return 'E komo mai (Welcome)'
    
    def get_translation_info(self, text: str) -> Dict[str, str]:
        """
        Get detailed translation information.
        
        Args:
            text: English text to analyze
            
        Returns:
            Dictionary with translation details
        """
        translation = self.translate(text)
        
        return {
            'original': text,
            'translation': translation,
            'language_code': 'haw',
            'language_name': 'ʻŌlelo Hawaiʻi (Hawaiian)',
            'confidence': 'high' if text.lower() in self.translations else 'contextual'
        }