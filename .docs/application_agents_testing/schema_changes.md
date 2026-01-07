# Schema Changes for Application Agents Testing

This document details the database migrations required to support the application agents testing framework.

---

## Overview

The following schema changes are needed to support:
1. Student number generation and storage
2. Institution-specific student number formats
3. First/second choice course fields
4. WhatsApp integration fields
5. NSFAS-specific data fields

---

## Migration 1: Student Number Fields

### Purpose
Add student number fields to `applicant_accounts` table for institution-specific student identification.

### Migration Name
`add_student_number_fields_to_applicant_accounts`

### SQL

```sql
-- Migration: add_student_number_fields_to_applicant_accounts
-- Description: Adds student number fields for multi-institution applications

-- Add student_numbers JSONB column to store institution-specific student numbers
ALTER TABLE applicant_accounts
ADD COLUMN IF NOT EXISTS student_numbers JSONB DEFAULT '{}';

-- Add primary student number (first institution applied to)
ALTER TABLE applicant_accounts
ADD COLUMN IF NOT EXISTS primary_student_number VARCHAR(20);

-- Add student number generation timestamp
ALTER TABLE applicant_accounts
ADD COLUMN IF NOT EXISTS student_number_generated_at TIMESTAMPTZ;

-- Create index for student number lookups
CREATE INDEX IF NOT EXISTS idx_applicant_student_numbers
ON applicant_accounts USING GIN (student_numbers);

-- Create unique index for primary student number
CREATE UNIQUE INDEX IF NOT EXISTS idx_applicant_primary_student_number
ON applicant_accounts (primary_student_number)
WHERE primary_student_number IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN applicant_accounts.student_numbers IS
'JSONB object mapping institution_code to student_number, e.g., {"UP": "u24012345", "UCT": "SMITH12345"}';

COMMENT ON COLUMN applicant_accounts.primary_student_number IS
'The student number from the first institution the applicant applied to';
```

### Rollback

```sql
-- Rollback: add_student_number_fields_to_applicant_accounts

DROP INDEX IF EXISTS idx_applicant_primary_student_number;
DROP INDEX IF EXISTS idx_applicant_student_numbers;
ALTER TABLE applicant_accounts DROP COLUMN IF EXISTS student_number_generated_at;
ALTER TABLE applicant_accounts DROP COLUMN IF EXISTS primary_student_number;
ALTER TABLE applicant_accounts DROP COLUMN IF EXISTS student_numbers;
```

---

## Migration 2: Institution Student Number Formats

### Purpose
Create a reference table for institution-specific student number formats and generation rules.

### Migration Name
`create_institution_student_number_formats`

### SQL

