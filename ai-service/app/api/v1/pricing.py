"""Pricing prediction API endpoints"""
from fastapi import APIRouter
from app.schemas.pricing import PricingRequest, PricingResponse
from app.services.pricing_service import PricingService

router = APIRouter()
pricing_service = PricingService()


@router.post("/predict", response_model=PricingResponse)
async def predict_price(request: PricingRequest) -> PricingResponse:
    """
    Predict property price based on features, structural specs, and market calibrations.
    """
    return await pricing_service.predict_price(request)
