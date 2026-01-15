-- Migration: 016_student_numbers
-- Description: Dual student number system - platform-wide and institution-specific
-- Created: 2026-01-13

-- ============================================================================
-- PLATFORM STUDENT NUMBER SEQUENCE
-- ============================================================================
-- Sequence for generating platform-wide unique student numbers
CREATE SEQUENCE IF NOT EXISTS public.platform_student_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- ============================================================================
-- INSTITUTION STUDENT NUMBER FORMATS TABLE
-- ============================================================================
-- Stores the student number format configuration for each institution
CREATE TABLE IF NOT EXISTS public.institution_student_number_formats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Institution relationship
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,

    -- Institution code (e.g., 'UP', 'UCT', 'WITS')
    institution_code TEXT NOT NULL UNIQUE,

    -- Format pattern (human-readable description)
    -- e.g., 'u{YY}{NNNNNN}' means 'u' + 2-digit year + 6-digit sequence
    format_pattern TEXT NOT NULL,

    -- Regex pattern for validation
    format_regex TEXT NOT NULL,

    -- Example student number
    example TEXT NOT NULL,

    -- Current sequence number for this institution
    current_sequence BIGINT NOT NULL DEFAULT 0,

    -- Whether this format is active
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR INSTITUTION FORMATS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_institution_student_formats_institution_id
    ON public.institution_student_number_formats(institution_id);

CREATE INDEX IF NOT EXISTS idx_institution_student_formats_code
    ON public.institution_student_number_formats(institution_code);

CREATE INDEX IF NOT EXISTS idx_institution_student_formats_active
    ON public.institution_student_number_formats(is_active)
    WHERE is_active = true;

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================
DROP TRIGGER IF EXISTS update_institution_student_number_formats_updated_at
    ON public.institution_student_number_formats;
CREATE TRIGGER update_institution_student_number_formats_updated_at
    BEFORE UPDATE ON public.institution_student_number_formats
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ADD STUDENT NUMBER COLUMNS TO APPLICANT_ACCOUNTS
-- ============================================================================

-- Platform-wide student number (OFA-2kYY-NNNN format)
ALTER TABLE public.applicant_accounts
ADD COLUMN IF NOT EXISTS platform_student_number TEXT UNIQUE;

-- Institution-specific student numbers (JSONB map: institution_code -> number)
ALTER TABLE public.applicant_accounts
ADD COLUMN IF NOT EXISTS institution_student_numbers JSONB DEFAULT '{}'::jsonb;

-- ============================================================================
-- INDEXES FOR APPLICANT STUDENT NUMBERS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_applicant_accounts_platform_student_number
    ON public.applicant_accounts(platform_student_number);

-- GIN index for JSONB lookups on institution student numbers
CREATE INDEX IF NOT EXISTS idx_applicant_accounts_institution_student_numbers
    ON public.applicant_accounts USING GIN (institution_student_numbers);

-- ============================================================================
-- GENERATE PLATFORM STUDENT NUMBER FUNCTION
-- ============================================================================
-- Format: OFA-2kYY-NNNN (e.g., OFA-2k26-0001)
CREATE OR REPLACE FUNCTION public.generate_platform_student_number()
RETURNS TEXT AS $$
DECLARE
    year_suffix TEXT;
    seq_num BIGINT;
    student_number TEXT;
BEGIN
    -- Get 2-digit year (e.g., '26' for 2026)
    year_suffix := TO_CHAR(CURRENT_DATE, 'YY');

    -- Get next sequence value
    seq_num := NEXTVAL('public.platform_student_number_seq');

    -- Format: OFA-2kYY-NNNN (4-digit padded sequence)
    student_number := 'OFA-2k' || year_suffix || '-' || LPAD(seq_num::TEXT, 4, '0');

    RETURN student_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GENERATE INSTITUTION STUDENT NUMBER FUNCTION
-- ============================================================================
-- Generates institution-specific student number based on format configuration
CREATE OR REPLACE FUNCTION public.generate_institution_student_number(
    p_institution_id UUID,
    p_applicant_id UUID
)
RETURNS TEXT AS $$
DECLARE
    format_record RECORD;
    year_prefix TEXT;
    seq_num BIGINT;
    student_number TEXT;
    existing_number TEXT;
