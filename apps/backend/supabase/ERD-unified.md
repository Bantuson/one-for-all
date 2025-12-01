# Unified Entity Relationship Diagram

**Version**: 2.0 (Unified Multi-Tenant Schema)
**Date**: 2025-11-30
**Status**: Proposed Design

---

## Complete ERD (ASCII Diagram)

```
┌────────────────────────────────────────────────────────────────────┐
│                      MULTI-TENANT HIERARCHY                         │
└────────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐
│      institutions         │   Tenant Root
├──────────────────────────┤
│ id (PK)                  │
│ name                     │
│ slug (UNIQUE)            │
│ type                     │   'university' | 'nsfas' | 'private_college' | 'bursary'
│ logo_url                 │
│ settings (JSONB)         │
│ created_at               │
│ updated_at               │
└───────────┬──────────────┘
            │ 1
            │
            │ N
┌───────────▼──────────────┐
│        campuses           │
├──────────────────────────┤
│ id (PK)                  │
│ institution_id (FK)      │───────┐
│ name                     │       │
│ location                 │       │
│ created_at               │       │
│ updated_at               │       │
└───────────┬──────────────┘       │
            │ 1                    │
            │                      │
            │ N                    │
┌───────────▼──────────────┐       │
│       faculties           │       │
├──────────────────────────┤       │
│ id (PK)                  │       │
│ institution_id (FK)      │───────┤
│ campus_id (FK)           │       │
│ name                     │       │
│ dean_name                │       │
│ created_at               │       │
│ updated_at               │       │
└───────────┬──────────────┘       │
            │ 1                    │
            │                      │
            │ N                    │
┌───────────▼──────────────┐       │
│         courses           │       │
├──────────────────────────┤       │
│ id (PK)                  │       │
│ institution_id (FK)      │───────┤
│ faculty_id (FK)          │       │
│ name                     │       │
│ code                     │       │
│ qualification_type       │       │
│ requirements (JSONB)     │       │
│ created_at               │       │
│ updated_at               │       │
└───────────┬──────────────┘       │
            │ 1                    │
            │                      │
            │ 1                    │
┌───────────▼──────────────┐       │
│   evaluation_criteria     │       │
├──────────────────────────┤       │
│ id (PK)                  │       │
│ institution_id (FK)      │───────┤
│ course_id (FK) UNIQUE    │       │
│ criteria (JSONB)         │       │
│ weighting (JSONB)        │       │
│ created_at               │       │
│ updated_at               │       │
└──────────────────────────┘       │
                                   │
┌────────────────────────────────────────────────────────────────────┐
│                    USER MANAGEMENT & RBAC                           │
└────────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐
│     user_accounts         │
├──────────────────────────┤
│ id (PK)                  │
│ username (UNIQUE)        │
│ email (UNIQUE)           │
│ cellphone (UNIQUE)       │
│ created_at               │
│ updated_at               │
└───────────┬──────────────┘
            │ 1
            │
            │ N
┌───────────▼──────────────┐
│     user_sessions         │
├──────────────────────────┤
│ id (PK)                  │
│ user_id (FK)             │
│ session_token (UNIQUE)   │
│ expires_at               │   24-hour TTL
│ created_at               │
└──────────────────────────┘

            │ 1
            │
            │ N
┌───────────▼──────────────────────────┐
│      institution_users               │   Junction Table (RBAC)
├──────────────────────────────────────┤
│ id (PK)                              │
│ institution_id (FK) ─────────────────┼──────────┐
│ user_id (FK)                         │          │
│ role                                 │   'applicant' | 'reviewer' | 'admin' | 'super_admin'
│ permissions (JSONB)                  │
│ campus_ids (UUID[])                  │
│ faculty_ids (UUID[])                 │
│ created_at                           │
│ updated_at                           │
│ UNIQUE(institution_id, user_id)      │
└──────────────────────────────────────┘


┌────────────────────────────────────────────────────────────────────┐
│                       APPLICATIONS SYSTEM                           │
└────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┐
│          applications                 │   UNIFIED TABLE
├──────────────────────────────────────┤
│ id (PK)                              │
│ institution_id (FK) ─────────────────┼──────────┐
│ course_id (FK)                       │          │
│ user_id (FK) ────────────────────────┼────┐     │
│ application_year                     │    │     │
│                                      │    │     │
│ -- Application Data                 │    │     │
│ personal_info (JSONB)                │    │     │
│ academic_info (JSONB)                │    │     │
│ rag_summary (JSONB)                  │    │     │
│                                      │    │     │
│ -- AI Processing                    │    │     │
│ ai_score (NUMERIC)                   │    │     │
│ ai_decision (TEXT)                   │    │     │
│ ai_reasoning (TEXT)                  │    │     │
│                                      │    │     │
│ -- Status Management                │    │     │
│ status                               │    │     │
│ status_history (JSONB)               │    │     │
│ submission_payload (JSONB)           │    │     │
│                                      │    │     │
│ -- Review Data                      │    │     │
│ reviewer_id (FK) ────────────────────┼────┘     │
│ reviewer_notes (JSONB)               │          │
│ final_decision (TEXT)                │          │
│ decision_date (TIMESTAMPTZ)          │          │
│                                      │          │
│ created_at                           │          │
│ updated_at                           │          │
└───────────┬──────────────────────────┘          │
            │ 1                                   │
            │                                     │
            │ N                                   │
┌───────────▼──────────────────┐                  │
│   application_documents       │                  │
├──────────────────────────────┤                  │
│ id (PK)                      │                  │
│ institution_id (FK) ─────────┼──────────────────┘
│ application_id (FK)          │
│ document_type                │
│ file_url                     │
│ file_size                    │
│ mime_type                    │
│ uploaded_at                  │
└──────────────────────────────┘

            │ 1
            │
            │ N
┌───────────▼──────────────────┐
│      agent_decisions          │   AI Audit Trail
├──────────────────────────────┤
│ id (PK)                      │
│ institution_id (FK) ─────────┼──────────────────┐
│ application_id (FK)          │                  │
│ agent_name                   │                  │
│ decision_type                │                  │
│ decision_data (JSONB)        │                  │
│ reasoning (TEXT)             │                  │
│ confidence_score (NUMERIC)   │                  │
│ version_used (INT)           │                  │
│ created_at                   │                  │
└──────────────────────────────┘                  │


┌────────────────────────────────────────────────────────────────────┐
│                         NSFAS SYSTEM                                │
└────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┐
│       nsfas_applications              │
├──────────────────────────────────────┤
│ id (PK)                              │
│ institution_id (FK) ─────────────────┼──────────────────┐
│ user_id (FK) ────────────────────────┼────┐             │
│                                      │    │             │
│ -- Reused from university app        │    │             │
│ personal_info (JSONB)                │    │             │
│ academic_info (JSONB)                │    │             │
│                                      │    │             │
│ -- NSFAS-specific                   │    │             │
│ guardian_info (JSONB)                │    │             │
│ household_info (JSONB)               │    │             │
│ income_info (JSONB)                  │    │             │
│ bank_details (JSONB)                 │    │             │
│ living_situation (TEXT)              │    │             │
│                                      │    │             │
│ status                               │    │             │
│ status_history (JSONB)               │    │             │
│ submission_payload (JSONB)           │    │             │
│                                      │    │             │
│ created_at                           │    │             │
│ updated_at                           │    │             │
└───────────┬──────────────────────────┘    │             │
            │ 1                             │             │
            │                               │             │
            │ N                             │             │
┌───────────▼──────────────────┐            │             │
│      nsfas_documents          │            │             │
├──────────────────────────────┤            │             │
│ id (PK)                      │            │             │
│ nsfas_application_id (FK)    │            │             │
│ document_type                │            │             │
│ file_url                     │            │             │
│ uploaded_at                  │            │             │
└──────────────────────────────┘            │             │
                                            │             │

┌────────────────────────────────────────────────────────────────────┐
│                   RAG / VECTOR SEARCH SYSTEM                        │
└────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┐
│         rag_embeddings                │   Tenant-scoped Knowledge Base
├──────────────────────────────────────┤
│ id (PK)                              │
│ institution_id (FK) ─────────────────┼──────────────────┐
│                                      │                  │
│ embedding (VECTOR 1536)              │                  │
│ metadata (JSONB)                     │                  │
│ source (TEXT)                        │                  │
│ chunk (TEXT)                         │                  │
│                                      │                  │
│ created_at                           │                  │
└──────────────────────────────────────┘                  │


┌────────────────────────────────────────────────────────────────────┐
│                      AGENT CONFIGURATION SYSTEM                     │
└────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┐
│   institution_agent_configs           │   Dynamic Agent Prompts
├──────────────────────────────────────┤
│ id (PK)                              │
│ institution_id (FK) ─────────────────┼──────────────────┐
│ agent_name (TEXT)                    │                  │
│ prompt_template (TEXT)               │                  │
│ tool_config (JSONB)                  │                  │
│ enabled (BOOLEAN)                    │                  │
│ version (INT)                        │                  │
│ created_at                           │                  │
│ updated_at                           │                  │
│ UNIQUE(institution_id, agent, ver)   │                  │
└──────────────────────────────────────┘                  │
            │ N                                           │
            │                                             │
            │ N                                           │
┌───────────▼──────────────────┐                          │
│   active_agent_versions       │                          │
├──────────────────────────────┤                          │
│ institution_id (FK) ─────────┼──────────────────────────┘
│ agent_name (TEXT)            │
│ active_version (INT)         │
│ updated_at                   │
│ PK(institution_id, agent)    │
└──────────────────────────────┘
```

