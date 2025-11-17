┌──────────────────────────┐
│      user_accounts        │
├──────────────────────────┤
│ id (PK)                  │
│ username                 │
│ email                    │
│ cellphone                │
│ created_at               │
│ updated_at               │
└───────────────┬──────────┘
                │ 1
                │
                │ N
┌───────────────▼──────────┐
│      user_sessions        │
├───────────────────────────┤
│ id (PK)                   │
│ user_id (FK→user_accounts)│
│ session_token             │
│ expires_at                │
│ created_at                │
└───────────────────────────┘


┌──────────────────────────┐
│       applications        │
├──────────────────────────┤
│ id (PK)                  │
│ user_id (FK→users)       │
│ university_name          │
│ faculty                  │
│ qualification_type       │
│ program                  │
│ year                     │
│ personal_info (JSON)     │
│ academic_info (JSON)     │
│ rag_summary (JSON)       │
│ submission_payload (JSON)│
│ status                   │
│ status_history (JSON)    │
│ created_at               │
│ updated_at               │
└───────────────┬──────────┘
                │ 1
                │
                │ N
┌───────────────▼──────────┐
│   application_documents   │
├──────────────────────────┤
│ id (PK)                  │
│ application_id (FK→app)  │
│ file_url                 │
│ document_type            │
│ uploaded_at              │
└──────────────────────────┘



┌───────────────────────────┐
│     nsfas_applications    │
├───────────────────────────┤
│ id (PK)                   │
│ user_id (FK→users)        │
│ personal_info (JSON)      │
│ academic_info (JSON)      │
│ guardian_info (JSON)      │
│ household_info (JSON)     │
│ income_info (JSON)        │
│ bank_details (JSON)       │
│ living_situation          │
│ status                    │
│ status_history (JSON)     │
│ submission_payload (JSON) │
│ created_at                │
│ updated_at                │
└───────────────┬───────────┘
                │ 1
                │
                │ N
┌───────────────▼───────────┐
│      nsfas_documents       │
├────────────────────────────┤
│ id (PK)                    │
│ nsfas_application_id (FK)  │
│ file_url                   │
│ document_type              │
│ uploaded_at                │
└────────────────────────────┘


┌───────────────────────────┐
│      rag_embeddings        │
├───────────────────────────┤
│ id (PK)                   │
│ embedding (vector 1536)   │
│ metadata (JSON)           │
│ source (university name)  │
│ chunk (raw text)          │
│ created_at                │
└───────────────────────────┘