```sql
-- Migration: create_institution_student_number_formats
-- Description: Reference table for student number formats per institution

CREATE TABLE IF NOT EXISTS institution_student_number_formats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    institution_code VARCHAR(10) NOT NULL,
    format_pattern VARCHAR(100) NOT NULL,
    format_regex VARCHAR(200) NOT NULL,
    prefix VARCHAR(10),
    suffix VARCHAR(10),
    year_position VARCHAR(20) DEFAULT 'start',
    year_format VARCHAR(10) DEFAULT 'YY',
    sequence_length INTEGER NOT NULL DEFAULT 6,
    sequence_start INTEGER NOT NULL DEFAULT 1,
    current_sequence INTEGER NOT NULL DEFAULT 1,
    example VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint on institution
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_institution_format
ON institution_student_number_formats (institution_id)
WHERE is_active = true;

-- Create index on institution code
CREATE INDEX IF NOT EXISTS idx_institution_code_format
ON institution_student_number_formats (institution_code);

-- Insert default formats for major institutions
INSERT INTO institution_student_number_formats
(institution_code, format_pattern, format_regex, prefix, year_format, sequence_length, example, description, institution_id)
VALUES
('UP', 'u{YY}{SEQUENCE}', '^u\d{8}$', 'u', 'YY', 6, 'u24012345', 'University of Pretoria format',
    (SELECT id FROM institutions WHERE code = 'UP' LIMIT 1)),
('UCT', '{SURNAME}{SEQUENCE}', '^[A-Z]+\d{5}$', NULL, NULL, 5, 'SMITH12345', 'UCT format with surname prefix',
    (SELECT id FROM institutions WHERE code = 'UCT' LIMIT 1)),
('WITS', '{YY}{SEQUENCE}', '^\d{8}$', NULL, 'YY', 6, '24012345', 'Wits format',
    (SELECT id FROM institutions WHERE code = 'WITS' LIMIT 1)),
('UKZN', '{YYYY}{SEQUENCE}', '^\d{11}$', NULL, 'YYYY', 7, '20240012345', 'UKZN format',
    (SELECT id FROM institutions WHERE code = 'UKZN' LIMIT 1)),
('UJ', '{YYYY}{SEQUENCE}', '^\d{10}$', NULL, 'YYYY', 6, '2024012345', 'UJ format',
    (SELECT id FROM institutions WHERE code = 'UJ' LIMIT 1)),
('SU', '{YY}{SEQUENCE}', '^\d{8}$', NULL, 'YY', 6, '24012345', 'Stellenbosch format',
    (SELECT id FROM institutions WHERE code = 'SU' LIMIT 1)),
('UNISA', '{SEQUENCE}', '^\d{8}$', NULL, NULL, 8, '12345678', 'UNISA format',
    (SELECT id FROM institutions WHERE code = 'UNISA' LIMIT 1)),
('NWU', '{YY}{SEQUENCE}', '^\d{7}$', NULL, 'YY', 5, '2401234', 'NWU format',
    (SELECT id FROM institutions WHERE code = 'NWU' LIMIT 1)),
('UFS', '{YYYY}{SEQUENCE}', '^\d{11}$', NULL, 'YYYY', 7, '20240012345', 'UFS format',
    (SELECT id FROM institutions WHERE code = 'UFS' LIMIT 1)),
('TUT', '{YY}{SEQUENCE}', '^\d{8}$', NULL, 'YY', 6, '24012345', 'TUT format',
    (SELECT id FROM institutions WHERE code = 'TUT' LIMIT 1))
ON CONFLICT DO NOTHING;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_student_number_format_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_student_number_format_timestamp
    BEFORE UPDATE ON institution_student_number_formats
    FOR EACH ROW
    EXECUTE FUNCTION update_student_number_format_timestamp();

-- Add comment
COMMENT ON TABLE institution_student_number_formats IS
'Reference table for institution-specific student number generation formats';
```

### Rollback

```sql
-- Rollback: create_institution_student_number_formats

DROP TRIGGER IF EXISTS trigger_update_student_number_format_timestamp ON institution_student_number_formats;
DROP FUNCTION IF EXISTS update_student_number_format_timestamp();
DROP TABLE IF EXISTS institution_student_number_formats;
```

---

## Migration 3: First/Second Choice Course Fields

### Purpose
Add first and second choice course fields to the applications table.

### Migration Name
`add_course_choice_fields_to_applications`

### SQL

```sql
-- Migration: add_course_choice_fields_to_applications
-- Description: Adds first and second choice course fields

-- Add first choice fields
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS first_choice_programme_id UUID REFERENCES programmes(id),
ADD COLUMN IF NOT EXISTS first_choice_programme_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS first_choice_programme_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS first_choice_eligibility VARCHAR(20) CHECK (first_choice_eligibility IN ('eligible', 'borderline', 'ineligible', 'pending'));

-- Add second choice fields
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS second_choice_programme_id UUID REFERENCES programmes(id),
ADD COLUMN IF NOT EXISTS second_choice_programme_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS second_choice_programme_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS second_choice_eligibility VARCHAR(20) CHECK (second_choice_eligibility IN ('eligible', 'borderline', 'ineligible', 'pending'));

-- Add APS score field
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS aps_score INTEGER CHECK (aps_score >= 0 AND aps_score <= 42);

-- Add subject marks JSONB field
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS subject_marks JSONB DEFAULT '[]';

-- Add eligibility check timestamp
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS eligibility_checked_at TIMESTAMPTZ;

-- Create indexes for course lookups
CREATE INDEX IF NOT EXISTS idx_applications_first_choice
ON applications (first_choice_programme_id);

CREATE INDEX IF NOT EXISTS idx_applications_second_choice
ON applications (second_choice_programme_id);

CREATE INDEX IF NOT EXISTS idx_applications_aps_score
ON applications (aps_score);

-- Add comments
COMMENT ON COLUMN applications.first_choice_programme_id IS 'Reference to the primary programme choice';
COMMENT ON COLUMN applications.second_choice_programme_id IS 'Reference to the backup programme choice';
COMMENT ON COLUMN applications.aps_score IS 'Calculated Admission Point Score (0-42)';
COMMENT ON COLUMN applications.subject_marks IS 'JSONB array of subject names and marks';
```

