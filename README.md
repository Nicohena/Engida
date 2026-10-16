# ENGIDA

**Ethiopian Property Marketplace** - A production-oriented house rental and selling platform for Ethiopia.

## Overview

ENGIDA connects property seekers with property vendors, facilitating transparent and efficient real estate transactions in Ethiopia. The platform leverages modern web technologies and AI-powered intelligence to provide personalized recommendations, accurate price predictions, and a seamless user experience.

## Project Structure

```
Engida/
├── frontend/          # Next.js web application (Port 3001)
├── backend/           # NestJS API server (Port 3000)
├── ai-service/        # Python FastAPI AI service (Port 8000)
├── docs/              # Project documentation
│   ├── architecture/  # Architecture documentation
│   └── ai/           # AI-specific documentation
├── docker-compose.yml # Local development orchestration
├── .env.example      # Environment variables template
└── README.md         # This file
```

## Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Library**: React 19

### Backend
- **Framework**: NestJS 11
- **Language**: TypeScript 5
- **Database**: PostgreSQL (via Prisma)
- **Testing**: Jest

### AI Service
- **Framework**: FastAPI
- **Language**: Python 3.11+
- **Validation**: Pydantic
- **Testing**: pytest

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- Python 3.11+
- Docker & Docker Compose (recommended)
- PostgreSQL (if not using Docker)

### Option 1: Docker Compose (Recommended)

The easiest way to run the entire stack locally:

```bash
# 1. Clone the repository
git clone <repository-url>
cd Engida

# 2. Copy environment variables
cp .env.example .env

# 3. Start all services
docker-compose up

# Services will be available at:
# - Frontend: http://localhost:3001
# - Backend API: http://localhost:3000
# - AI Service: http://localhost:8000
# - PostgreSQL: localhost:5432
```

### Option 2: Manual Setup

#### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
npm run start:dev
```

See [backend/README.md](./backend/README.md) for details.

#### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

See [frontend/README.md](./frontend/README.md) for details.

#### AI Service Setup
```bash
cd ai-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

See [ai-service/README.md](./ai-service/README.md) for details.

## Development

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests (when implemented)
cd frontend
npm test

# AI Service tests
cd ai-service
pytest
```

### Code Quality

```bash
# Backend linting
cd backend
npm run lint

# Frontend linting
cd frontend
npm run lint

# AI Service linting
cd ai-service
black app/ tests/
flake8 app/ tests/
```

## Documentation

- [System Overview](./docs/architecture/SYSTEM-OVERVIEW.md)
- [AI Architecture](./docs/ai/AI-ARCHITECTURE.md)
- [Backend Documentation](./backend/README.md)
- [Frontend Documentation](./frontend/README.md)
- [AI Service Documentation](./ai-service/README.md)

## Project Status

**Current Phase**: Foundation & Architecture Setup ✅

### Completed
- ✅ Monorepo structure established
- ✅ Backend (NestJS) scaffolded with modular architecture
- ✅ Frontend (Next.js) scaffolded with modern structure
- ✅ AI Service (FastAPI) foundation created
- ✅ Docker development environment configured
- ✅ Documentation structure established

### Next Steps
- [ ] Implement authentication & authorization
- [ ] Set up database schema with Prisma
- [ ] Implement property listing features
- [ ] Develop search functionality
- [ ] Integrate AI recommendations
- [ ] Build user interface components

## Architecture Highlights

### Service Communication
```
Frontend (Next.js) → Backend (NestJS) → AI Service (FastAPI)
                            ↓
                       Database (PostgreSQL)
```

### Key Principles
- **Separation of Concerns**: Each service has clear responsibilities
- **Type Safety**: TypeScript in frontend/backend, Pydantic in AI service
- **Scalability**: Services can scale independently
- **Security**: Authentication handled by backend, AI service isolated
- **Provider Agnostic**: AI service designed to support multiple LLM providers

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Database
DATABASE_URL=postgresql://engida:engida@localhost:5432/engida

# Backend
PORT=3000
JWT_SECRET=your-secret-key

# AI Service
AI_SERVICE_URL=http://localhost:8000

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Contributing

### Branching Strategy
- `main` - Production-ready code
- `develop` - Development branch
- `feature/*` - Feature branches
- `fix/*` - Bug fix branches

### Commit Convention
Follow conventional commits:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test additions/changes
- `chore:` - Maintenance tasks

## License

Private - ENGIDA Project

## Support

For questions or issues, please contact the development team.

---

**Built with ❤️ for Ethiopia**
