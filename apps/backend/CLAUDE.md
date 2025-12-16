# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**One For All** is a CrewAI-powered multi-agent system for automating South African university and NSFAS (National Student Financial Aid Scheme) applications. The system provides:
- OTP-based user authentication with 24-hour sessions
- Multi-university application support (UCT, Wits, UP, TUT, DUT, SU, UNISA, VUT, UL, Rhodes)
- NSFAS funding application automation
- RAG-based university/course information retrieval with vector embeddings
- Long-term memory for returning applicants

## CRITICAL: Environment Variable Security Rules

**MANDATORY RULES - NEVER VIOLATE THESE:**

1. **ONLY USE ROOT `.env.local`**
   - All environment variables MUST be loaded from `/home/mzansi_agentive/projects/portfolio/.env.local` (monorepo root)
   - This backend loads env vars via `scanner_crew.py` using: `load_dotenv(dotenv_path=Path(__file__).resolve().parents[4] / '.env.local')`
   - NEVER create `apps/backend/.env` or any other .env files
   - NEVER read from or reference `apps/backend/.env`

2. **NEVER EXPOSE API KEYS**
   - NEVER read API key values from environment files
   - NEVER print, log, or display API key values
   - NEVER include API keys in code, comments, or documentation
   - Only reference environment variable names (e.g., `DEEPSEEK_API_KEY`), never their values

3. **NEVER CREATE NEW .env FILES**
   - Do NOT create .env files in any subdirectory
   - Do NOT suggest creating .env files
   - If env vars are needed, update the ROOT `.env.local` only
   - Reference `.env.example` files for documentation only

4. **ENVIRONMENT VARIABLE LOADING**
   - Backend Python: Uses root `.env.local` via scanner_crew.py (already configured)
   - Dashboard Next.js: Uses root `.env.local` via next.config.js (already configured)
   - Both systems are already configured - DO NOT modify dotenv loading

**If you need to add environment variables:**
- Update root `.env.local` (NOT tracked in git)
- Update root `.env.example` with placeholder values
- Update `apps/backend/.env.example` with documentation

## Development Setup

### Environment Requirements
- Python 3.12+
- Virtual environment (`.venv/`)
- Supabase account with PostgreSQL + pgvector extension

### Environment Variables

**Location:** All environment variables are in the monorepo root `.env.local` file at `/home/mzansi_agentive/projects/portfolio/.env.local`

**Required variables:**
- `DEEPSEEK_API_KEY` - DeepSeek LLM for scanner crew agents
- `SUPABASE_URL`, `SUPABASE_KEY` - Database and vector store
- `SENDGRID_API_KEY` - Email OTP delivery
- `TWILIO_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_NUMBER` - SMS OTP delivery
- `BACKEND_URL` - Application submission backend API
- `PHOENIX_AUTO_START` - Optional: Auto-start Phoenix observability UI

**IMPORTANT:** See `.env.example` in the root directory for all available configuration options. Backend automatically loads from root `.env.local` - no local .env file needed.

### Running the Application

```bash
# Navigate to project directory
cd one_for_all

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
pip install -e .

# Run the crew
python -m one_for_all.main
# or
python src/one_for_all/main.py
```

## Architecture

### CrewAI Framework Structure

The system uses **declarative YAML-based agent/task configuration** with sequential execution:

1. **Agent Definitions** (`src/one_for_all/config/agents.yaml`):
   - `identity_auth_agent` - OTP verification, session management
   - `application_intake_agent` - Personal/academic data collection
   - `rag_specialist_agent` - Vector-first university information retrieval
   - `submission_agent` - Multi-university application submission
   - `nsfas_agent` - NSFAS-specific funding application

2. **Task Definitions** (`src/one_for_all/config/tasks.yaml`):
   - 13 sequential tasks from account creation → NSFAS status check
   - Each task specifies description, expected_output, and assigned agent

3. **Crew Orchestration** (`src/one_for_all/crew.py`):
   - `OneForAllCrew` class loads YAML configs and builds `Crew` object
   - Uses `Process.sequential` execution
   - Agents have access to 19+ custom Supabase/SendGrid/Twilio tools

### Database Architecture (Supabase PostgreSQL)

**Tables:**
- `user_accounts` → `user_sessions` (1:N) - Authentication with TTL
- `applications` → `application_documents` (1:N) - Multi-university submissions
- `nsfas_applications` → `nsfas_documents` (1:N) - NSFAS funding applications
- `rag_embeddings` - pgvector (1536 dimensions) for university course data

**Key Functions:**
- `match_rag_embeddings(query_embedding, match_count)` - Vector similarity search RPC

**Migrations:** Located in `supabase/migrations/*.sql`

### Custom CrewAI Tools Pattern

All tools follow this structure:
```python
from crewai_tools import tool
from .supabase_client import supabase
import asyncio

@tool
def tool_name(param: str) -> str:
    """Tool description for agent."""
    async def async_logic():
        result = await supabase.table("table").insert({...})
        return str(result.data)
    return asyncio.run(async_logic())
```

**Tool Categories:**
- **Supabase Storage Tools**: `supabase_user_store`, `supabase_application_store`, `supabase_nsfas_store`, etc.
- **Supabase Lookup Tools**: `supabase_user_lookup`, `supabase_session_lookup`
- **Session Tools**: `supabase_session_create`, `supabase_session_extend`
- **OTP Tools**: `sendgrid_otp_sender`, `sms_otp_sender`
- **RAG Tools**: `supabase_rag_store`, `supabase_rag_query`, `website_search_tool`
- **Submission Tools**: `application_submission_tool`, `nsfas_application_submission_tool`
- **Status Tools**: `application_status_tool`, `nsfas_status_tool`

