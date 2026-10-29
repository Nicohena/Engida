"""Pricing schema definitions for ENGIDA Property Pricing Engine."""
from typing import Dict, Any, Optional, List, Literal
from pydantic import BaseModel, Field, ConfigDict, model_validator


class KeyPriceDriver(BaseModel):
    """Specific feature or location driver contributing to the valuation."""
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    factor: str
    impact: str
    type: Literal["positive", "neutral", "premium", "incentive", "recommended"] = "positive"


class PriceStrategyTier(BaseModel):
    """Strategy tier recommendation (e.g. fast-booking floor, recommended optimal, or peak ceiling)."""
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    rate: float
    label: str
    badge: Optional[str] = None
    rationale: str
    occupancy_target: Optional[str] = Field(None, alias="occupancyTarget")


class PriceTiers(BaseModel):
    """Container for the three strategic pricing tiers."""
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    fast_booking: PriceStrategyTier = Field(..., alias="fastBooking")
    optimal: PriceStrategyTier
    peak_season: PriceStrategyTier = Field(..., alias="peakSeason")


class PriceRange(BaseModel):
    """Price corridor range."""
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    min: float
    max: float


class PriceBreakdown(BaseModel):
    """Detailed valuation breakdown explaining how the price was formulated."""
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    base_rate_etb: float = Field(..., alias="baseRateEtb")
    location_multiplier: float = Field(..., alias="locationMultiplier")
    location_tier: str = Field(..., alias="locationTier")
    property_type_multiplier: float = Field(..., alias="propertyTypeMultiplier")
    amenities_premium_etb: float = Field(..., alias="amenitiesPremiumEtb")
    key_drivers: List[KeyPriceDriver] = Field(default_factory=list, alias="keyDrivers")


class ComparableMarketData(BaseModel):
    """Aggregated market statistics from active, published competitor listings."""
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    sample_count: int = Field(0, alias="sampleCount")
    median_price: float = Field(0.0, alias="medianPrice")
    min_price: float = Field(0.0, alias="minPrice")
    max_price: float = Field(0.0, alias="maxPrice")
    average_price: float = Field(0.0, alias="averagePrice")
    price_per_sqm_median: Optional[float] = Field(None, alias="pricePerSqmMedian")
    evidence_type: str = Field("active_asking_prices", alias="evidenceType")
    sub_city_match_count: int = Field(0, alias="subCityMatchCount")
    city_match_count: int = Field(0, alias="cityMatchCount")
    blending_weight: float = Field(0.0, alias="blendingWeight")
    eligible_count: Optional[int] = Field(None, alias="eligibleCount")
    retained_count: Optional[int] = Field(None, alias="retainedCount")
    average_quality_score: Optional[float] = Field(None, alias="averageQualityScore")
    price_dispersion_cv: Optional[float] = Field(None, alias="priceDispersionCv")


class SeasonalAdjustmentInfo(BaseModel):
    """Evidence-based seasonal ADR calibration details."""
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    applied: bool = False
    seasonal_multiplier: float = Field(1.0, alias="seasonalMultiplier")
    season_name: str = Field("Standard Rate", alias="seasonName")
    status: str = Field("insufficient_historical_data")
    reason: str = Field(...)
    historical_booking_count: int = Field(0, alias="historicalBookingCount")
    minimum_required_count: int = Field(30, alias="minimumRequiredCount")


class PricingRequest(BaseModel):
    """
    Pricing prediction request schema.
    Compatible with NestJS and host frontend listing state.
    """
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    property_id: Optional[str] = Field(None, alias="propertyId", description="Listing ID to exclude from comparables")
    city: str = Field(..., min_length=1, description="City, e.g. Addis Ababa, Bishoftu, Hawassa")
    sub_city: Optional[str] = Field(None, alias="subCity", description="Sub-city or district, e.g. Bole, Kirkos")
    neighborhood: Optional[str] = Field(None, description="Neighborhood name, e.g. Kazanchis, Atlas, Sarbet")
    property_type: str = Field(..., alias="propertyType", description="Property category, e.g. APARTMENT, VILLA, HOUSE")
    listing_type: Optional[str] = Field("RENTAL", alias="listingType", description="'RENTAL' for nightly or 'SALE' for purchase")
    bedrooms: int = Field(0, ge=0, description="Number of bedrooms")
    bathrooms: int = Field(0, ge=0, description="Number of bathrooms")
    max_guests: int = Field(1, ge=1, alias="maxGuests", description="Max overnight guests")
    area_sqm: Optional[float] = Field(None, ge=0, alias="areaSqm", description="Total usable area in square meters")
    amenities: List[str] = Field(default_factory=list, description="List of amenity names or catalog IDs")
    cover_image: Optional[str] = Field(None, alias="coverImage")
    images: Optional[List[str]] = Field(default_factory=list)
    regeneration_index: Optional[int] = Field(0, ge=0, alias="regenerationIndex")
    comparables: Optional[ComparableMarketData] = None
    seasonal_adjustment: Optional[SeasonalAdjustmentInfo] = Field(None, alias="seasonalAdjustment")

    # Legacy field backward compatibility
    location: Optional[str] = None
    features: Optional[Dict[str, Any]] = None

    @model_validator(mode="before")
    @classmethod
    def reconcile_legacy_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # If location is provided without city, use location as city
            if not data.get("city") and data.get("location"):
                data["city"] = data["location"]
            # If property_type is missing but propertyType is present
            if not data.get("property_type") and data.get("propertyType"):
                data["property_type"] = data["propertyType"]
        return data


class PricingResponse(BaseModel):
    """
    Pricing prediction response schema.
    Directly aligns with frontend AiPricePredictionResponse and NestJS contracts.
    """
    model_config = ConfigDict(populate_by_name=True, serialize_by_alias=True)

    predicted_price: float = Field(..., alias="predictedPrice")
    currency: Literal["ETB"] = "ETB"
    confidence: float = Field(..., ge=0.0, le=1.0)
    price_range: PriceRange = Field(..., alias="priceRange")
    tiers: Optional[PriceTiers] = None
    host_tip: Optional[str] = Field(None, alias="hostTip")
    breakdown: PriceBreakdown
    factors: Dict[str, float] = Field(default_factory=dict)
    market_comparison: Optional[Dict[str, Any]] = None
    comparables: Optional[ComparableMarketData] = None
    seasonal_adjustment: Optional[SeasonalAdjustmentInfo] = Field(None, alias="seasonalAdjustment")
    valuation_source: str = Field("market_calibrated_hedonic", alias="valuationSource")
