"""Risk assessment schema definitions"""
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from enum import Enum


class RiskLevel(str, Enum):
    """Risk level enum"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RiskAssessmentRequest(BaseModel):
    """Risk assessment request schema"""
    entity_type: str = Field(..., description="listing, user, transaction")
    entity_id: str
    data: Dict[str, Any]


class RiskFlag(BaseModel):
    """Individual risk flag"""
    type: str
    severity: RiskLevel
    description: str
    evidence: Dict[str, Any] = {}


class RiskAssessmentResponse(BaseModel):
    """Risk assessment response schema"""
    risk_score: float = Field(..., ge=0, le=1)
    risk_level: RiskLevel
    flags: List[RiskFlag] = []
    confidence: float = Field(..., ge=0, le=1)
    recommendation: Optional[str] = None
