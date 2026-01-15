# Admissions Processing Roadmap

This document outlines the full implementation roadmap for the AI-powered admissions processing system, from document review to final decision notification.

---

## Overview

The admissions processing system uses CrewAI agents to automate and assist with:

- Document verification and validation
- APS (Admission Point Score) calculation
- Application ranking and selection
- Staff decision support
- Analytics and reporting
- Applicant notifications

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Dashboard UI                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Applications │  │ Agent Button │  │ Analytics Dashboard  │  │
│  │    Grid      │  │   + Modal    │  │    (Recharts)        │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js API Routes                          │
│  /api/institutions/[id]/agent-sessions                          │
│  /api/notifications/whatsapp                                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase (PostgreSQL)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ agent_       │  │ agent_       │  │ saved_               │  │
│  │ sessions     │  │ decisions    │  │ charts               │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                            │                                     │
│                   Supabase Realtime                              │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CrewAI Backend (Python)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Document     │  │ APS Ranking  │  │ Reviewer             │  │
│  │ Reviewer     │  │ Agent        │  │ Assistant            │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │ Analytics    │  │ Notification │                            │
│  │ Agent        │  │ Sender       │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 0: Bug Fixes & Foundation (COMPLETED)

**Status: DONE**

| Task                                   | Status | Files                                   |
| -------------------------------------- | ------ | --------------------------------------- |
| Fix notes persistence                  | Done   | `api/applications/[id]/notes/route.ts`  |
| Fix status updates                     | Done   | `api/applications/[id]/status/route.ts` |
| Add toast notifications                | Done   | `ApplicationDetailModal.tsx`            |
| WhatsApp notification endpoint         | Done   | `api/notifications/whatsapp/route.ts`   |
| Update `.env.example` with Twilio vars | Done   | `.env.example`                          |

**Key Changes:**

- Removed FK hint syntax from Supabase queries that caused PGRST200 errors
- Added `notify.success()` and `notify.error()` toast feedback to all handlers
- Created Twilio WhatsApp API integration for applicant notifications
- Integrated WhatsApp into document flagging flow (non-blocking)

---

### Phase 1: Agent Sandbox Infrastructure (COMPLETED)

**Status: DONE**

| Task                  | Status | Files                                           |
| --------------------- | ------ | ----------------------------------------------- |
| Database migration    | Done   | `024_agent_sandbox.sql`                         |
| AgentActivityButton   | Done   | `components/agents/AgentActivityButton.tsx`     |
| AgentInstructionModal | Done   | `components/agents/AgentInstructionModal.tsx`   |
| Zustand agentStore    | Done   | `lib/stores/agentStore.ts`                      |
| Agent sessions API    | Done   | `api/institutions/[id]/agent-sessions/route.ts` |

**Database Schema:**

```sql
-- agent_sessions: Track agent execution
CREATE TABLE agent_sessions (
    id UUID PRIMARY KEY,
    institution_id UUID NOT NULL,
    agent_type TEXT NOT NULL,  -- document_reviewer, aps_ranking, etc.
    status TEXT NOT NULL,      -- pending, running, completed, failed
    input_context JSONB,
    output_result JSONB,
    target_type TEXT,
    target_ids UUID[],
    processed_items INTEGER,
    total_items INTEGER,
    initiated_by UUID NOT NULL,
    created_at TIMESTAMPTZ
);

-- agent_decisions: Audit trail
CREATE TABLE agent_decisions (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL,
    decision_type TEXT NOT NULL,
    target_id UUID NOT NULL,
    decision_value JSONB NOT NULL,
    confidence_score DECIMAL(3,2),
    reasoning TEXT,
    reviewed_by UUID,
    review_outcome TEXT  -- accepted, overridden, pending
);

-- saved_charts: Analytics archiving
CREATE TABLE saved_charts (
    id UUID PRIMARY KEY,
    institution_id UUID NOT NULL,
    title TEXT NOT NULL,
    chart_type TEXT NOT NULL,
    chart_config JSONB NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE
);
```

---

### Phase 2: Document Reviewer Agent (NEXT)

**Status: PLANNED**

**Goal:** Automated document verification using GPT-4V vision analysis.

