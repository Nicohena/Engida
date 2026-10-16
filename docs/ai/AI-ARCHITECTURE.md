# ENGIDA AI Architecture

## Overview

This document defines the AI architecture and boundaries for the ENGIDA Ethiopian Property Marketplace platform.

## System Architecture

```
┌─────────────────┐
│   Frontend      │
│   (Next.js)     │
└────────┬────────┘
         │
         │ HTTP/REST
         │
┌────────▼────────┐
│  NestJS Backend │
│  (Business)     │
└────────┬────────┘
         │
         │ HTTP/REST
         │
┌────────▼────────┐
│  AI Gateway     │
│  (NestJS AI)    │
└────────┬────────┘
         │
         │ HTTP/REST
         │
┌────────▼────────┐
│  AI Service     │
│  (FastAPI)      │
└────────┬────────┘
         │
         ├──► LLM Providers
         ├──► ML Models
         ├──► Embeddings
         └──► Analytics
```

## Architectural Boundaries

### Frontend (Next.js)
**Responsibilities:**
- User interface and interactions
- Client-side state management
- API consumption from backend
- User authentication flows

**Constraints:**
- NEVER call external LLM providers directly
- NEVER implement AI/ML logic
- Always route AI requests through backend

### Backend (NestJS)
**Responsibilities:**
- Business logic and rules
- User authentication and authorization
- Database operations
- Property/listing management
- Transaction processing
- Data validation
- API gateway to AI service

**Constraints:**
- Does NOT contain ML models or AI algorithms
- Does NOT integrate with LLM providers directly
- Validates AI service responses before using them
- Makes final business decisions based on AI recommendations

### AI Gateway Module (NestJS)
**Responsibilities:**
- HTTP client to AI service
- Request/response transformation
- Error handling and fallbacks
- Response caching
- Rate limiting for AI calls

**Location:** `backend/src/modules/ai/`

### AI Service (FastAPI)
**Responsibilities:**
- All AI/ML/NLP intelligence
- LLM provider integrations
- Model training and inference
- Embedding generation
- Recommendation algorithms
- Price prediction models
- Fraud detection
- Image analysis
- Natural language processing

**Location:** `ai-service/`

## Data Flow Examples

### Property Recommendation Flow
```
1. User requests recommendations → Frontend
2. Frontend → Backend API (/api/recommendations)
3. Backend validates user, fetches context
4. Backend → AI Gateway → AI Service
5. AI Service generates recommendations
6. AI Service → Backend (recommendation results)
7. Backend applies business rules, authorization
8. Backend → Frontend (filtered recommendations)
```

### Price Prediction Flow
```
1. User inputs property details → Frontend
2. Frontend → Backend API (/api/properties/predict-price)
3. Backend validates input, enriches data
4. Backend → AI Service (/ai/predict/price)
5. AI Service runs ML model
6. AI Service → Backend (price prediction)
7. Backend stores prediction, applies adjustments
8. Backend → Frontend (final price estimate)
```

## AI Service Provider Abstraction

The AI service should be provider-agnostic:

```python
# Good: Provider abstraction
class LLMProvider(ABC):
    @abstractmethod
    async def generate(self, prompt: str) -> str:
        pass

class OpenAIProvider(LLMProvider):
    async def generate(self, prompt: str) -> str:
        # OpenAI implementation
        
class AnthropicProvider(LLMProvider):
    async def generate(self, prompt: str) -> str:
        # Anthropic implementation
```

This allows switching providers without changing business logic.

## Security Considerations

1. **API Keys**: Only AI service stores LLM provider credentials
2. **Authentication**: Backend validates all requests before AI calls
3. **Authorization**: Backend enforces permissions, not AI service
4. **Data Privacy**: Sensitive user data sanitized before AI processing
5. **Rate Limiting**: AI gateway implements rate limits per user/tenant

## Future Considerations

### Scaling
- AI service can scale independently
- Can add multiple AI service instances
- Can add caching layer (Redis) for AI responses

### Microservices Evolution
Current: Single AI service handles all AI features
Future: Can split into specialized services if needed:
- Recommendation service
- Image analysis service
- NLP/search service
- Fraud detection service

**Decision**: Start monolithic, split only when necessary.

## Technology Choices

### Why FastAPI for AI Service?
- Python ecosystem for AI/ML
- Async support for external API calls
- Fast and lightweight
- Excellent type validation with Pydantic
- Auto-generated API docs

### Why NestJS Backend?
- TypeScript for type safety
- Enterprise-grade architecture
- Excellent testing support
- Strong TypeORM/Prisma integration
- Modular structure

### Why Separate AI Service?
- Language choice (Python vs TypeScript)
- Independent scaling
- Different deployment requirements
- Specialized dependencies (ML libraries)
- Team specialization

## AI Capabilities Roadmap

### Phase 1: Foundation
- [x] Service architecture
- [x] Health endpoints
- [x] Configuration management
- [ ] Basic LLM integration

### Phase 2: Core Features
- [ ] Property recommendations
- [ ] Price prediction
- [ ] Search intelligence

### Phase 3: Advanced Features
- [ ] Fraud detection
- [ ] Image analysis
- [ ] Market analytics

### Phase 4: Optimization
- [ ] Response caching
- [ ] Model fine-tuning
- [ ] Performance monitoring

## Monitoring & Observability

Each service should expose:
- Health endpoints (`/health`)
- Readiness checks (`/health/ready`)
- Liveness checks (`/health/live`)
- Metrics endpoints (future)

## Conclusion

This architecture provides:
- ✅ Clear separation of concerns
- ✅ Provider-agnostic AI layer
- ✅ Scalability path
- ✅ Security boundaries
- ✅ Testability
- ✅ Flexibility for future changes

The backend remains the source of truth for business logic and data, while the AI service provides intelligence and recommendations.
