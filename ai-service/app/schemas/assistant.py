"""AI Assistant schema definitions"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List


class AssistantRequest(BaseModel):
    """Assistant request schema"""
    message: str = Field(..., min_length=1, max_length=1000)
    user_id: Optional[str] = None
    conversation_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class AssistantResponse(BaseModel):
    """Assistant response schema"""
    message: str
    context: Dict[str, Any] = {}
    suggestions: List[str] = []
    conversation_id: Optional[str] = None