| Task                                       | Description                                |
| ------------------------------------------ | ------------------------------------------ |
| Create `document_reviewer_agent` in CrewAI | YAML config + Python tools                 |
| Implement vision analysis tool             | GPT-4V for document inspection             |
| Add document type detection                | ID, transcript, certificate classification |
| Implement signature detection              | Check for missing signatures               |
| Add clarity/quality scoring                | Image quality assessment                   |
| Create decision recording                  | Store decisions in `agent_decisions`       |
| Supabase Realtime integration              | Push updates to dashboard                  |

**Agent Configuration (agents.yaml):**

```yaml
document_reviewer_agent:
  role: "Document Verification Specialist"
  goal: "Review uploaded documents for completeness, validity, and compliance"
  backstory: |
    You are an expert document reviewer for university admissions.
    You verify identity documents, academic transcripts, and certificates.
    You check for signatures, clarity, and authenticity indicators.
  tools:
    - vision_analyze_document
    - get_document_metadata
    - flag_document
    - approve_document
    - record_decision
  memory: false
  verbose: true
```

**Tools:**

| Tool                      | Purpose                                       |
| ------------------------- | --------------------------------------------- |
| `vision_analyze_document` | Send document image to GPT-4V for analysis    |
| `get_document_metadata`   | Retrieve expected document type, requirements |
| `flag_document`           | Flag document with reason, trigger WhatsApp   |
| `approve_document`        | Mark document as approved                     |
| `record_decision`         | Store decision in agent_decisions table       |

---

### Phase 3: APS Ranking Agent

**Status: PLANNED**

**Goal:** Calculate Admission Point Scores based on transcript results.

| Task                               | Description                                 |
| ---------------------------------- | ------------------------------------------- |
| Create `aps_ranking_agent`         | YAML config + calculation tools             |
| Implement APS calculation logic    | Subject-to-points mapping                   |
| Support multiple APS systems       | Different institutions use different scales |
| Integrate with course requirements | Compare APS to minimum requirements         |
| Generate ranking recommendations   | Rank applicants by APS + criteria           |

**APS Calculation Example (Eduvos BCom Accounting):**

```
Subject Requirements:
- English: Level 4+ (50%+)
- Mathematics: Level 4+ (50%+) OR Maths Literacy: Level 5+ (60%+)
- Total APS: 22+ points

Points Scale:
- 80-100%: 7 points
- 70-79%: 6 points
- 60-69%: 5 points
- 50-59%: 4 points
- 40-49%: 3 points
- 30-39%: 2 points
- 0-29%: 1 point
```

---

### Phase 4: Reviewer Assistant Agent

**Status: PLANNED**

**Goal:** AI-powered decision support for human reviewers.

| Task                              | Description                           |
| --------------------------------- | ------------------------------------- |
| Create `reviewer_assistant_agent` | Context-aware Q&A support             |
| Implement RAG for policy lookup   | Vector search on institution policies |
| Add comparative analysis          | Compare applicant to similar cases    |
| Generate recommendation summaries | Structured decision support           |
| Track reviewer interactions       | Log questions and responses           |

**Use Cases:**

- "Is this applicant eligible for conditional acceptance?"
- "What documents are missing for this application?"
- "How does this applicant compare to others for this course?"

---

### Phase 5: Analytics Agent

**Status: PLANNED**

**Goal:** Generate insights and visualizations from admissions data.

| Task                              | Description                         |
| --------------------------------- | ----------------------------------- |
| Create `analytics_agent`          | Data analysis + visualization       |
| Implement Recharts integration    | Server-side chart config generation |
| Add natural language queries      | "Show acceptance rate by faculty"   |
| Create archivable charts          | Save to `saved_charts` table        |
| Build analytics dashboard section | Display pinned charts               |

**Chart Types:**

- Bar: Status distribution, applications by course
- Line: Application trends over time
- Pie/Donut: Acceptance rates, demographic breakdowns
- Funnel: Application pipeline stages
- Table: Detailed data views

---

### Phase 6: Notification & Automation Agent

**Status: PLANNED**

**Goal:** Automated applicant communications and bulk operations.

| Task                               | Description                    |
| ---------------------------------- | ------------------------------ |
| Create `notification_sender_agent` | WhatsApp/Email automation      |
| Implement template management      | Institution-specific templates |
| Add bulk notification support      | Batch status notifications     |
| Create scheduling system           | Timed notifications            |
| Track delivery status              | Twilio webhooks integration    |