### Rollback

```sql
-- Rollback: add_course_choice_fields_to_applications

DROP INDEX IF EXISTS idx_applications_aps_score;
DROP INDEX IF EXISTS idx_applications_second_choice;
DROP INDEX IF EXISTS idx_applications_first_choice;

ALTER TABLE applications
DROP COLUMN IF EXISTS eligibility_checked_at,
DROP COLUMN IF EXISTS subject_marks,
DROP COLUMN IF EXISTS aps_score,
DROP COLUMN IF EXISTS second_choice_eligibility,
DROP COLUMN IF EXISTS second_choice_programme_name,
DROP COLUMN IF EXISTS second_choice_programme_code,
DROP COLUMN IF EXISTS second_choice_programme_id,
DROP COLUMN IF EXISTS first_choice_eligibility,
DROP COLUMN IF EXISTS first_choice_programme_name,
DROP COLUMN IF EXISTS first_choice_programme_code,
DROP COLUMN IF EXISTS first_choice_programme_id;
```

---

## Migration 4: WhatsApp Integration Fields

### Purpose
Add WhatsApp-specific fields to `applicant_accounts` for messaging integration.

### Migration Name
`add_whatsapp_fields_to_applicant_accounts`

### SQL

```sql
-- Migration: add_whatsapp_fields_to_applicant_accounts
-- Description: Adds WhatsApp integration fields

-- Add WhatsApp number field (may differ from primary phone)
ALTER TABLE applicant_accounts
ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20);

-- Add WhatsApp verification status
ALTER TABLE applicant_accounts
ADD COLUMN IF NOT EXISTS whatsapp_verified BOOLEAN DEFAULT false;

-- Add WhatsApp verification timestamp
ALTER TABLE applicant_accounts
ADD COLUMN IF NOT EXISTS whatsapp_verified_at TIMESTAMPTZ;

-- Add WhatsApp opt-in status
ALTER TABLE applicant_accounts
ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN DEFAULT true;

-- Add WhatsApp conversation ID (Twilio)
ALTER TABLE applicant_accounts
ADD COLUMN IF NOT EXISTS whatsapp_conversation_id VARCHAR(100);

-- Add last WhatsApp message timestamp
ALTER TABLE applicant_accounts
ADD COLUMN IF NOT EXISTS last_whatsapp_message_at TIMESTAMPTZ;

-- Add OTP fields
ALTER TABLE applicant_accounts
ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6),
ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS otp_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS otp_locked_until TIMESTAMPTZ;

-- Create index for WhatsApp lookups
CREATE INDEX IF NOT EXISTS idx_applicant_whatsapp_number
ON applicant_accounts (whatsapp_number)
WHERE whatsapp_number IS NOT NULL;

-- Create index for conversation lookups
CREATE INDEX IF NOT EXISTS idx_applicant_whatsapp_conversation
ON applicant_accounts (whatsapp_conversation_id)
WHERE whatsapp_conversation_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN applicant_accounts.whatsapp_number IS 'WhatsApp number in E.164 format, e.g., +27821234567';
COMMENT ON COLUMN applicant_accounts.whatsapp_conversation_id IS 'Twilio conversation SID for tracking';
COMMENT ON COLUMN applicant_accounts.otp_code IS 'Current 6-digit OTP (hashed in production)';
COMMENT ON COLUMN applicant_accounts.otp_locked_until IS 'OTP locked until this timestamp after 3 failed attempts';
```

### Rollback