---

## Table Relationships Summary

### Institution Hierarchy (Top-Down)

```
institutions (1)
    → campuses (N)
        → faculties (N)
            → courses (N)
                → evaluation_criteria (1)
                → applications (N)
```

### User & RBAC

```
user_accounts (1)
    → user_sessions (N)
    → institution_users (N) ← institutions (N)
    → applications (N)
    → nsfas_applications (N)
```

### Application Lifecycle

```
applications (1)
    → application_documents (N)
    → agent_decisions (N)
    ← courses (1)
    ← institutions (1)
    ← user_accounts (1)
    ← user_accounts (reviewer_id) (0..1)
```

### Agent System

```
institutions (1)
    → institution_agent_configs (N)
        ← active_agent_versions (tracking table)
    → agent_decisions (N)
```

---

## Cardinality Reference

| Relationship | Type | Constraint |
|--------------|------|------------|
| Institution → Campus | 1:N | CASCADE DELETE |
| Campus → Faculty | 1:N | CASCADE DELETE |
| Faculty → Course | 1:N | CASCADE DELETE |
| Course → Evaluation Criteria | 1:1 | UNIQUE on course_id |
| Course → Applications | 1:N | Cannot delete course with apps |
| User → Applications | 1:N | CASCADE DELETE |
| User → Institution Users | 1:N | CASCADE DELETE |
| Institution → Applications | 1:N | CASCADE DELETE |
| Application → Documents | 1:N | CASCADE DELETE |
| Application → Agent Decisions | 1:N | CASCADE DELETE |
| Institution → RAG Embeddings | 1:N | CASCADE DELETE |
| Institution → Agent Configs | 1:N | CASCADE DELETE |

