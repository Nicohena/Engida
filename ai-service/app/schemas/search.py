"""Search schema definitions"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from app.schemas.common import PaginatedResponse


class SearchRequest(BaseModel):
    """Search request schema"""
    query: str = Field(..., description="Search query")
    location: Optional[str] = Field(None, description="Location filter")
    property_type: Optional[str] = Field(None, description="Property type filter")
    min_price: Optional[float] = Field(None, ge=0)
    max_price: Optional[float] = Field(None, ge=0)
    bedrooms: Optional[int] = Field(None, ge=0)
    bathrooms: Optional[int] = Field(None, ge=0)
    page: int = Field(1, ge=1)
    page_size: int = Field(10, ge=1, le=100)


class SearchResult(BaseModel):
    """Individual search result"""
    property_id: str
    title: str
    description: str
    relevance_score: float = Field(..., ge=0, le=1)
    matched_terms: List[str] = []


class SearchResponse(PaginatedResponse):
    """Search response schema"""
    results: List[SearchResult] = []
    query_understanding: Optional[Dict[str, Any]] = None