**Notification Types:**

- Document flagged (resubmission required)
- Application status change
- Interview scheduling
- Final decision notification
- Registration reminders

---

## File Structure

```
apps/
├── backend/
│   └── supabase/migrations/
│       └── 024_agent_sandbox.sql          # Agent tables
│
└── dashboard/
    ├── app/api/
    │   ├── notifications/
    │   │   └── whatsapp/route.ts          # WhatsApp notifications
    │   └── institutions/[id]/
    │       └── agent-sessions/route.ts    # Agent session CRUD
    │
    ├── components/
    │   └── agents/
    │       ├── index.ts
    │       ├── AgentActivityButton.tsx    # Header button
    │       └── AgentInstructionModal.tsx  # Agent launcher modal
    │
    └── lib/stores/
        └── agentStore.ts                  # Zustand state management
```

---

## Environment Variables

Add to root `.env.local`:

```bash
# Twilio WhatsApp (for applicant notifications)
TWILIO_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# OpenAI (for GPT-4V document analysis - Phase 2)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Integration Points

### Supabase Realtime

Agent sessions update the dashboard in real-time:

```typescript
// Subscribe to agent session updates
const channel = supabase
  .channel("agent-sessions")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "agent_sessions",
      filter: `institution_id=eq.${institutionId}`,
    },
    (payload) => {
      // Update agentStore with new session data
      agentStore.getState().addSession(transformSession(payload.new));
    }
  )
  .subscribe();
```

### CrewAI Backend Integration

Agent sessions trigger backend execution:

```python
# Backend receives session via webhook/queue
async def process_agent_session(session_id: str):
    session = await get_session(session_id)

    if session.agent_type == 'document_reviewer':
        crew = DocumentReviewerCrew()
        result = crew.kickoff(inputs={
            'session_id': session_id,
            'target_ids': session.target_ids,
        })

    # Update session with results
    await update_session(session_id, {
        'status': 'completed',
        'output_result': result,
    })
```

---

## Testing Strategy

| Phase   | Test Type          | Focus                                         |
| ------- | ------------------ | --------------------------------------------- |
| Phase 0 | Manual             | Toast notifications, WhatsApp delivery        |
| Phase 1 | Unit + Integration | API routes, store mutations                   |
| Phase 2 | E2E                | Document upload → agent review → flag/approve |
| Phase 3 | Unit               | APS calculation accuracy                      |
| Phase 4 | Integration        | RAG retrieval quality                         |
| Phase 5 | Visual             | Chart rendering, data accuracy                |
| Phase 6 | E2E                | Notification delivery, template rendering     |

---

## Security Considerations

1. **Agent Decisions Audit Trail**: All agent decisions stored with confidence scores and reasoning
2. **Human Override**: Staff can accept or override any agent decision
3. **RLS Policies**: Institution-scoped access to agent sessions and decisions
4. **Service Role Only**: Agent decision creation requires service role (backend only)
5. **WhatsApp Rate Limiting**: Implement per-institution limits on notifications

---

## Success Metrics

| Metric                     | Target | Measurement               |
| -------------------------- | ------ | ------------------------- |
| Document review time       | -70%   | Manual vs. agent-assisted |
| APS calculation accuracy   | 99%+   | Spot-check sample         |
| Reviewer decision support  | +50%   | Staff survey              |
| Notification delivery rate | 95%+   | Twilio webhooks           |
| Analytics query response   | <5s    | Agent response time       |

---

## Timeline Estimate

| Phase   | Estimated Effort |
| ------- | ---------------- |
| Phase 0 | DONE             |
| Phase 1 | DONE             |
| Phase 2 | 2-3 days         |
| Phase 3 | 1-2 days         |
| Phase 4 | 2-3 days         |
| Phase 5 | 2-3 days         |
| Phase 6 | 1-2 days         |

**Total remaining: ~8-13 days of development**

---

## Next Steps

1. **Integrate AgentActivityButton** into applications page header
2. **Set up Supabase Realtime** subscription in agentStore
3. **Create backend agent execution** endpoint/queue
4. **Implement document_reviewer_agent** with GPT-4V
5. **Add E2E tests** for document review flow
