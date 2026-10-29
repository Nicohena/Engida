"""Unit tests for deterministic hedonic pricing engine with comparable blending."""
import pytest
from app.schemas.pricing import PricingRequest, PricingResponse, ComparableMarketData
from app.pricing.predictor import PricePredictor


@pytest.fixture
def predictor():
    return PricePredictor()


def test_rental_prediction_bole_with_generator(predictor):
    """Test nightly rental calculation for an apartment in Bole with backup generator."""
    request = PricingRequest(
        city="Addis Ababa",
        subCity="Bole",
        neighborhood="Atlas",
        propertyType="APARTMENT",
        listingType="RENTAL",
        bedrooms=2,
        bathrooms=2,
        maxGuests=4,
        areaSqm=110.0,
        amenities=["Automatic Standby Generator", "High-Speed Fiber Internet", "Water Reservoir"],
    )

    response = predictor.predict_property(request)

    assert isinstance(response, PricingResponse)
    assert response.currency == "ETB"
    assert response.predicted_price > 2500
    assert response.price_range.min < response.predicted_price < response.price_range.max
    assert response.confidence >= 0.70
    assert response.tiers is not None
    assert response.tiers.fast_booking.rate < response.tiers.optimal.rate < response.tiers.peak_season.rate
    assert "Bole Diplomatic" in response.breakdown.location_tier
    assert response.breakdown.location_multiplier == 1.45
    assert response.breakdown.property_type_multiplier == 1.10
    assert response.valuation_source == "market_calibrated_hedonic"


def test_sale_prediction_villa_kazanchis(predictor):
    """Test sale valuation for a villa in Kazanchis."""
    request = PricingRequest(
        city="Addis Ababa",
        subCity="Kirkos",
        neighborhood="Kazanchis",
        propertyType="VILLA",
        listingType="SALE",
        bedrooms=4,
        bathrooms=3,
        maxGuests=6,
        areaSqm=300.0,
        amenities=["Standby Generator", "24/7 Gated Security", "Dedicated Parking", "Landscaped Garden"],
    )

    response = predictor.predict_property(request)

    assert isinstance(response, PricingResponse)
    assert response.currency == "ETB"
    assert response.predicted_price >= 10_000_000
    assert response.price_range.min < response.predicted_price < response.price_range.max
    assert response.tiers.fast_booking.label == "Fast Liquidity"
    assert response.tiers.optimal.label == "Optimal Market"
    assert response.tiers.peak_season.label == "Premium Target"
    assert response.breakdown.property_type_multiplier == 1.40


def test_blending_with_sufficient_rental_comparables(predictor):
    """Test that sufficient comparables (4 listings, weight 0.3) blend with baseline."""
    # Base prediction without comparables
    base_request = PricingRequest(
        city="Addis Ababa",
        subCity="Bole",
        propertyType="APARTMENT",
        listingType="RENTAL",
        bedrooms=2,
        bathrooms=2,
        maxGuests=4,
    )
    base_res = predictor.predict_property(base_request)

    # Now add 5 active competitor listings with median 6,500 ETB
    comp_data = ComparableMarketData(
        sampleCount=5,
        medianPrice=6500.0,
        minPrice=5800.0,
        maxPrice=7200.0,
        averagePrice=6500.0,
        evidenceType="active_asking_prices",
        blendingWeight=0.30,
    )
    blended_request = PricingRequest(
        city="Addis Ababa",
        subCity="Bole",
        propertyType="APARTMENT",
        listingType="RENTAL",
        bedrooms=2,
        bathrooms=2,
        maxGuests=4,
        comparables=comp_data,
    )
    blended_res = predictor.predict_property(blended_request)

    assert blended_res.valuation_source == "blended_active_asking_prices"
    assert blended_res.comparables is not None
    assert blended_res.comparables.sample_count == 5
    # Blended price should move toward comparable median (6,500 ETB)
    assert blended_res.predicted_price != base_res.predicted_price
    # Check that a market comparables driver is present
    comp_driver = next((d for d in blended_res.breakdown.key_drivers if "Market Comparables" in d.factor), None)
    assert comp_driver is not None
    assert "Blended 30%" in comp_driver.impact


def test_insufficient_comparables_retains_baseline(predictor):
    """Test that insufficient comparables (2 listings, weight 0.0) retains baseline 100%."""
    comp_data = ComparableMarketData(
        sampleCount=2,
        medianPrice=9000.0,
        minPrice=8500.0,
        maxPrice=9500.0,
        averagePrice=9000.0,
        evidenceType="active_asking_prices",
        blendingWeight=0.0,
    )
    req = PricingRequest(
        city="Addis Ababa",
        subCity="Bole",
        propertyType="APARTMENT",
        listingType="RENTAL",
        bedrooms=2,
        bathrooms=2,
        maxGuests=4,
        comparables=comp_data,
    )
    res = predictor.predict_property(req)

    # Baseline retained
    assert res.valuation_source == "market_calibrated_hedonic"
    comp_driver = next((d for d in res.breakdown.key_drivers if "Market Comparables" in d.factor), None)
    assert comp_driver is not None
    assert "insufficient sample" in comp_driver.impact


