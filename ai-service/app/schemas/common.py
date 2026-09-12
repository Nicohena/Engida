"""Common schema definitions"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class BaseResponse(BaseModel):
    """Base response model"""
    success: bool = True
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    message: Optional[str] = None


class ErrorResponse(BaseModel):
    """Error response model"""
    success: bool = False
    error: str
    detail: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class PaginationParams(BaseModel):
    """Pagination parameters"""
    page: int = Field(1, ge=1, description="Page number")
    page_size: int = Field(10, ge=1, le=100, description="Items per page")


class PaginatedResponse(BaseResponse):
    """Paginated response model"""
    total: int
    page: int
    page_size: int
    data: list = []
