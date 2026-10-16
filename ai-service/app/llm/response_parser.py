"""LLM response parsing utilities"""
import json
import re
from typing import Dict, Any, Optional
from app.core.logging import logger


class ResponseParser:
    """Parse and extract structured data from LLM responses"""
    
    @staticmethod
    def extract_json(response: str) -> Optional[Dict[str, Any]]:
        """Extract JSON from LLM response"""
        try:
            # Try direct JSON parsing
            return json.loads(response)
        except json.JSONDecodeError:
            # Try to find JSON in markdown code blocks
            json_pattern = r'```(?:json)?\s*(\{.*?\})\s*```'
            match = re.search(json_pattern, response, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(1))
                except json.JSONDecodeError:
                    pass
        
        logger.warning("Could not extract JSON from LLM response")
        return None
    
    @staticmethod
    def extract_score(response: str) -> Optional[float]:
        """Extract numerical score from response"""
        # Look for patterns like "score: 0.85" or "8.5/10"
        patterns = [
            r'score[:\s]+([0-9.]+)',
            r'([0-9.]+)\s*/\s*10',
            r'rating[:\s]+([0-9.]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, response, re.IGNORECASE)
            if match:
                try:
                    score = float(match.group(1))
                    # Normalize to 0-1 range if needed
                    if score > 1:
                        score = score / 10
                    return min(max(score, 0.0), 1.0)
                except ValueError:
                    continue
        
        return None
    
    @staticmethod
    def clean_text(response: str) -> str:
        """Clean and normalize LLM response text"""
        # Remove excessive whitespace
        cleaned = re.sub(r'\s+', ' ', response)
        # Remove markdown formatting
        cleaned = re.sub(r'[*_~`]', '', cleaned)
        return cleaned.strip()
