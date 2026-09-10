# ENGIDA System Overview

## Project Description

ENGIDA is a production-oriented house rental and house selling marketplace designed specifically for Ethiopia. The platform connects property seekers with property vendors, facilitating transparent and efficient real estate transactions.

## Architecture

ENGIDA follows a modern, scalable monorepo architecture with three main services:

### 1. Frontend (Next.js)
- **Framework**: Next.js 16 with React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Purpose**: User-facing web application
- **Port**: 3001 (development)

### 2. Backend (NestJS)
- **Framework**: NestJS 11
- **Language**: TypeScript
- **Purpose**: Business logic, API, database operations
- **Port**: 3000 (development)

### 3. AI Service (FastAPI)
- **Framework**: FastAPI
- **Language**: Python 3.11+
- **Purpose**: AI/ML intelligence (recommendations, predictions, analysis)
- **Port**: 8000 (development)

## Technology Stack

### Frontend
- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4
- ESLint

### Backend
- NestJS 11
- TypeScript 5
- Prisma (planned for database)
- Jest (testing)
- ESLint + Prettier

### AI Service
- FastAPI
- Python 3.11+
- Pydantic (validation)
- pytest (testing)

### Infrastructure
- Docker & Docker Compose
- Git version control

## Project Structure

```
Engida/
├── frontend/          # Next.js web application
├── backend/           # NestJS API server
├── ai-service/        # Python FastAPI AI service
├── docs/              # Documentation
│   ├── architecture/  # Architecture docs
│   └── ai/           # AI-specific docs
├── docker-compose.yml # Local development
└── README.md         # Project overview
```

## Key Features (Planned)

### For Property Seekers
- Browse rental and sale listings
- Advanced search with AI-powered recommendations
- Save favorites
- Contact property owners
- View detailed property information

### For Property Vendors
- List properties for rent or sale
- AI-powered price suggestions
- Manage listings
- Communicate with potential buyers/renters
- Analytics dashboard

### For Administrators
- Platform management
- User verification
- Content moderation
- Analytics and reporting

### AI Capabilities
- Personalized property recommendations
- Intelligent price prediction
- Fraud detection
- Image quality analysis
- Natural language search
- Market insights

## Development Setup

See individual README files in each service directory for detailed setup instructions:
- `frontend/README.md`
- `backend/README.md`
- `ai-service/README.md`

## Documentation

- [AI Architecture](../ai/AI-ARCHITECTURE.md)
- [System Overview](./SYSTEM-OVERVIEW.md)

## Status

**Current Phase**: Foundation and Architecture Setup

The project structure has been established with professional, scalable foundations. Core business features are ready to be implemented in subsequent phases.
