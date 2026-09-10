"""
ENGIDA AI Service - FastAPI Application

This service handles all AI/ML/NLP intelligence for the ENGIDA platform:
- Property recommendations
- Price predictions
- Fraud detection
- Image analysis
- Search intelligence
- Natural language processing

The service is designed to be provider-agnostic and modular.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import logger
from app.api.router import api_router

app = FastAPI(
    title="ENGIDA AI Service",
    description="AI/ML Intelligence Service for Ethiopian Property Marketplace",
    version="0.1.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API router
app.include_router(api_router, prefix="/api/v1")


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting ENGIDA AI Service...")
    # TODO: Load models, initialize services


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down ENGIDA AI Service...")
    # TODO: Close connections, cleanup resources


@app.get("/")
async def root():
    return {
        "service": "ENGIDA AI Service",
        "version": "0.1.0",
        "status": "operational",
    }
