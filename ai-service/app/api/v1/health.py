"""Health check endpoints"""
from fastapi import APIRouter
from datetime import datetime

router = APIRouter()


@router.get("")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "ai-service",
    }


@router.get("/ready")
async def readiness_check():
    """Readiness check for Kubernetes/container orchestration"""
    # Future: Check database connections, model loading, etc.
    return {
        "ready": True,
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/live")
async def liveness_check():
    """Liveness check for Kubernetes/container orchestration"""
    return {
        "alive": True,
        "timestamp": datetime.utcnow().isoformat(),
    }