```sql
-- Rollback: add_whatsapp_fields_to_applicant_accounts

DROP INDEX IF EXISTS idx_applicant_whatsapp_conversation;
DROP INDEX IF EXISTS idx_applicant_whatsapp_number;

ALTER TABLE applicant_accounts
DROP COLUMN IF EXISTS otp_locked_until,
DROP COLUMN IF EXISTS otp_attempts,
DROP COLUMN IF EXISTS otp_expires_at,
DROP COLUMN IF EXISTS otp_code,
DROP COLUMN IF EXISTS last_whatsapp_message_at,
DROP COLUMN IF EXISTS whatsapp_conversation_id,
DROP COLUMN IF EXISTS whatsapp_opt_in,
DROP COLUMN IF EXISTS whatsapp_verified_at,
DROP COLUMN IF EXISTS whatsapp_verified,
DROP COLUMN IF EXISTS whatsapp_number;
```

---

## Migration 5: NSFAS Application Fields

### Purpose
Add NSFAS-specific fields for funding application tracking.

### Migration Name
`add_nsfas_fields_to_applicant_accounts`

### SQL

```sql
-- Migration: add_nsfas_fields_to_applicant_accounts
-- Description: Adds NSFAS funding application fields

-- Add NSFAS eligibility status
ALTER TABLE applicant_accounts
ADD COLUMN IF NOT EXISTS nsfas_eligible BOOLEAN;

-- Add NSFAS application status
ALTER TABLE applicant_accounts
ADD COLUMN IF NOT EXISTS nsfas_application_status VARCHAR(30) CHECK (nsfas_application_status IN (
    'not_started', 'in_progress', 'submitted', 'approved', 'rejected', 'pending_docs', 'skipped'
));

-- Add household income (for eligibility check)
ALTER TABLE applicant_accounts
ADD COLUMN IF NOT EXISTS household_income_bracket VARCHAR(30) CHECK (household_income_bracket IN (
    'below_100k', '100k_200k', '200k_350k', '350k_600k', 'above_600k', 'not_specified'
));

-- Add SASSA grant status
ALTER TABLE applicant_accounts
ADD COLUMN IF NOT EXISTS sassa_grant_recipient BOOLEAN DEFAULT false;

-- Add SASSA grant types (JSONB array)
ALTER TABLE applicant_accounts
ADD COLUMN IF NOT EXISTS sassa_grant_types JSONB DEFAULT '[]';

-- Add disability grant status
ALTER TABLE applicant_accounts
ADD COLUMN IF NOT EXISTS disability_grant_recipient BOOLEAN DEFAULT false;

-- Add NSFAS reference number
ALTER TABLE applicant_accounts
ADD COLUMN IF NOT EXISTS nsfas_reference_number VARCHAR(50);

-- Add NSFAS application timestamp
ALTER TABLE applicant_accounts
ADD COLUMN IF NOT EXISTS nsfas_applied_at TIMESTAMPTZ;

-- Add NSFAS skip reason (for non-eligible applicants)
ALTER TABLE applicant_accounts
ADD COLUMN IF NOT EXISTS nsfas_skip_reason VARCHAR(50) CHECK (nsfas_skip_reason IN (
    'postgraduate', 'international', 'income_exceeded', 'already_funded', 'user_declined'
));

-- Create index for NSFAS status lookups
CREATE INDEX IF NOT EXISTS idx_applicant_nsfas_status
ON applicant_accounts (nsfas_application_status)
WHERE nsfas_application_status IS NOT NULL;

-- Add comments
COMMENT ON COLUMN applicant_accounts.nsfas_eligible IS 'Calculated NSFAS eligibility based on income and citizenship';
COMMENT ON COLUMN applicant_accounts.household_income_bracket IS 'Annual household income bracket for NSFAS eligibility';
COMMENT ON COLUMN applicant_accounts.sassa_grant_types IS 'Array of SASSA grant types, e.g., ["child_support", "old_age_pension"]';
COMMENT ON COLUMN applicant_accounts.nsfas_skip_reason IS 'Reason for skipping NSFAS application';
```

### Rollback

