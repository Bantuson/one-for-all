# One For All - Multi-Tenant Admissions Platform

AI-powered admissions management system supporting universities, NSFAS, private colleges, and bursary providers across South Africa.

## 🏗️ Monorepo Structure

```
one-for-all/
├── apps/
│   ├── backend/           # Python CrewAI backend
│   │   ├── src/           # CrewAI agents & tools
│   │   ├── supabase/      # Database migrations
│   │   └── docs/          # Architecture documentation
│   └── dashboard/         # Next.js frontend
│       ├── app/           # App Router pages
│       └── components/    # React components
├── packages/              # Shared code (future)
│   └── types/             # Shared TypeScript types
└── docs/                  # Project-wide documentation
```

## 🚀 Quick Start

### Prerequisites

- **Backend**: Python 3.12+, Supabase account
- **Frontend**: Node.js 18+, pnpm 8+

### Installation

```bash
# Install root dependencies
pnpm install

# Backend setup
cd apps/backend
python -m venv .venv
source .venv/bin/activate  # or `.venv\Scripts\activate` on Windows
pip install -e .

# Frontend setup
cd apps/dashboard
pnpm install
pnpm dev
```

## 📦 Applications

### Backend (Python + CrewAI)

Multi-agent system with 5 specialized agents:
- `identity_auth_agent` - OTP verification & session management
- `application_intake_agent` - Data collection with validation
- `rag_specialist_agent` - Vector-based university information retrieval
- `submission_agent` - Multi-university application submission
- `nsfas_agent` - NSFAS funding application automation

**Tech Stack**:
- CrewAI (agent orchestration)
- Supabase (PostgreSQL + pgvector)
- OpenAI GPT-4 (LLM)
- SendGrid (email OTP)
- Twilio (SMS OTP)

[Backend Documentation →](apps/backend/README.md)

### Dashboard (Next.js + TypeScript)

Modern web interface with:
- Landing page with light/dark mode
- Applicant portal
- Institution admin dashboard
- React Flow-based application sandbox
- Realtime updates via Supabase

**Tech Stack**:
- Next.js 15 (App Router)
- TypeScript 5.3
- Tailwind CSS 3.4
- Supabase Realtime
- Zustand (state management)
- React Flow (visual sandbox)

[Frontend Documentation →](apps/dashboard/README.md)

## 🎯 Key Features

### Multi-Tenant Architecture

**Institution Types Supported**:
- Universities (UCT, Wits, UP, TUT, DUT, SU, UNISA, VUT, UL, Rhodes)
- Government Agencies (NSFAS)
- Private Colleges
- Bursary Providers

**Tenant Isolation**:
- Row-Level Security (RLS) with JWT claims
- Institution-scoped data access
- Customizable agent prompts per institution
- Separate evaluation criteria

### AI-Powered Evaluation

Agents dynamically load institution-specific:
- Evaluation criteria (APS, subject requirements)
- Admission policies (citizenship, age restrictions)
- Custom decision frameworks
- Prompt templates with variables

### Realtime Collaboration

- Live application status updates
- Multi-reviewer support
- Optimistic UI updates
- WebSocket-based sync

## 📚 Documentation

### Architecture

- [Complete Architecture Overview](apps/backend/docs/architecture.md)
- [Frontend Architecture](apps/backend/docs/frontend-architecture.md)
- [Unified Schema Design](apps/backend/docs/unified-schema-design.md)
- [RLS Policy Specification](apps/backend/docs/rls-policy-specification.md)
- [JWT Claims Design](apps/backend/docs/jwt-claims-design.md)

### Development

- [Dynamic Agent Loader](apps/backend/docs/dynamic-agent-loader-spec.md)
- [Agent Testing Strategy](apps/backend/docs/agent-testing-strategy.md)
- [Evaluation Criteria Schema](apps/backend/docs/evaluation-criteria-schema.md)
- [Prompt Template Security](apps/backend/docs/prompt-template-security.md)
- [Security Test Plan](apps/backend/docs/security-test-plan.md)

### Migration

- [Migration Roadmap](apps/backend/docs/migration-roadmap.md)
- [Schema Comparison](apps/backend/docs/schema-comparison.md)
- [Integration Patterns](apps/backend/docs/integration-patterns.md)

## 🔧 Development Workflow

### Running Both Apps

```bash
# Terminal 1: Backend
cd apps/backend
source .venv/bin/activate
python src/one_for_all/main.py

# Terminal 2: Frontend
cd apps/dashboard
pnpm dev
```

### Using Turbo (Recommended)

```bash
# Run all apps in parallel
pnpm dev

# Build all apps
pnpm build

# Lint all apps
pnpm lint
```

## 🗄️ Database Setup

### Supabase Project

1. Create Supabase project at [supabase.com](https://supabase.com)
2. Enable pgvector extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Run migrations:
   ```bash
   cd apps/backend/supabase
   supabase db push
   ```

### Schema Status

⚠️ **Important**: Two schema versions exist:

1. **Initial Schema** (`20240522000000_initial_schema.sql`) - Multi-tenant design (NOT YET APPLIED)
2. **Active Migrations** - Single-tenant schema (CURRENTLY IN USE)

**Next Step**: Implement unified schema from `docs/unified-schema-design.md`

## 🧪 Testing

```bash
# Backend tests
cd apps/backend
pytest

# Frontend tests
cd apps/dashboard
pnpm test

# E2E tests (future)
pnpm test:e2e
```

## 🚢 Deployment

### Frontend (Vercel)

```bash
cd apps/dashboard
vercel --prod
```

### Backend (Docker + Railway/Render)

```bash
cd apps/backend
docker build -t one-for-all-backend .
docker push your-registry/one-for-all-backend
```

## 🤝 Contributing

1. **Code Style**: Follow ESLint/Prettier/Black configs
2. **Commits**: Use conventional commits
3. **Documentation**: Update relevant docs
4. **Tests**: Add tests for new features

## 📄 License

© 2025 One For All. All rights reserved.

## 🔗 Links

- [Supabase Dashboard](https://supabase.com/dashboard)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [CrewAI Documentation](https://docs.crewai.com)
- [Next.js Documentation](https://nextjs.org/docs)