---

## Key Differences from Original ERD

### Added Tables

1. ✅ `institutions` - Tenant root (was missing)
2. ✅ `campuses` - Campus hierarchy (was missing)
3. ✅ `faculties` - Faculty hierarchy (was missing)
4. ✅ `courses` - Course catalog (was missing)
5. ✅ `evaluation_criteria` - Database-driven criteria (was missing)
6. ✅ `institution_users` - RBAC junction table (was missing)
7. ✅ `institution_agent_configs` - Dynamic prompts (was missing)
8. ✅ `active_agent_versions` - Version tracking (was missing)
9. ✅ `agent_decisions` - AI audit trail (was missing)

### Modified Tables

1. ✅ `applications` - Added `institution_id`, `course_id`, removed TEXT fields
2. ✅ `nsfas_applications` - Added `institution_id`
3. ✅ `rag_embeddings` - Added `institution_id` for tenant scoping

### Unchanged Tables

1. ✅ `user_accounts` - No changes
2. ✅ `user_sessions` - No changes
3. ✅ `application_documents` - Added `institution_id` only
4. ✅ `nsfas_documents` - No changes

---

## RLS Policy Summary

| Table | Applicant Policy | Reviewer Policy | Admin Policy |
|-------|------------------|-----------------|--------------|
| institutions | View if member | View if member | View if member |
| campuses | View if member | View if member | View if member |
| faculties | View if member | View if member | View if member |
| courses | View if member | View if member | View if member |
| applications | View own | View institution's | View institution's |
| application_documents | View own | View institution's | View institution's |
| rag_embeddings | View if member | View if member | Manage if permitted |
| agent_configs | ❌ No access | ❌ No access | Manage if permitted |
| agent_decisions | ❌ No access | View institution's | View institution's |

---

## Foreign Key Cascade Behavior

**CASCADE DELETE** (parent deletion removes children):
- Institution → All child tables
- User → Applications, NSFAS applications
- Application → Documents, Agent decisions

**RESTRICT DELETE** (cannot delete parent with children):
- None (all use CASCADE for data integrity)

**SET NULL** (not used in this schema):
- Would cause orphaned records, avoided

---

## Indexes for Performance

### Most Critical Indexes

1. `idx_applications_institution_date` - Dashboard main query
2. `idx_applications_reviewer_queue` - Partial index WHERE status = 'in_review'
3. `idx_rag_embeddings_vector` - IVFFlat for vector search
4. `idx_institution_users_user` - JWT permission checks

### Composite Indexes

```sql
-- Applications by institution + status
CREATE INDEX idx_applications_status ON applications(institution_id, status, updated_at DESC);

-- Applications by course
CREATE INDEX idx_applications_course ON applications(course_id, status);

-- Agent decisions by institution + agent
CREATE INDEX idx_agent_decisions_institution_agent ON agent_decisions(institution_id, agent_name, created_at DESC);
```

---

## Data Integrity Constraints

1. **Institution-Course Consistency**:
   ```sql
   CHECK (EXISTS (SELECT 1 FROM courses WHERE id = course_id AND institution_id = applications.institution_id))
   ```

2. **Valid Status Transitions**:
   ```sql
   CHECK (status IN ('pending', 'in_review', 'accepted', 'rejected', 'withdrawn'))
   ```

3. **Unique Institution Users**:
   ```sql
   UNIQUE(institution_id, user_id)
   ```

4. **One Criteria Per Course**:
   ```sql
   UNIQUE(course_id) -- in evaluation_criteria table
   ```

---

**Status**: Proposed Unified Schema
**Next**: Implementation via migration scripts
**Owner**: Database Team
