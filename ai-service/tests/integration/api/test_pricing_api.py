"""Integration tests for FastAPI pricing endpoint."""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_predict_endpoint_rental_success():
    """Test POST /api/v1/pricing/predict with valid rental payload."""
    payload = {
        "city": "Addis Ababa",
        "subCity": "Bole",
        "neighborhood": "Rwanda",
        "propertyType": "APARTMENT",
        "listingType": "RENTAL",
        "bedrooms": 2,
        "bathrooms": 2,
        "maxGuests": 4,
        "areaSqm": 95,
        "amenities": ["Automatic Standby Generator", "High-Speed Fiber Internet"],
        "regenerationIndex": 0,
    }

    response = client.post("/api/v1/pricing/predict", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert "predictedPrice" in data or "predicted_price" in data
    price = data.get("predictedPrice") or data.get("predicted_price")
    assert price > 2000
    assert data["currency"] == "ETB"
    assert "tiers" in data
    assert "fastBooking" in data["tiers"]
    assert "optimal" in data["tiers"]
    assert "peakSeason" in data["tiers"]
    assert "breakdown" in data
    assert "keyDrivers" in data["breakdown"]
    assert len(data["breakdown"]["keyDrivers"]) > 0


def test_predict_endpoint_sale_success():
    """Test POST /api/v1/pricing/predict with valid sale payload."""
    payload = {
        "city": "Addis Ababa",
        "subCity": "Kirkos",
        "neighborhood": "Kazanchis",
        "propertyType": "PENTHOUSE",
        "listingType": "SALE",
        "bedrooms": 3,
        "bathrooms": 3,
        "maxGuests": 6,
        "areaSqm": 220,
        "amenities": ["24/7 Gated Security & Guard", "Dedicated Secure Parking", "Standby Generator"],
    }

    response = client.post("/api/v1/pricing/predict", json=payload)
    assert response.status_code == 200

    data = response.json()
    price = data.get("predictedPrice") or data.get("predicted_price")
    assert price >= 5_000_000
    assert data["tiers"]["optimal"]["label"] == "Optimal Market"
    assert data["tiers"]["fastBooking"]["label"] == "Fast Liquidity"


def test_predict_endpoint_validation_error():
    """Test POST /api/v1/pricing/predict with missing required fields."""
    response = client.post("/api/v1/pricing/predict", json={"bedrooms": 2})
    assert response.status_code == 422  # Unprocessable Entity