### RAG Workflow (Hybrid Vector-First Search)

1. Agent queries `supabase_rag_query` with embedded user question
2. If vector store has matching university data → return immediately
3. If NO_MATCH → agent uses `website_search_tool` to scrape university website
4. Agent stores new data via `supabase_rag_store` (embeds and inserts into pgvector)
5. Agent returns synthesized answer with citations

### Multi-University Application Flow

The system supports applying to **multiple universities in one session**:
1. User selects 1+ universities in `program_selection_task`
2. RAG agent retrieves requirements for ALL selected universities
3. Submission agent generates separate payloads and submits to each university's API
4. Returns array of `{university, application_id, status}` objects

## Key Design Patterns

### 1. YAML-Driven Agent Configuration
- Agents and tasks are **not hardcoded in Python**
- All agent roles, goals, backstories, and tool assignments live in YAML
- Python code only loads YAML and instantiates `Agent`/`Task` objects

### 2. Long-Term Memory & Session Management
- `identity_auth_agent` has `memory: true` to recognize returning users
- Sessions have 24-hour TTL with `expires_at` timestamp
- `supabase_session_lookup` checks validity before proceeding

### 3. Data Reuse Between Flows
- NSFAS agent **reuses** personal/academic data from university application
- Only collects NSFAS-specific fields (guardian info, income proof, bank details)
- Reduces user burden and ensures data consistency

### 4. Async Supabase Client Pattern
All Supabase tools use:
```python
from .supabase_client import supabase  # Pre-configured AsyncClient
```
The client is shared across all tools via `src/one_for_all/tools/supabase_client.py`.

## Multi-Tenant Architecture Vision

### Current State
The codebase currently operates as a **single-tenant system** with YAML-based agent configurations. There are **two competing database schemas**:
1. `supabase/migrations/20240522000000_initial_schema.sql` - Multi-tenant design (NOT IMPLEMENTED)
2. Active migrations - Single-tenant schema (CURRENTLY IN USE)

### Target Architecture
The project is evolving toward a **multi-tenant, institution-agnostic admissions platform** supporting:
- **Universities** (UCT, Wits, UP, TUT, DUT, SU, UNISA, VUT, UL, Rhodes)
- **NSFAS** (National Student Financial Aid Scheme)
- **Private Colleges**
- **Bursary Providers**

### Key Architectural Goals

1. **Institution-Agnostic Data Models**
   - Single schema supports all institution types
   - Tenant isolation via Row-Level Security (RLS)
   - JWT-based institution scoping

2. **Dynamic Agent Customization**
   - Agent prompts stored in database per institution
   - Evaluation criteria loaded at runtime (not hardcoded)
   - Tool firewall with tenant context validation

3. **Multi-Tenant Hierarchy**
   ```
   Institution (Tenant Root)
     ├─ Campuses
     │   └─ Faculties
     │       └─ Courses
     │           ├─ Evaluation Criteria
     │           └─ Applications
     └─ Agent Configurations (custom prompts)
   ```

4. **Agentic Evaluation Pipeline**
   - Data Intake Agent → Criteria Analyzer → Ranking → Decision → Reviewer Assistant
   - Each agent loads institution-specific prompts from DB
   - Decisions tracked in `agent_decisions` table

5. **Dashboard & Realtime**
   - Next.js 15 + Supabase Realtime
   - Role-based views (Applicant, Reviewer, Admin, Super Admin)
   - React Flow sandbox for visual workflow manipulation
   - Phoenix/Arize observability for agent decision tracing

### Detailed Documentation

For comprehensive architectural details, see:
- **`docs/architecture.md`** - Complete multi-tenant system design, database schema, RLS policies
- **`docs/frontend-architecture.md`** - Next.js dashboard structure, realtime updates, React Flow sandbox
- **`docs/agent-customization-guide.md`** - Dynamic agent loading, prompt templates, evaluation criteria
- **`docs/integration-patterns.md`** - SIS integration, NSFAS API, webhooks, payment providers
- **`docs/migration-roadmap.md`** - 12-week migration plan from single to multi-tenant

### Critical Schema Issue

**IMPORTANT**: The codebase has two database schemas that must be reconciled:
- `initial_schema.sql` contains the multi-tenant design but was never implemented
- Current migrations use a simplified single-tenant schema

**Before making database changes**, review `docs/architecture.md` Section 2 for the complete schema harmonization plan.

## Important Notes

### Supabase Schema Changes
If modifying database schema:
1. Add migration to `supabase/migrations/`
2. Update `supabase/ERD.md` diagram
3. Ensure RLS policies align with tenant isolation requirements (for future multi-tenant)

### Adding New Agents/Tasks
1. Define in `config/agents.yaml` and `config/tasks.yaml`
2. Assign tools (list tool function names in YAML)
3. Add task to `crew.py` ordered_tasks list
4. Tools must be imported in `src/one_for_all/tools/__init__.py` if not auto-discovered

### Tool Development Rules
- All tools inherit from `crewai_tools.tool` decorator
- Use `asyncio.run()` wrapper for async Supabase operations
- Return string representations (agents expect text output)
- Tool descriptions are critical - agents use them for decision-making

### Testing OTP Flow
Since OTP requires external services:
- Use test phone numbers/emails from Twilio/SendGrid sandboxes
- Check Supabase `user_sessions` table for generated tokens
- Verify `expires_at` timestamp is set to 24 hours from creation