BEGIN
    -- Get the format configuration for this institution
    SELECT
        isf.id,
        isf.institution_code,
        isf.format_pattern,
        isf.current_sequence
    INTO format_record
    FROM public.institution_student_number_formats isf
    WHERE isf.institution_id = p_institution_id
    AND isf.is_active = true
    LIMIT 1;

    -- If no format found, return NULL
    IF format_record IS NULL THEN
        RAISE WARNING 'No student number format found for institution %', p_institution_id;
        RETURN NULL;
    END IF;

    -- Check if applicant already has a number for this institution
    SELECT aa.institution_student_numbers ->> format_record.institution_code
    INTO existing_number
    FROM public.applicant_accounts aa
    WHERE aa.id = p_applicant_id;

    IF existing_number IS NOT NULL THEN
        RETURN existing_number;
    END IF;

    -- Get year components
    year_prefix := TO_CHAR(CURRENT_DATE, 'YY');

    -- Increment and get the sequence for this institution
    UPDATE public.institution_student_number_formats
    SET current_sequence = current_sequence + 1
    WHERE id = format_record.id
    RETURNING current_sequence INTO seq_num;

    -- Generate student number based on institution code
    -- Each institution has its own format
    student_number := CASE format_record.institution_code
        -- University of Pretoria: u{YY}{NNNNNN}
        WHEN 'UP' THEN
            'u' || year_prefix || LPAD(seq_num::TEXT, 6, '0')

        -- University of Cape Town: special handling needed (uses surname)
        -- For now, generate placeholder - actual implementation requires surname
        WHEN 'UCT' THEN
            'STUDENT' || LPAD(seq_num::TEXT, 5, '0')

        -- Wits: {YY}{NNNNNN}
        WHEN 'WITS' THEN
            year_prefix || LPAD(seq_num::TEXT, 6, '0')

        -- Stellenbosch: {YY}{NNNNNN}
        WHEN 'SUN' THEN
            year_prefix || LPAD(seq_num::TEXT, 6, '0')

        -- UKZN: {NNNNNNNNN} (9 digits)
        WHEN 'UKZN' THEN
            LPAD(seq_num::TEXT, 9, '0')

        -- UFS: {NNNNNNNNNN} (10 digits)
        WHEN 'UFS' THEN
            LPAD(seq_num::TEXT, 10, '0')

        -- NWU: {NNNNNNNN} (8 digits)
        WHEN 'NWU' THEN
            LPAD(seq_num::TEXT, 8, '0')

        -- NMU: {NNNNNNNNN} (9 digits)
        WHEN 'NMU' THEN
            LPAD(seq_num::TEXT, 9, '0')

        -- UWC: {NNNNNNN} (7 digits)
        WHEN 'UWC' THEN
            LPAD(seq_num::TEXT, 7, '0')

        -- WSU: {YY}{NNNNNNN}
        WHEN 'WSU' THEN
            year_prefix || LPAD(seq_num::TEXT, 7, '0')

        -- TUT: {NNNNNNN} (7 digits)
        WHEN 'TUT' THEN
            LPAD(seq_num::TEXT, 7, '0')

        -- VUT: {NNNNNNNN} (8 digits)
        WHEN 'VUT' THEN
            LPAD(seq_num::TEXT, 8, '0')

        -- CPUT: {NNNNNNNNN} (9 digits)
        WHEN 'CPUT' THEN
            LPAD(seq_num::TEXT, 9, '0')

        -- Eduvos: EDU{YY}{NNNNN}
        WHEN 'EDUVOS' THEN
            'EDU' || year_prefix || LPAD(seq_num::TEXT, 5, '0')

        -- Default: YY + 6 digit sequence
        ELSE
            year_prefix || LPAD(seq_num::TEXT, 6, '0')
    END;

    -- Store the generated number in the applicant's record
    UPDATE public.applicant_accounts
    SET institution_student_numbers = COALESCE(institution_student_numbers, '{}'::jsonb)
        || jsonb_build_object(format_record.institution_code, student_number)
    WHERE id = p_applicant_id;

    RETURN student_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- UCT SPECIAL FUNCTION: Generate with surname
-- ============================================================================
-- UCT format: {SURNAME}{NNNNN} - requires surname input
CREATE OR REPLACE FUNCTION public.generate_uct_student_number(
    p_applicant_id UUID,
    p_surname TEXT
)
RETURNS TEXT AS $$
DECLARE
    format_record RECORD;
    seq_num BIGINT;
    student_number TEXT;
    existing_number TEXT;
    clean_surname TEXT;
