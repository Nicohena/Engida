"""API Router - Aggregates all API routes"""
from fastapi import APIRouter
from app.api.v1 import (
    health,
    search,
    recommendations,
    assistant,
    listings,
    pricing,
    risk,
)

api_router = APIRouter()

# Include all v1 routes
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(recommendations.router, prefix="/recommendations", tags=["recommendations"])
api_router.include_router(assistant.router, prefix="/assistant", tags=["assistant"])
api_router.include_router(listings.router, prefix="/listings", tags=["listings"])
api_router.include_router(pricing.router, prefix="/pricing", tags=["pricing"])
api_router.include_router(risk.router, prefix="/risk", tags=["risk"])
