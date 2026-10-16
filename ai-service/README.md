# ENGIDA AI Service

AI/ML Intelligence Service for the ENGIDA Ethiopian Property Marketplace.

## Overview

This service provides all AI/ML/NLP capabilities for the ENGIDA platform:

- **Property Recommendations**: Personalized property suggestions
- **Price Prediction**: Intelligent pricing analysis
- **Fraud Detection**: Suspicious listing identification
- **Image Analysis**: Property image classification and quality assessment
- **Search Intelligence**: Natural language search and semantic matching
- **Market Analysis**: Trends and insights

## Architecture

The AI service is designed as a standalone microservice that:
- Communicates with the NestJS backend via HTTP/REST
- Remains provider-agnostic (can use any LLM/ML provider)
- Handles all AI/ML computation independently
- Returns predictions/recommendations to the backend
- Never makes business logic decisions (backend's responsibility)

## Technology Stack

- **Framework**: FastAPI (Python 3.11+)
- **API**: RESTful endpoints
- **Validation**: Pydantic schemas
- **Testing**: pytest
- **Container**: Docker

## Project Structure

```
ai-service/
├── app/
│   ├── main.py              # FastAPI application
│   ├── api/                 # API endpoints
│   ├── core/                # Configuration
│   ├── schemas/             # Pydantic models
│   └── services/            # Business logic
├── tests/                   # Test suite
├── data/                    # Training data and datasets
├── requirements.txt         # Python dependencies
├── Dockerfile              # Container definition
└── README.md
```

## Setup

### Prerequisites

- Python 3.11+
- pip

### Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Running Locally

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The service will be available at `http://localhost:8000`

### API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app tests/

# Run specific test file
pytest tests/test_health.py
```

## Docker

```bash
# Build image
docker build -t engida-ai-service .

# Run container
docker run -p 8000:8000 engida-ai-service
```

## Environment Variables

Create a `.env` file in the root directory:

```env
DEBUG=false
HOST=0.0.0.0
PORT=8000
ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:3001"]
```

## Development Roadmap

### Phase 1: Foundation (Current)
- [x] Project structure
- [x] FastAPI setup
- [x] Health endpoints
- [x] Configuration management
- [x] Testing framework

### Phase 2: Core AI Features
- [ ] Property recommendation engine
- [ ] Price prediction model
- [ ] Fraud detection system

### Phase 3: Advanced Features
- [ ] Image analysis
- [ ] NLP search
- [ ] Market analytics

### Phase 4: LLM Integration
- [ ] Provider-agnostic LLM gateway
- [ ] Prompt engineering
- [ ] Response caching

## API Examples

### Health Check
```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00",
  "service": "ai-service"
}
```

## Contributing

This service follows Python best practices:
- Type hints for all functions
- Docstrings for modules and functions
- Black for code formatting
- pytest for testing
- Keep business logic separate from API layer

## License

Private - ENGIDA Project
