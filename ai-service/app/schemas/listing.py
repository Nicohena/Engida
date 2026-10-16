"""Listing schema definitions"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class ListingAnalysisRequest(BaseModel):
    """Listing analysis request schema"""
    listing_id: str
    title: str
    description: str
    images: List[str] = []
    features: Dict[str, Any] = {}


class ListingSuggestion(BaseModel):
    """Listing improvement suggestion"""
    category: str
    suggestion: str
    impact: str = Field(..., description="low, medium, high")


class ListingAnalysisResponse(BaseModel):
    """Listing analysis response schema"""
    quality_score: float = Field(..., ge=0, le=1)
    completeness_score: float = Field(..., ge=0, le=1)
    suggestions: List[ListingSuggestion] = []
    strengths: List[str] = []
    weaknesses: List[str] = []
