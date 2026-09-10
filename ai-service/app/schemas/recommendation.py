"""Recommendation schema definitions"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class RecommendationRequest(BaseModel):
    """Recommendation request schema"""
    user_id: str
    context: Optional[Dict[str, Any]] = None
    limit: int = Field(10, ge=1, le=50)
    exclude_ids: List[str] = []


class RecommendedProperty(BaseModel):
    """Recommended property item"""
    property_id: str
    score: float = Field(..., ge=0, le=1)
    reason: str
    features_matched: List[str] = []


class RecommendationResponse(BaseModel):
    """Recommendation response schema"""
    recommendations: List[RecommendedProperty]
    total: int
    algorithm_used: str = "collaborative_filtering"