def test_blending_with_sale_comparables(predictor):
    """Test that sale listing blends with active asking prices when >= 3 samples exist."""
    comp_data = ComparableMarketData(
        sampleCount=8,
        medianPrice=35_000_000.0,
        minPrice=28_000_000.0,
        maxPrice=45_000_000.0,
        averagePrice=36_000_000.0,
        pricePerSqmMedian=130000.0,
        evidenceType="active_asking_prices",
        blendingWeight=0.50,
    )
    req = PricingRequest(
        city="Addis Ababa",
        subCity="Bole",
        propertyType="APARTMENT",
        listingType="SALE",
        bedrooms=3,
        bathrooms=2,
        areaSqm=180.0,
        comparables=comp_data,
    )
    res = predictor.predict_property(req)

    assert res.valuation_source == "blended_active_asking_prices"
    assert res.tiers.optimal.label == "Optimal Market"
    assert "Blended market rate" in res.tiers.optimal.rationale
    assert "active competitor asking prices" in res.tiers.optimal.rationale


def test_pricing_with_quality_scores_and_seasonal_adjustment_applied(predictor):
    """Test seasonal ADR adjustment when booking history justifies it."""
    from app.schemas.pricing import SeasonalAdjustmentInfo

    comp_data = ComparableMarketData(
        sampleCount=5,
        medianPrice=6500.0,
        minPrice=5500.0,
        maxPrice=7800.0,
        averagePrice=6600.0,
        blendingWeight=0.30,
        averageQualityScore=0.82,
    )
    seasonal_info = SeasonalAdjustmentInfo(
        applied=True,
        seasonalMultiplier=1.15,
        seasonName="Meskel / Timkat Peak",
        status="evidence_calibrated",
        reason="Verified 15% rate lift across 42 historical bookings",
        historicalBookingCount=42,
        minimumRequiredCount=30,
    )

    req = PricingRequest(
        city="Addis Ababa",
        subCity="Bole",
        neighborhood="Atlas",
        propertyType="APARTMENT",
        listingType="RENTAL",
        bedrooms=2,
        bathrooms=1,
        maxGuests=3,
        comparables=comp_data,
        seasonalAdjustment=seasonal_info,
    )

    res = predictor.predict_property(req)

    assert res.currency == "ETB"
    assert res.seasonal_adjustment is not None
    assert res.seasonal_adjustment.applied is True
    assert res.seasonal_adjustment.seasonal_multiplier == 1.15
    season_driver = next((d for d in res.breakdown.key_drivers if "Seasonal Market Demand" in d.factor), None)
    assert season_driver is not None
    assert "+15% ADR shift" in season_driver.impact


def test_sale_pricing_ignores_seasonal_adjustment(predictor):
    """Test that real estate capital sales are strictly non-seasonal."""
    from app.schemas.pricing import SeasonalAdjustmentInfo

    seasonal_info = SeasonalAdjustmentInfo(
        applied=True,
        seasonalMultiplier=1.20,
        seasonName="Meskel Peak",
        status="evidence_calibrated",
        reason="Erroneous seasonal input for sale",
        historicalBookingCount=50,
        minimumRequiredCount=30,
    )

    req_without_season = PricingRequest(
        city="Addis Ababa",
        subCity="Kirkos",
        neighborhood="Kazanchis",
        propertyType="VILLA",
        listingType="SALE",
        bedrooms=3,
        bathrooms=2,
        areaSqm=200.0,
    )
    res_base = predictor.predict_property(req_without_season)

    req_with_season = PricingRequest(
        city="Addis Ababa",
        subCity="Kirkos",
        neighborhood="Kazanchis",
        propertyType="VILLA",
        listingType="SALE",
        bedrooms=3,
        bathrooms=2,
        areaSqm=200.0,
        seasonalAdjustment=seasonal_info,
    )
    res_season = predictor.predict_property(req_with_season)

    # Sale price must be identical - sales are not subject to nightly tourist seasonality
    assert res_season.predicted_price == res_base.predicted_price


def test_insufficient_seasonal_data_retains_standard_rate(predictor):
    """Test that insufficient booking history transparently retains neutral baseline rate."""
    from app.schemas.pricing import SeasonalAdjustmentInfo

    seasonal_info = SeasonalAdjustmentInfo(
        applied=False,
        seasonalMultiplier=1.0,
        seasonName="Standard Rate",
        status="insufficient_historical_data",
        reason="Insufficient booking evidence (1/30 required)",
        historicalBookingCount=1,
        minimumRequiredCount=30,
    )

    req = PricingRequest(
        city="Hawassa",
        propertyType="APARTMENT",
        listingType="RENTAL",
        bedrooms=1,
        bathrooms=1,
        maxGuests=2,
        seasonalAdjustment=seasonal_info,
    )
    res = predictor.predict_property(req)

    assert res.seasonal_adjustment is not None
    assert res.seasonal_adjustment.applied is False
    assert res.seasonal_adjustment.seasonal_multiplier == 1.0
    season_driver = next((d for d in res.breakdown.key_drivers if "Seasonal Market Demand" in d.factor), None)
    assert season_driver is None  # No seasonal driver added when neutral