BEGIN
    -- Get UCT format configuration
    SELECT id, current_sequence
    INTO format_record
    FROM public.institution_student_number_formats
    WHERE institution_code = 'UCT' AND is_active = true
    LIMIT 1;

    IF format_record IS NULL THEN
        RAISE WARNING 'UCT student number format not found';
        RETURN NULL;
    END IF;

    -- Check if applicant already has UCT number
    SELECT aa.institution_student_numbers ->> 'UCT'
    INTO existing_number
    FROM public.applicant_accounts aa
    WHERE aa.id = p_applicant_id;

    IF existing_number IS NOT NULL THEN
        RETURN existing_number;
    END IF;

    -- Clean and uppercase surname (remove non-alpha characters)
    clean_surname := UPPER(REGEXP_REPLACE(p_surname, '[^A-Za-z]', '', 'g'));

    -- Increment sequence
    UPDATE public.institution_student_number_formats
    SET current_sequence = current_sequence + 1
    WHERE id = format_record.id
    RETURNING current_sequence INTO seq_num;

    -- Generate: SURNAME + 5 digit sequence
    student_number := clean_surname || LPAD(seq_num::TEXT, 5, '0');

    -- Store in applicant record
    UPDATE public.applicant_accounts
    SET institution_student_numbers = COALESCE(institution_student_numbers, '{}'::jsonb)
        || jsonb_build_object('UCT', student_number)
    WHERE id = p_applicant_id;

    RETURN student_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- AUTO-GENERATE PLATFORM STUDENT NUMBER TRIGGER
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_generate_platform_student_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate if not already set
    IF NEW.platform_student_number IS NULL THEN
        NEW.platform_student_number := public.generate_platform_student_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_assign_platform_student_number ON public.applicant_accounts;
CREATE TRIGGER auto_assign_platform_student_number
    BEFORE INSERT ON public.applicant_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_generate_platform_student_number();

-- ============================================================================
-- ROW LEVEL SECURITY FOR FORMATS TABLE
-- ============================================================================
ALTER TABLE public.institution_student_number_formats ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY "Service role full access to student_number_formats"
    ON public.institution_student_number_formats
    FOR ALL
    USING (auth.role() = 'service_role');

-- Institution admins can view their formats
CREATE POLICY "Institution admins can view student_number_formats"
    ON public.institution_student_number_formats
    FOR SELECT
    USING (
        institution_id IN (
            SELECT im.institution_id
            FROM public.institution_members im
            WHERE im.user_id = public.get_current_user_id()
            AND im.role = 'admin'
        )
    );

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT USAGE ON SEQUENCE public.platform_student_number_seq TO service_role;
GRANT SELECT ON public.institution_student_number_formats TO authenticated;
GRANT ALL ON public.institution_student_number_formats TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_platform_student_number TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_institution_student_number TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_uct_student_number TO service_role;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON SEQUENCE public.platform_student_number_seq IS 'Sequence for generating platform-wide unique student numbers';
COMMENT ON TABLE public.institution_student_number_formats IS 'Configuration for institution-specific student number formats';
COMMENT ON COLUMN public.institution_student_number_formats.format_pattern IS 'Human-readable format pattern (e.g., u{YY}{NNNNNN})';
COMMENT ON COLUMN public.institution_student_number_formats.format_regex IS 'Regex pattern for validating student numbers';
COMMENT ON COLUMN public.institution_student_number_formats.current_sequence IS 'Current sequence counter for this institution';
COMMENT ON COLUMN public.applicant_accounts.platform_student_number IS 'One For All platform student number (OFA-2kYY-NNNN format)';
COMMENT ON COLUMN public.applicant_accounts.institution_student_numbers IS 'JSONB map of institution codes to institution-specific student numbers';
COMMENT ON FUNCTION public.generate_platform_student_number IS 'Generates a new platform-wide student number (OFA-2kYY-NNNN)';
COMMENT ON FUNCTION public.generate_institution_student_number IS 'Generates institution-specific student number based on format config';
COMMENT ON FUNCTION public.generate_uct_student_number IS 'Generates UCT student number (SURNAME + 5 digits) - requires surname input';