```sql
-- Rollback: add_nsfas_fields_to_applicant_accounts

DROP INDEX IF EXISTS idx_applicant_nsfas_status;

ALTER TABLE applicant_accounts
DROP COLUMN IF EXISTS nsfas_skip_reason,
DROP COLUMN IF EXISTS nsfas_applied_at,
DROP COLUMN IF EXISTS nsfas_reference_number,
DROP COLUMN IF EXISTS disability_grant_recipient,
DROP COLUMN IF EXISTS sassa_grant_types,
DROP COLUMN IF EXISTS sassa_grant_recipient,
DROP COLUMN IF EXISTS household_income_bracket,
DROP COLUMN IF EXISTS nsfas_application_status,
DROP COLUMN IF EXISTS nsfas_eligible;
```

---

## Migration Execution Order

Execute migrations in this order:

1. `add_student_number_fields_to_applicant_accounts`
2. `create_institution_student_number_formats`
3. `add_course_choice_fields_to_applications`
4. `add_whatsapp_fields_to_applicant_accounts`
5. `add_nsfas_fields_to_applicant_accounts`

---

## Type Definitions (TypeScript)

After migrations, regenerate TypeScript types:

```bash
pnpm supabase gen types typescript --project-id $PROJECT_ID > apps/dashboard/lib/database.types.ts
```

### Expected New Types

```typescript
interface ApplicantAccount {
  // Existing fields...

  // Student number fields
  student_numbers: Record<string, string>;
  primary_student_number: string | null;
  student_number_generated_at: string | null;

  // WhatsApp fields
  whatsapp_number: string | null;
  whatsapp_verified: boolean;
  whatsapp_verified_at: string | null;
  whatsapp_opt_in: boolean;
  whatsapp_conversation_id: string | null;
  last_whatsapp_message_at: string | null;
  otp_code: string | null;
  otp_expires_at: string | null;
  otp_attempts: number;
  otp_locked_until: string | null;

  // NSFAS fields
  nsfas_eligible: boolean | null;
  nsfas_application_status: NsfasStatus | null;
  household_income_bracket: IncomeBracket | null;
  sassa_grant_recipient: boolean;
  sassa_grant_types: string[];
  disability_grant_recipient: boolean;
  nsfas_reference_number: string | null;
  nsfas_applied_at: string | null;
  nsfas_skip_reason: NsfasSkipReason | null;
}

interface Application {
  // Existing fields...

  // Course choice fields
  first_choice_programme_id: string | null;
  first_choice_programme_code: string | null;
  first_choice_programme_name: string | null;
  first_choice_eligibility: EligibilityStatus | null;
  second_choice_programme_id: string | null;
  second_choice_programme_code: string | null;
  second_choice_programme_name: string | null;
  second_choice_eligibility: EligibilityStatus | null;
  aps_score: number | null;
  subject_marks: SubjectMark[];
  eligibility_checked_at: string | null;
}

type NsfasStatus = 'not_started' | 'in_progress' | 'submitted' | 'approved' | 'rejected' | 'pending_docs' | 'skipped';
type IncomeBracket = 'below_100k' | '100k_200k' | '200k_350k' | '350k_600k' | 'above_600k' | 'not_specified';
type NsfasSkipReason = 'postgraduate' | 'international' | 'income_exceeded' | 'already_funded' | 'user_declined';
type EligibilityStatus = 'eligible' | 'borderline' | 'ineligible' | 'pending';

interface SubjectMark {
  subject: string;
  mark: number;
  level?: 'HL' | 'FAL' | 'SAL';
  aps_points: number;
}
```

---

## RLS Policies

Ensure appropriate RLS policies are added:

```sql
-- Enable RLS on new table
ALTER TABLE institution_student_number_formats ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated users
CREATE POLICY "Allow read access to student number formats"
ON institution_student_number_formats
FOR SELECT
TO authenticated
USING (true);

-- Allow insert/update only for admin users
CREATE POLICY "Allow admin write access to student number formats"
ON institution_student_number_formats
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('admin', 'super_admin')
    )
);
```

---

## Testing Checklist

- [ ] All migrations execute without errors
- [ ] Rollbacks work correctly
- [ ] Indexes created properly
- [ ] Foreign key constraints valid
- [ ] RLS policies applied
- [ ] TypeScript types regenerated
- [ ] API functions updated
- [ ] Agent tools updated to use new fields
