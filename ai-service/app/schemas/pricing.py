"""Pricing schema definitions"""
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional


class PricingRequest(BaseModel):
    """Pricing prediction request schema"""
    property_type: str
    location: str
    bedrooms: int = Field(..., ge=0)
    bathrooms: int = Field(..., ge=0)
    area_sqm: float = Field(..., gt=0)
    features: Dict[str, Any] = {}


class PriceRange(BaseModel):
    """Price range"""
    min: float
    max: float


class PricingResponse(BaseModel):
    """Pricing prediction response schema"""
    predicted_price: float
    confidence: float = Field(..., ge=0, le=1)
    price_range: PriceRange
    factors: Dict[str, float] = {}
    market_comparison: Optional[Dict[str, Any]] = None
