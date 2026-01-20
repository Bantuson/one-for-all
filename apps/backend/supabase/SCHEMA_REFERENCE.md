# Database Schema Reference

**One For All** - Multi-Tenant Admissions Management Platform
**Last Updated:** 2026-01-20
**Database:** Supabase PostgreSQL with pgvector extension

## Table of Contents

- [Migration History](#migration-history)
- [Extensions](#extensions)
- [Core Tables](#core-tables)
  - [Authentication & Users](#authentication--users)
  - [Institution Hierarchy](#institution-hierarchy)
  - [Applications & Choices](#applications--choices)
  - [Documents](#documents)
  - [NSFAS](#nsfas)
  - [RAG & Embeddings](#rag--embeddings)
  - [Agent Infrastructure](#agent-infrastructure)
  - [Notifications](#notifications)
  - [Miscellaneous](#miscellaneous)
- [Materialized Views](#materialized-views)
- [Functions & Stored Procedures](#functions--stored-procedures)
- [Entity Relationship Summary](#entity-relationship-summary)
- [Indexing Strategy](#indexing-strategy)

---

## Migration History

All migrations are located in `apps/backend/supabase/migrations/`. They are applied in alphanumeric order.

### Numbered Migrations (Sequential Schema)

| Migration | Description | Date |
|-----------|-------------|------|
| `000_complete_schema.sql` | Complete baseline schema with all tables | 2025-12-03 |
| `001_auth_setup.sql` | Clerk authentication integration | 2025-12-03 |
| `002_institutions_schema.sql` | Multi-tenant institution hierarchy | 2025-12-03 |
| `003_scan_jobs.sql` | Scanner job tracking for course data ingestion | - |
| `004_add_invitation_fields.sql` | Institution member invitation tracking | - |
| `005_add_course_level.sql` | Course level field (undergraduate/postgraduate) | - |
| `006_rename_applicant_tables.sql` | Rename user_accounts to applicant_accounts | - |
| `007_updated_rls_policies.sql` | Row-level security policy refinements | - |
| `008_fix_function_search_paths.sql` | PostgreSQL search path fixes for functions | - |
| `009_move_vector_extension.sql` | pgvector extension migration | - |
| `010_otp_codes.sql` | OTP verification table for authentication | - |
| `011_institution_roles.sql` | Institution role system refinement | - |
| `012_update_institution_members.sql` | Institution member schema updates | - |
| `012_export_applications_permission.sql` | Export permissions for admins | - |
| `013_course_dates.sql` | Course application date tracking | - |
| `014_application_choices.sql` | Multi-choice application system | 2026-01-13 |
| `015_migrate_application_choices.sql` | Data migration for multi-choice | - |
| `016_student_numbers.sql` | Student number generation system | - |
| `017_seed_student_number_formats.sql` | Seed data for student numbers | - |
| `018_seed_test_applications.sql` | Test application data seeding | - |
| `019_application_notes.sql` | Staff notes and annotations | 2026-01-14 |
| `020_document_flagging.sql` | Document review flagging system | - |
| `021_extended_test_data.sql` | Extended test data seeding | - |
| `022_remove_test_data.sql` | Cleanup test data | - |
| `023_fresh_test_applications.sql` | Fresh test application data | - |
| `024_agent_sandbox.sql` | Agent session infrastructure | 2026-01-15 |
| `024_saved_charts.sql` | Analytics chart archival (merged into 024) | - |
| `025_intake_document_validation.sql` | Document intake validation rules | - |
| `026_application_rankings_view.sql` | Materialized view for APS rankings | - |
| `027_course_threshold_overrides.sql` | Course-specific APS threshold overrides | - |
| `028_rankings_refresh_queue.sql` | Demand-triggered rankings view refresh | 2026-01-20 |
| `028_notification_logs.sql` | Multi-channel notification tracking | 2026-01-20 |
| `030_fulltext_search.sql` | PostgreSQL full-text search for RAG | 2026-01-20 |

### Legacy Migrations (Single-Purpose)

| Migration | Description |
|-----------|-------------|
| `application_documents.sql` | Legacy application documents table |
| `applications.sql` | Legacy applications table |
| `nsfas_applications.sql` | Legacy NSFAS applications table |
| `nsfas_documents.sql` | Legacy NSFAS documents table |
| `rag_embeddings.sql` | Legacy RAG embeddings table |
| `match_rag_embeddings.sql` | Legacy vector search function |
| `user_sessions.sql` | Legacy user session management |
| `user_accounts.sql` | Legacy user accounts table |
| `pgvector.sql` | Legacy pgvector extension setup |
| `RLS.sql` | Legacy row-level security policies |
| `policies.sql` | Legacy RLS policy definitions |
| `20260107_update_document_tables.sql` | Document table schema updates |
| `20260107_document_storage.sql` | Supabase Storage integration |
| `20260108_storage_rls_policies.sql` | Storage bucket RLS policies |

---

## Extensions

### PostgreSQL Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "vector";         -- pgvector for embeddings
```

**pgvector Configuration:**
- Embedding Dimensions: **1536** (OpenAI text-embedding-ada-002)
- Index Type: **IVFFlat** with cosine distance
- Lists Parameter: **100** (for approximate nearest neighbor search)

---

## Core Tables

### Authentication & Users

#### `users`
User profiles synced from Clerk authentication.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Internal user ID |
| `clerk_user_id` | TEXT | UNIQUE, NOT NULL | Clerk user ID from JWT `sub` claim |
| `email` | TEXT | UNIQUE, NOT NULL | User email address |
| `first_name` | TEXT | | User first name |
| `last_name` | TEXT | | User last name |
| `phone` | TEXT | | Phone number |
| `avatar_url` | TEXT | | Clerk avatar URL |
| `onboarding_completed` | BOOLEAN | DEFAULT FALSE | Onboarding flow completion status |
| `metadata` | JSONB | DEFAULT '{}' | Additional user metadata |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_users_clerk_user_id` on `clerk_user_id`
- `idx_users_email` on `email`

**RLS Policies:**
- Users can view/update own profile
- Service role has full access

---

#### `user_accounts` / `applicant_accounts`
Legacy user accounts for CrewAI backend. Referenced by applications and NSFAS tables.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Account ID |
| `username` | TEXT | UNIQUE | Username (optional) |
| `email` | TEXT | UNIQUE, NOT NULL | Email address |
| `cellphone` | TEXT | UNIQUE, NOT NULL | Phone number |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_user_accounts_email` on `email`
- `idx_user_accounts_cellphone` on `cellphone`

---

#### `user_sessions`
24-hour TTL sessions for CrewAI OTP-based authentication.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Session ID |
| `user_id` | UUID | FK → user_accounts | Associated user |
| `session_token` | TEXT | UNIQUE, NOT NULL | Session token |
| `expires_at` | TIMESTAMPTZ | NOT NULL | Session expiration (24 hours) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_sessions_token` on `session_token`
- `idx_sessions_user` on `user_id`
- `idx_sessions_expires` on `expires_at`

---

### Institution Hierarchy

#### `institutions`
Multi-tenant institution registration (universities, colleges, NSFAS, bursary providers).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Institution ID |
| `name` | TEXT | NOT NULL | Institution name |
| `slug` | TEXT | UNIQUE, NOT NULL | URL-safe slug (lowercase-hyphenated) |
| `type` | TEXT | NOT NULL | `university`, `college`, `nsfas`, `bursary_provider` |
| `contact_email` | TEXT | NOT NULL | Primary contact email |
| `contact_phone` | TEXT | | Contact phone number |
| `website` | TEXT | | Official website URL |
| `address` | JSONB | DEFAULT '{}' | Physical address (street, city, province, postal_code, country) |
| `logo_url` | TEXT | | Logo image URL |
| `primary_color` | TEXT | DEFAULT '#000000' | Brand primary color |
| `secondary_color` | TEXT | DEFAULT '#FFFFFF' | Brand secondary color |
| `settings` | JSONB | DEFAULT '{}' | Institution-specific settings (allow_public_applications, require_documents, etc.) |
| `status` | TEXT | DEFAULT 'active' | `active`, `suspended`, `archived` |
| `created_by` | UUID | FK → users | User who created the institution |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_institutions_slug` on `slug`
- `idx_institutions_type` on `type`
- `idx_institutions_status` on `status`
- `idx_institutions_created_by` on `created_by`

**Triggers:**
- `auto_assign_admin` → Automatically assigns creator as admin in `institution_members`

**RLS Policies:**
- Users can view institutions they're members of
- Admins can update their institutions
- Service role has full access

---

#### `campuses`
Optional campus level in institution hierarchy.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Campus ID |
| `institution_id` | UUID | FK → institutions | Parent institution |
| `name` | TEXT | NOT NULL | Campus name |
| `code` | TEXT | | Campus code (unique per institution) |
| `location` | TEXT | | Campus location description |
| `address` | JSONB | DEFAULT '{}' | Campus address |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Constraints:**
- UNIQUE(`institution_id`, `code`)

**Indexes:**
- `idx_campuses_institution_id` on `institution_id`
- `idx_campuses_code` on (`institution_id`, `code`)

---

#### `faculties`
Academic faculties within institutions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Faculty ID |
| `institution_id` | UUID | FK → institutions | Parent institution |
| `campus_id` | UUID | FK → campuses | Associated campus (nullable) |
| `name` | TEXT | NOT NULL | Faculty name |
| `code` | TEXT | | Faculty code (unique per institution) |
| `description` | TEXT | | Faculty description |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Constraints:**
- UNIQUE(`institution_id`, `code`)

**Indexes:**
- `idx_faculties_institution_id` on `institution_id`
- `idx_faculties_campus_id` on `campus_id`
- `idx_faculties_code` on (`institution_id`, `code`)

---

#### `courses`
Course offerings with admission requirements.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Course ID |
| `institution_id` | UUID | FK → institutions | Parent institution |
| `faculty_id` | UUID | FK → faculties | Parent faculty |
| `campus_id` | UUID | FK → campuses | Associated campus (nullable) |
| `name` | TEXT | NOT NULL | Course name |
| `code` | TEXT | NOT NULL | Course code (unique per institution) |
| `description` | TEXT | | Course description |
| `duration_years` | INTEGER | DEFAULT 4 | Course duration in years |
| `requirements` | JSONB | DEFAULT '{}' | Admission requirements (minimum_aps, required_subjects, minimum_subject_levels, additional_requirements, intake_limit) |
| `status` | TEXT | DEFAULT 'active' | `active`, `inactive`, `archived` |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Constraints:**
- UNIQUE(`institution_id`, `code`)

**Indexes:**
- `idx_courses_institution_id` on `institution_id`
- `idx_courses_faculty_id` on `faculty_id`
- `idx_courses_code` on (`institution_id`, `code`)
- `idx_courses_status` on `status`

---

#### `institution_members`
User-to-institution relationship with roles.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Membership ID |
| `institution_id` | UUID | FK → institutions | Associated institution |
| `user_id` | UUID | FK → users | Associated user |
| `role` | TEXT | NOT NULL | `admin`, `reviewer`, `member`, `applicant` |
| `permissions` | JSONB | DEFAULT '[]' | Additional permissions array |
| `invited_by` | UUID | FK → users | User who sent invitation |
| `invitation_accepted_at` | TIMESTAMPTZ | | Invitation acceptance timestamp |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Constraints:**
- UNIQUE(`institution_id`, `user_id`)

**Indexes:**
- `idx_institution_members_institution_id` on `institution_id`
- `idx_institution_members_user_id` on `user_id`
- `idx_institution_members_role` on `role`

**RLS Policies:**
- Users can view own memberships and institution members (if admin/reviewer)
- Admins can manage members
- Service role has full access

---

### Applications & Choices

#### `applications`
University applications with multi-tenant support.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Application ID |
| `user_id` | UUID | FK → user_accounts | Legacy user ID (CrewAI backend) |
| `applicant_id` | UUID | FK → users | Applicant user ID (Clerk) |
| `institution_id` | UUID | FK → institutions | Target institution (multi-tenant) |
| `course_id` | UUID | FK → courses | Target course (multi-tenant) |
| `university_name` | TEXT | NOT NULL | Legacy university name (for backward compatibility) |
| `faculty` | TEXT | | Legacy faculty (deprecated) |
| `qualification_type` | TEXT | | Legacy qualification type |
| `program` | TEXT | | Legacy program |
| `year` | INT | | Application year |
| `personal_info` | JSONB | NOT NULL | Personal information (name, ID number, demographics, contact) |
| `academic_info` | JSONB | NOT NULL | Academic records (matric results, APS score, subjects) |
| `rag_summary` | JSONB | | RAG-generated summary of application |
| `submission_payload` | JSONB | | Final submission payload sent to institution |
| `status` | TEXT | DEFAULT 'submitted' | Application status |
| `status_history` | JSONB | DEFAULT '[]' | Status change audit trail |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_applications_user` on `user_id`
- `idx_applications_university` on `university_name`
- `idx_applications_institution_id` on `institution_id`
- `idx_applications_course_id` on `course_id`
- `idx_applications_status` on `status`

**RLS Policies:**
- Users can view own applications or institution applications (if member)
- Service role has full access

---

#### `application_choices`
Normalized course choices per application (supports 1st and 2nd choice).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Choice ID |
| `application_id` | UUID | FK → applications | Parent application |
| `priority` | INTEGER | NOT NULL | Choice priority: 1 or 2 |
| `course_id` | UUID | FK → courses | Target course |
| `institution_id` | UUID | FK → institutions | Target institution |
| `faculty_id` | UUID | FK → faculties | Target faculty (nullable) |
| `campus_id` | UUID | FK → campuses | Target campus (nullable) |
| `status` | TEXT | DEFAULT 'pending' | `pending`, `under_review`, `conditionally_accepted`, `accepted`, `rejected`, `waitlisted`, `withdrawn` |
| `status_reason` | TEXT | | Optional reason for status |
| `reviewed_by` | UUID | FK → users | Reviewer user ID |
| `reviewed_at` | TIMESTAMPTZ | | Review timestamp |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Constraints:**
- UNIQUE(`application_id`, `priority`)
- UNIQUE(`application_id`, `course_id`)

**Indexes:**
- `idx_application_choices_application_id` on `application_id`
- `idx_application_choices_course_id` on `course_id`
- `idx_application_choices_institution_id` on `institution_id`
- `idx_application_choices_status` on `status`
- `idx_application_choices_institution_status` on (`institution_id`, `status`)
- `idx_application_choices_course_status` on (`course_id`, `status`)
- `idx_application_choices_reviewed_by` on `reviewed_by` (partial: WHERE reviewed_by IS NOT NULL)

**RLS Policies:**
- Institution members can view application choices
- Institution staff (admin/reviewer) can update choices
- Service role has full access

---

#### `application_notes`
Staff notes and annotations on applications.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Note ID |
| `application_id` | UUID | FK → applications | Associated application |
| `institution_id` | UUID | FK → institutions | Institution context |
| `title` | TEXT | NOT NULL | Note title |
| `body` | TEXT | NOT NULL | Note body content |
| `note_type` | TEXT | DEFAULT 'general' | `general`, `flag`, `review`, `followup` |
| `color` | TEXT | DEFAULT 'gray' | Visual indicator: `gray`, `green`, `yellow`, `red`, `blue`, `purple` |
| `created_by` | UUID | NOT NULL | User who created the note |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_appnotes_application` on `application_id`
- `idx_appnotes_institution` on `institution_id`
- `idx_appnotes_created_by` on `created_by`
- `idx_appnotes_note_type` on `note_type`
- `idx_appnotes_created_at` on `created_at DESC`

**RLS Policies:**
- Institution members can view notes
- Institution staff can create notes
- Users can update own notes
- Admins can delete notes
- Service role has full access

---

### Documents

#### `application_documents`
Documents attached to university applications.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Document ID |
| `application_id` | UUID | FK → applications | Parent application |
| `file_url` | TEXT | NOT NULL | Supabase Storage URL |
| `document_type` | TEXT | NOT NULL | Document type (e.g., 'id_document', 'matric_certificate', 'proof_of_residence') |
| `uploaded_at` | TIMESTAMPTZ | DEFAULT NOW() | Upload timestamp |

**Indexes:**
- `idx_appdocs_appid` on `application_id`

---

### NSFAS

#### `nsfas_applications`
NSFAS funding applications (National Student Financial Aid Scheme).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | NSFAS application ID |
| `user_id` | UUID | FK → user_accounts | Applicant user ID |
| `institution_id` | UUID | FK → institutions | Target institution |
| `personal_info` | JSONB | NOT NULL | Reused personal data from university application |
| `academic_info` | JSONB | NOT NULL | Reused academic data from university application |
| `guardian_info` | JSONB | | Guardian/parent information |
| `household_info` | JSONB | | Household composition |
| `income_info` | JSONB | | Household income details |
| `bank_details` | JSONB | | Applicant bank details |
| `living_situation` | TEXT | | Living arrangement description |
| `status` | TEXT | DEFAULT 'submitted' | NSFAS application status |
| `status_history` | JSONB | DEFAULT '[]' | Status change audit trail |
| `submission_payload` | JSONB | | Final submission payload |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_nsfas_user` on `user_id`
- `idx_nsfas_institution_id` on `institution_id`

**RLS Policies:**
- Users can view own NSFAS applications
- Service role has full access

---

#### `nsfas_documents`
Documents attached to NSFAS applications.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Document ID |
| `nsfas_application_id` | UUID | FK → nsfas_applications | Parent NSFAS application |
| `file_url` | TEXT | NOT NULL | Supabase Storage URL |
| `document_type` | TEXT | NOT NULL | Document type (e.g., 'income_proof', 'id_copy', 'bank_statement') |
| `uploaded_at` | TIMESTAMPTZ | DEFAULT NOW() | Upload timestamp |

**Indexes:**
- `idx_nsfas_docs_appid` on `nsfas_application_id`

---

### RAG & Embeddings

#### `rag_embeddings`
Vector embeddings for RAG-based university/course information retrieval.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Embedding ID |
| `institution_id` | UUID | FK → institutions | Multi-tenant institution scoping |
| `embedding` | vector(1536) | NOT NULL | OpenAI embedding (1536 dimensions) |
| `metadata` | JSONB | | Additional metadata |
| `source` | TEXT | | Legacy source (e.g., "UCT", "Wits", "UP") |
| `chunk` | TEXT | | Text chunk that was embedded |
| `content_tsv` | TSVECTOR | GENERATED | Auto-generated tsvector for full-text search |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_rag_embeddings_vector` on `embedding` (IVFFlat with cosine distance)
- `idx_rag_embeddings_source` on `source`
- `idx_rag_embeddings_institution_id` on `institution_id`
- `idx_rag_content_tsv` on `content_tsv` (GIN index for full-text search)
- `idx_rag_content_tsv_institution` on `content_tsv` (partial: WHERE institution_id IS NOT NULL)

**RLS Policies:**
- Service role has full access

**Full-Text Search:**
- `content_tsv` column uses English dictionary for stemming and stopword removal
- Supports BM25-style keyword search with `ts_rank_cd` scoring
- Hybrid search combines keyword and semantic results using Reciprocal Rank Fusion

---

### Agent Infrastructure

#### `agent_sessions`
Tracks AI agent execution sessions (document review, APS ranking, analytics, etc.).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Session ID |
| `institution_id` | UUID | FK → institutions | Institution context |
| `agent_type` | TEXT | NOT NULL | `document_reviewer`, `aps_ranking`, `reviewer_assistant`, `analytics`, `notification_sender` |
| `status` | TEXT | DEFAULT 'pending' | `pending`, `running`, `completed`, `failed`, `cancelled` |
| `input_context` | JSONB | DEFAULT '{}' | Agent input parameters |
| `output_result` | JSONB | DEFAULT '{}' | Agent output/results |
| `error_message` | TEXT | | Error details if failed |
| `target_type` | TEXT | | `application`, `course`, `batch`, `institution` |
| `target_ids` | UUID[] | DEFAULT '{}' | Array of target entity IDs |
| `total_items` | INTEGER | DEFAULT 0 | Total items to process |
| `processed_items` | INTEGER | DEFAULT 0 | Items processed so far |
| `started_at` | TIMESTAMPTZ | | Session start timestamp |
| `completed_at` | TIMESTAMPTZ | | Session completion timestamp |
| `initiated_by` | UUID | NOT NULL | User who triggered the agent |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_agent_sessions_institution` on `institution_id`
- `idx_agent_sessions_agent_type` on `agent_type`
- `idx_agent_sessions_status` on `status`
- `idx_agent_sessions_initiated_by` on `initiated_by`
- `idx_agent_sessions_created_at` on `created_at DESC`
- `idx_agent_sessions_target_type` on `target_type`

**RLS Policies:**
- Institution members can view sessions
- Institution staff (admin/reviewer) can create/update sessions
- Service role has full access

---

#### `agent_decisions`
Audit trail of decisions made by AI agents for transparency and review.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Decision ID |
| `session_id` | UUID | FK → agent_sessions | Parent session |
| `institution_id` | UUID | FK → institutions | Institution context |
| `decision_type` | TEXT | NOT NULL | `document_approved`, `document_flagged`, `document_rejected`, `aps_score_calculated`, `ranking_assigned`, `status_recommendation`, `notification_sent` |
| `target_type` | TEXT | NOT NULL | `document`, `application`, `applicant` |
| `target_id` | UUID | NOT NULL | Target entity ID |
| `decision_value` | JSONB | NOT NULL | Structured decision data |
| `confidence_score` | DECIMAL(3,2) | | Agent confidence (0.00-1.00) |
| `reasoning` | TEXT | | Agent's explanation |
| `reviewed_by` | UUID | | Staff member who reviewed |
| `reviewed_at` | TIMESTAMPTZ | | Review timestamp |
| `review_outcome` | TEXT | | `accepted`, `overridden`, `pending` |
| `override_reason` | TEXT | | Reason for override |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_agent_decisions_session` on `session_id`
- `idx_agent_decisions_institution` on `institution_id`
- `idx_agent_decisions_decision_type` on `decision_type`
- `idx_agent_decisions_target` on (`target_type`, `target_id`)
- `idx_agent_decisions_review_outcome` on `review_outcome` (partial: WHERE review_outcome IS NOT NULL)
- `idx_agent_decisions_created_at` on `created_at DESC`

**RLS Policies:**
- Institution members can view decisions
- Service role can create decisions
- Institution staff can review/update decisions
- Service role has full access

---

#### `saved_charts`
Archived analytics visualizations from the analytics agent.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Chart ID |
| `institution_id` | UUID | FK → institutions | Institution context |
| `title` | TEXT | NOT NULL | Chart title |
| `description` | TEXT | | Chart description |
| `chart_type` | TEXT | NOT NULL | `bar`, `line`, `pie`, `donut`, `area`, `scatter`, `heatmap`, `funnel`, `table` |
| `chart_config` | JSONB | NOT NULL | Recharts/D3 configuration JSON |
| `data_query` | TEXT | | SQL query that generated data |
| `filters` | JSONB | DEFAULT '{}' | Applied filters |
| `is_pinned` | BOOLEAN | DEFAULT FALSE | Pinned to dashboard |
| `display_order` | INTEGER | DEFAULT 0 | Display order |
| `generated_by_session` | UUID | FK → agent_sessions | Source agent session |
| `created_by` | UUID | NOT NULL | User who created/saved the chart |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_saved_charts_institution` on `institution_id`
- `idx_saved_charts_chart_type` on `chart_type`
- `idx_saved_charts_created_by` on `created_by`
- `idx_saved_charts_pinned` on `is_pinned` (partial: WHERE is_pinned = TRUE)

**RLS Policies:**
- Institution members can view charts
- Institution members can create charts
- Users can update own charts
- Admins can delete charts in their institution
- Service role has full access

---

### Notifications

#### `notification_logs`
Tracks all notification delivery attempts across channels (WhatsApp, SMS, email).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Log ID |
| `recipient` | TEXT | NOT NULL | Phone number or email address |
| `recipient_type` | TEXT | DEFAULT 'phone' | `phone` or `email` |
| `notification_type` | TEXT | NOT NULL | `otp`, `application_update`, `reminder`, `marketing` |
| `message_preview` | TEXT | | First 100 chars of message (debugging) |
| `priority` | TEXT | DEFAULT 'normal' | `high`, `normal`, `low` |
| `channel` | TEXT | NOT NULL | `whatsapp`, `sms`, `email` |
| `channel_priority` | INTEGER | DEFAULT 1 | 1 = primary attempt, 2+ = failover |
| `was_failover` | BOOLEAN | DEFAULT FALSE | Whether this was a failover attempt |
| `original_channel` | TEXT | | Original channel if failover occurred |
| `status` | TEXT | DEFAULT 'pending' | `pending`, `sent`, `delivered`, `failed`, `expired` |
| `provider_message_id` | TEXT | | Twilio SID, SendGrid message ID, etc. |
| `error_code` | TEXT | | Provider error code |
| `error_message` | TEXT | | Error message |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `sent_at` | TIMESTAMPTZ | | Sent timestamp |
| `delivered_at` | TIMESTAMPTZ | | Delivery confirmation timestamp |
| `failed_at` | TIMESTAMPTZ | | Failure timestamp |
| `estimated_cost_usd` | DECIMAL(10,6) | | Estimated cost in USD |
| `retry_count` | INTEGER | DEFAULT 0 | Number of retry attempts |
| `max_retries` | INTEGER | DEFAULT 3 | Maximum retry attempts |
| `next_retry_at` | TIMESTAMPTZ | | Next retry timestamp |
| `applicant_id` | UUID | FK → applicant_accounts | Associated applicant (nullable) |
| `metadata` | JSONB | DEFAULT '{}' | Additional context |

**Indexes:**
- `idx_notification_logs_recipient` on `recipient`
- `idx_notification_logs_created` on `created_at DESC`
- `idx_notification_logs_status` on `status`
- `idx_notification_logs_channel` on `channel`
- `idx_notification_logs_type` on `notification_type`
- `idx_notification_logs_retry_queue` on (`status`, `next_retry_at`) (partial: WHERE status = 'failed' AND retry_count < max_retries)
- `idx_notification_logs_delivery_analysis` on (`channel`, `status`, `created_at DESC`)

**RLS Policies:**
- Service role has full access

---

#### `notification_preferences`
Per-user notification channel preferences for routing decisions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PK | Preference ID |
| `identifier` | TEXT | UNIQUE, NOT NULL | Phone number or email address |
| `identifier_type` | TEXT | DEFAULT 'phone' | `phone` or `email` |
| `preferred_channel` | TEXT | DEFAULT 'whatsapp' | Preferred notification channel |
| `channel_priority` | JSONB | DEFAULT '{"whatsapp": 1, "sms": 2, "email": 3}' | Channel priority mapping |
| `whatsapp_available` | BOOLEAN | DEFAULT TRUE | WhatsApp availability |
| `whatsapp_opt_in` | BOOLEAN | DEFAULT TRUE | WhatsApp opt-in status |
| `whatsapp_last_delivery_status` | TEXT | | Last known WhatsApp delivery status |
| `sms_available` | BOOLEAN | DEFAULT TRUE | SMS availability |
| `sms_opt_in` | BOOLEAN | DEFAULT TRUE | SMS opt-in status |
| `email_address` | TEXT | | Email address (if different from identifier) |
| `email_opt_in` | BOOLEAN | DEFAULT TRUE | Email opt-in status |
| `quiet_hours_enabled` | BOOLEAN | DEFAULT FALSE | Quiet hours enabled |
| `quiet_hours_start` | TIME | DEFAULT '22:00' | Quiet hours start time |
| `quiet_hours_end` | TIME | DEFAULT '07:00' | Quiet hours end time |
| `timezone` | TEXT | DEFAULT 'Africa/Johannesburg' | User timezone |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |
| `applicant_id` | UUID | FK → applicant_accounts | Associated applicant |

**Indexes:**
- `idx_notification_preferences_identifier` on `identifier`
- `idx_notification_preferences_applicant` on `applicant_id`

**Triggers:**
- `trigger_update_notification_preferences_timestamp` → Auto-updates `updated_at`

**RLS Policies:**
- Service role has full access

---

### Materialized View Infrastructure

#### `refresh_queue`
Tracks refresh state for materialized views with demand-triggered updates.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `view_name` | TEXT | PK | Name of the materialized view |
| `requested_at` | TIMESTAMPTZ | | Timestamp when a refresh was last requested |
| `last_refreshed_at` | TIMESTAMPTZ | | Timestamp when the view was last successfully refreshed |
| `refresh_in_progress` | BOOLEAN | DEFAULT FALSE | Flag to prevent concurrent refresh operations |
| `refresh_started_at` | TIMESTAMPTZ | | Timestamp when current refresh started (for timeout detection) |
| `last_refresh_duration_ms` | INTEGER | | Duration of last refresh in milliseconds (for monitoring) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

**Source:** Migration `028_rankings_refresh_queue.sql`

**Usage:**
- Tracks whether materialized views need refreshing based on data changes
- Prevents concurrent refresh operations via `refresh_in_progress` flag
- Supports 5-minute timeout detection for stuck refreshes
- Records refresh duration for performance monitoring

**Grants:**
- `SELECT`: `authenticated`
- `ALL`: `service_role`

---

### Miscellaneous

#### `otp_codes`
OTP verification codes for authentication.

**Note:** This table structure is defined in migration `010_otp_codes.sql` but was not included in the complete schema migration.

---

## Materialized Views

### `application_rankings`
Pre-computed rankings for application choices based on APS scores.

**Source:** Migration `026_application_rankings_view.sql`

| Column | Type | Description |
|--------|------|-------------|
| `choice_id` | UUID | Application choice ID (unique) |
| `application_id` | UUID | Parent application ID |
| `course_id` | UUID | Target course ID |
| `priority` | INTEGER | Choice priority (1 or 2) |
| `choice_status` | TEXT | Choice status |
| `applicant_id` | UUID | Applicant user ID |
| `institution_id` | UUID | Institution ID |
| `aps_score` | NUMERIC | Extracted APS score from academic_info JSONB |
| `course_min_aps` | TEXT | Course minimum APS requirement |
| `course_name` | TEXT | Course name |
| `intake_limit` | TEXT | Course intake limit |
| `rank_position` | BIGINT | Rank position (ROW_NUMBER) within course |
| `recommendation` | TEXT | Auto-generated recommendation: `auto_accept_recommended`, `conditional_recommended`, `waitlist_recommended`, `rejection_flagged`, `manual_review` |

**Ranking Logic:**
- Orders by APS score (descending), then by choice creation date (ascending)
- Partitions by `course_id` for per-course rankings

**Recommendation Logic:**
- `auto_accept_recommended`: rank_position ≤ (intake_limit × 0.8)
- `conditional_recommended`: rank_position ≤ intake_limit
- `waitlist_recommended`: rank_position ≤ (intake_limit × 1.5)
- `rejection_flagged`: rank_position > (intake_limit × 1.5)
- `manual_review`: intake_limit is NULL

**Indexes:**
- `idx_app_rankings_choice_id` (UNIQUE) on `choice_id`
- `idx_app_rankings_course` on (`course_id`, `rank_position`)
- `idx_app_rankings_recommendation` on `recommendation`

**Refresh Function:**
```sql
SELECT public.refresh_application_rankings(p_course_id UUID DEFAULT NULL);
```

**Grants:**
- `SELECT` on view: `authenticated`
- `EXECUTE` on refresh function: `authenticated`

---

### `notification_cost_summary`
Daily aggregated view of notification costs and delivery rates by channel.

**Source:** Migration `028_notification_logs.sql`

| Column | Type | Description |
|--------|------|-------------|
| `date` | TIMESTAMPTZ | Date (truncated to day) |
| `channel` | TEXT | Notification channel |
| `notification_type` | TEXT | Notification type |
| `total_sent` | BIGINT | Total notifications sent |
| `delivered` | BIGINT | Successfully delivered notifications |
| `failed` | BIGINT | Failed notifications |
| `total_cost_usd` | NUMERIC | Total estimated cost in USD |
| `avg_cost_per_notification` | NUMERIC | Average cost per notification |
| `delivery_rate_pct` | NUMERIC | Delivery rate percentage |

**Cost Estimates:**
- WhatsApp: $0.005 per message
- SMS: $0.04 per message
- Email: $0.001 per message

---

### `rag_search_stats`
Monitoring view for full-text search coverage and indexing status.

**Source:** Migration `030_fulltext_search.sql`

| Column | Type | Description |
|--------|------|-------------|
| `total_embeddings` | BIGINT | Total RAG embeddings |
| `indexed_for_fts` | BIGINT | Embeddings indexed for full-text search |
| `unique_sources` | BIGINT | Unique sources count |
| `unique_institutions` | BIGINT | Unique institutions count |
| `avg_terms_per_doc` | NUMERIC | Average terms per document |

---

## Functions & Stored Procedures

### Authentication & Users

#### `sync_clerk_user`
Syncs user data from Clerk webhook or API call.

```sql
public.sync_clerk_user(
  p_clerk_user_id TEXT,
  p_email TEXT,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
) RETURNS UUID
```

**Usage:** Upserts user record based on `clerk_user_id`. Returns internal user ID.

---

#### `get_current_user_id`
Gets Supabase user ID from Clerk JWT `sub` claim.

```sql
public.get_current_user_id() RETURNS UUID
```

**Usage:** Extracts `sub` claim from `auth.jwt()` and looks up user ID.

---

#### `get_current_clerk_user_id`
Gets Clerk user ID directly from JWT.

```sql
public.get_current_clerk_user_id() RETURNS TEXT
```

**Usage:** Returns `auth.jwt() ->> 'sub'`.

---

### Institution Management

#### `get_user_institutions`
Gets all institutions user is a member of.

```sql
public.get_user_institutions()
RETURNS TABLE(institution_id UUID, role TEXT)
```

**Usage:** Returns institution IDs and roles for current user.

---

#### `user_has_role`
Checks if user has specific role in institution.

```sql
public.user_has_role(
  p_institution_id UUID,
  p_required_role TEXT
) RETURNS BOOLEAN
```

**Usage:** Returns `TRUE` if user has the specified role in the institution.

---

#### `assign_creator_as_admin`
Trigger function to automatically assign institution creator as admin.

```sql
public.assign_creator_as_admin() RETURNS TRIGGER
```

**Usage:** Fired AFTER INSERT on `institutions` table. Creates `institution_members` record with `role = 'admin'`.

---

### RAG & Embeddings

#### `match_rag_embeddings`
Vector similarity search for RAG using cosine distance.

```sql
public.match_rag_embeddings(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_institution_id UUID DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  source TEXT,
  chunk TEXT,
  metadata JSONB,
  similarity FLOAT
)
```

**Usage:** Finds embeddings similar to `query_embedding` using cosine similarity. Filters by institution if provided.

---

#### `policy_keyword_search`
BM25-style keyword search using PostgreSQL full-text search.

```sql
public.policy_keyword_search(
  search_query TEXT,
  max_results INT DEFAULT 5,
  filter_institution_id UUID DEFAULT NULL,
  filter_source TEXT DEFAULT NULL
) RETURNS TABLE(
  id UUID,
  chunk TEXT,
  source TEXT,
  metadata JSONB,
  rank FLOAT,
  headline TEXT
)
```

**Usage:** Uses `ts_rank_cd` for cover density ranking. Returns highlighted headlines with matched terms.

**Target Latency:** <100ms

---

#### `policy_hybrid_search`
Combines keyword (BM25) and semantic (cosine) search using Reciprocal Rank Fusion.

```sql
public.policy_hybrid_search(
  search_query TEXT,
  query_embedding vector(1536),
  max_results INT DEFAULT 5,
  filter_institution_id UUID DEFAULT NULL,
  keyword_weight FLOAT DEFAULT 0.5,
  semantic_weight FLOAT DEFAULT 0.5
) RETURNS TABLE(
  id UUID,
  chunk TEXT,
  source TEXT,
  metadata JSONB,
  combined_score FLOAT,
  keyword_rank FLOAT,
  semantic_similarity FLOAT
)
```

**Usage:** Merges results from keyword and semantic search using RRF (k=60). Adjustable weights for each search type.

---

### Applications

#### `get_application_choices_summary`
Gets detailed choice information with course and institution names.

```sql
public.get_application_choices_summary(p_application_id UUID)
RETURNS TABLE (
  choice_id UUID,
  priority INTEGER,
  course_name TEXT,
  course_code TEXT,
  institution_name TEXT,
  faculty_name TEXT,
  campus_name TEXT,
  status TEXT,
  status_reason TEXT,
  reviewed_at TIMESTAMPTZ
)
```

**Usage:** Retrieves application choices with joined course/institution/faculty/campus names.

---

#### `extract_aps_score`
Helper function to extract APS score from JSONB academic_info.

```sql
public.extract_aps_score(academic_info JSONB) RETURNS NUMERIC
```

**Usage:** Tries `academic_info->>'aps_score'` and `academic_info->>'total_aps'`, defaults to 0.

**Immutability:** `IMMUTABLE` function (can be used in indexes/materialized views).

---

#### `refresh_application_rankings`
Refreshes the `application_rankings` materialized view.

```sql
public.refresh_application_rankings(p_course_id UUID DEFAULT NULL) RETURNS void
```

**Usage:** Runs `REFRESH MATERIALIZED VIEW CONCURRENTLY`. Course ID parameter is reserved for future partial refresh support.

---

### Rankings Refresh Queue Functions

#### `request_rankings_refresh`
Request a refresh of the application_rankings materialized view.

```sql
public.request_rankings_refresh() RETURNS void
```

**Usage:** Inserts/updates a refresh request in `refresh_queue`. Called automatically by the `trg_rankings_refresh` trigger on `application_choices`.

---

#### `trigger_rankings_refresh`
Trigger function to request rankings refresh on data changes.

```sql
public.trigger_rankings_refresh() RETURNS trigger
```

**Usage:** Fired AFTER INSERT/UPDATE/DELETE on `application_choices` table. Calls `request_rankings_refresh()` for batch refresh requests.

---

#### `should_refresh_rankings`
Check if application_rankings view needs refresh based on pending requests.

```sql
public.should_refresh_rankings() RETURNS BOOLEAN
```

**Usage:** Returns `TRUE` if:
- A refresh was requested after the last refresh completed
- No refresh is currently in progress (or the current refresh has timed out after 5 minutes)

---

#### `get_rankings_refresh_status`
Get current refresh status for monitoring dashboards.

```sql
public.get_rankings_refresh_status()
RETURNS TABLE (
  view_name TEXT,
  last_refreshed_at TIMESTAMPTZ,
  requested_at TIMESTAMPTZ,
  refresh_in_progress BOOLEAN,
  is_stale BOOLEAN,
  staleness_seconds INTEGER,
  last_refresh_duration_ms INTEGER
)
```

**Usage:** Returns comprehensive status information for the rankings view. Used by Python tools to check staleness before queries.

---

#### `execute_rankings_refresh`
Execute a refresh of application_rankings with locking and timing.

```sql
public.execute_rankings_refresh()
RETURNS TABLE (
  success BOOLEAN,
  duration_ms INTEGER,
  message TEXT
)
```

**Usage:** Performs the actual refresh with:
- Optimistic locking to prevent concurrent refreshes
- Automatic timeout handling (5-minute stuck refresh detection)
- Timing metrics for performance monitoring
- Error handling with proper lock release

**Performance Target:** <60 seconds for typical datasets

---

### Utility Functions

#### `update_updated_at_column`
Trigger function to auto-update `updated_at` timestamps.

```sql
public.update_updated_at_column() RETURNS TRIGGER
```

**Usage:** Fired BEFORE UPDATE on tables with `updated_at` column. Sets `NEW.updated_at = NOW()`.

---

#### `update_notification_preferences_timestamp`
Trigger function to auto-update `updated_at` on `notification_preferences`.

```sql
public.update_notification_preferences_timestamp() RETURNS TRIGGER
```

**Usage:** Fired BEFORE UPDATE on `notification_preferences` table.

---

## Entity Relationship Summary

### Core Relationships

```
users (Clerk auth)
  ├─→ institutions (created_by)
  └─→ institution_members (user_id)

institutions
  ├─→ campuses (institution_id)
  ├─→ faculties (institution_id)
  ├─→ courses (institution_id)
  ├─→ institution_members (institution_id)
  ├─→ applications (institution_id) [multi-tenant]
  ├─→ rag_embeddings (institution_id) [multi-tenant]
  ├─→ agent_sessions (institution_id)
  └─→ saved_charts (institution_id)

applications
  ├─→ application_choices (application_id)
  ├─→ application_documents (application_id)
  └─→ application_notes (application_id)

application_choices
  ├─→ courses (course_id)
  ├─→ institutions (institution_id)
  ├─→ faculties (faculty_id)
  └─→ campuses (campus_id)

agent_sessions
  ├─→ agent_decisions (session_id)
  └─→ saved_charts (generated_by_session)

user_accounts (legacy CrewAI)
  ├─→ user_sessions (user_id)
  ├─→ applications (user_id)
  └─→ nsfas_applications (user_id)

nsfas_applications
  └─→ nsfas_documents (nsfas_application_id)

applicant_accounts (renamed from user_accounts)
  ├─→ notification_logs (applicant_id)
  └─→ notification_preferences (applicant_id)
```

---

## Indexing Strategy

### Index Types

1. **B-Tree Indexes** (default)
   - Primary keys (automatic)
   - Foreign keys for join performance
   - Frequently filtered columns (status, type, etc.)
   - Timestamp columns for range queries

2. **GIN Indexes** (Generalized Inverted Index)
   - Full-text search on `content_tsv` columns
   - JSONB columns (future optimization)

3. **IVFFlat Indexes** (pgvector)
   - Vector embeddings for approximate nearest neighbor search

### Composite Indexes

**Multi-column indexes for common query patterns:**

- `idx_application_choices_institution_status` on (`institution_id`, `status`)
- `idx_application_choices_course_status` on (`course_id`, `status`)
- `idx_app_rankings_course` on (`course_id`, `rank_position`)
- `idx_notification_logs_delivery_analysis` on (`channel`, `status`, `created_at DESC`)

### Partial Indexes

**Indexes on filtered subsets:**

- `idx_application_choices_reviewed_by` WHERE `reviewed_by IS NOT NULL`
- `idx_saved_charts_pinned` WHERE `is_pinned = TRUE`
- `idx_notification_logs_retry_queue` WHERE `status = 'failed' AND retry_count < max_retries`
- `idx_agent_decisions_review_outcome` WHERE `review_outcome IS NOT NULL`

### Performance Targets

- **Vector Search:** <100ms for k=5 nearest neighbors (IVFFlat with lists=100)
- **Full-Text Search:** <100ms for BM25 keyword search (GIN index)
- **Hybrid Search:** <200ms for combined semantic + keyword search
- **Application Lookups:** <50ms for single institution's applications (B-tree on institution_id)
- **Ranking Refresh:** <60s for materialized view concurrent refresh
- **Comparative Analysis (Materialized View):** P95 <50ms (from 800ms with N+1 queries)
- **Rankings View Lookup:** <50ms for single applicant ranking from materialized view

---

## Notes

### Multi-Tenant Architecture

The schema supports multi-tenant isolation via:

1. **Institution-scoped foreign keys** on all major tables
2. **Row-Level Security (RLS)** policies enforcing institution membership
3. **JWT-based user identification** via Clerk `sub` claim
4. **Service role bypass** for backend tools and CrewAI agents

### Legacy Schema Compatibility

The schema maintains backward compatibility with the original CrewAI backend:

- `user_accounts` table (now `applicant_accounts`) for legacy user IDs
- `user_sessions` table for OTP-based authentication
- TEXT fields (`university_name`, `faculty`, `program`) alongside new foreign keys
- `source` TEXT column in `rag_embeddings` alongside `institution_id`

### Future Enhancements

Planned schema improvements (see `docs/architecture.md`):

1. **Dynamic agent prompts** stored in database per institution
2. **Evaluation criteria** as configurable JSONB per course
3. **Webhook subscriptions** for SIS integration
4. **Payment tracking** for application fees
5. **Document versioning** with audit trail

---

**End of Schema Reference**
