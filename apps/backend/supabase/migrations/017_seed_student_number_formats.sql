-- Migration: 017_seed_student_number_formats
-- Description: Seed institution student number formats for all 14 supported institutions
-- Created: 2026-01-13

-- ============================================================================
-- SEED INSTITUTION STUDENT NUMBER FORMATS
-- ============================================================================
-- Insert format configurations for all supported South African institutions
-- Uses ON CONFLICT DO NOTHING to make this idempotent

DO $$
DECLARE
    v_up_id UUID;
    v_uct_id UUID;
    v_wits_id UUID;
    v_sun_id UUID;
    v_ukzn_id UUID;
    v_ufs_id UUID;
    v_nwu_id UUID;
    v_nmu_id UUID;
    v_uwc_id UUID;
    v_wsu_id UUID;
    v_tut_id UUID;
    v_vut_id UUID;
    v_cput_id UUID;
    v_eduvos_id UUID;
BEGIN
    -- Get institution IDs (these may not exist yet)
    SELECT id INTO v_up_id FROM public.institutions WHERE slug = 'up' OR slug = 'university-of-pretoria' LIMIT 1;
    SELECT id INTO v_uct_id FROM public.institutions WHERE slug = 'uct' OR slug = 'university-of-cape-town' LIMIT 1;
    SELECT id INTO v_wits_id FROM public.institutions WHERE slug = 'wits' OR slug = 'university-of-witwatersrand' LIMIT 1;
    SELECT id INTO v_sun_id FROM public.institutions WHERE slug = 'sun' OR slug = 'stellenbosch-university' LIMIT 1;
    SELECT id INTO v_ukzn_id FROM public.institutions WHERE slug = 'ukzn' OR slug = 'university-of-kwazulu-natal' LIMIT 1;
    SELECT id INTO v_ufs_id FROM public.institutions WHERE slug = 'ufs' OR slug = 'university-of-free-state' LIMIT 1;
    SELECT id INTO v_nwu_id FROM public.institutions WHERE slug = 'nwu' OR slug = 'north-west-university' LIMIT 1;
    SELECT id INTO v_nmu_id FROM public.institutions WHERE slug = 'nmu' OR slug = 'nelson-mandela-university' LIMIT 1;
    SELECT id INTO v_uwc_id FROM public.institutions WHERE slug = 'uwc' OR slug = 'university-of-western-cape' LIMIT 1;
    SELECT id INTO v_wsu_id FROM public.institutions WHERE slug = 'wsu' OR slug = 'walter-sisulu-university' LIMIT 1;
    SELECT id INTO v_tut_id FROM public.institutions WHERE slug = 'tut' OR slug = 'tshwane-university-of-technology' LIMIT 1;
    SELECT id INTO v_vut_id FROM public.institutions WHERE slug = 'vut' OR slug = 'vaal-university-of-technology' LIMIT 1;
    SELECT id INTO v_cput_id FROM public.institutions WHERE slug = 'cput' OR slug = 'cape-peninsula-university-of-technology' LIMIT 1;
    SELECT id INTO v_eduvos_id FROM public.institutions WHERE slug = 'eduvos' LIMIT 1;

    -- University of Pretoria (UP)
    -- Format: u{YY}{NNNNNN} - e.g., u26012345
    IF v_up_id IS NOT NULL THEN
        INSERT INTO public.institution_student_number_formats (
            institution_id, institution_code, format_pattern, format_regex, example
        ) VALUES (
            v_up_id, 'UP', 'u{YY}{NNNNNN}', '^u\d{8}$', 'u26012345'
        ) ON CONFLICT (institution_code) DO NOTHING;
    END IF;

    -- University of Cape Town (UCT)
    -- Format: {SURNAME}{NNNNN} - e.g., SMITH12345
    IF v_uct_id IS NOT NULL THEN
        INSERT INTO public.institution_student_number_formats (
            institution_id, institution_code, format_pattern, format_regex, example
        ) VALUES (
            v_uct_id, 'UCT', '{SURNAME}{NNNNN}', '^[A-Z]+\d{5}$', 'SMITH12345'
        ) ON CONFLICT (institution_code) DO NOTHING;
    END IF;

    -- University of the Witwatersrand (Wits)
    -- Format: {YY}{NNNNNN} - e.g., 26012345
    IF v_wits_id IS NOT NULL THEN
        INSERT INTO public.institution_student_number_formats (
            institution_id, institution_code, format_pattern, format_regex, example
        ) VALUES (
            v_wits_id, 'WITS', '{YY}{NNNNNN}', '^\d{8}$', '26012345'
        ) ON CONFLICT (institution_code) DO NOTHING;
    END IF;

    -- Stellenbosch University (SUN)
    -- Format: {YY}{NNNNNN} - e.g., 26012345
    IF v_sun_id IS NOT NULL THEN
        INSERT INTO public.institution_student_number_formats (
            institution_id, institution_code, format_pattern, format_regex, example
        ) VALUES (
            v_sun_id, 'SUN', '{YY}{NNNNNN}', '^\d{8}$', '26012345'
        ) ON CONFLICT (institution_code) DO NOTHING;
    END IF;

    -- University of KwaZulu-Natal (UKZN)
    -- Format: {NNNNNNNNN} - 9 digits, e.g., 998765432
    IF v_ukzn_id IS NOT NULL THEN
        INSERT INTO public.institution_student_number_formats (
            institution_id, institution_code, format_pattern, format_regex, example
        ) VALUES (
            v_ukzn_id, 'UKZN', '{NNNNNNNNN}', '^\d{9}$', '998765432'
        ) ON CONFLICT (institution_code) DO NOTHING;
    END IF;

    -- University of the Free State (UFS)
    -- Format: {NNNNNNNNNN} - 10 digits, e.g., 5370810030
    IF v_ufs_id IS NOT NULL THEN
        INSERT INTO public.institution_student_number_formats (
            institution_id, institution_code, format_pattern, format_regex, example
        ) VALUES (
            v_ufs_id, 'UFS', '{NNNNNNNNNN}', '^\d{10}$', '5370810030'
        ) ON CONFLICT (institution_code) DO NOTHING;
    END IF;

    -- North-West University (NWU)
    -- Format: {NNNNNNNN} - 8 digits, e.g., 12345678
    IF v_nwu_id IS NOT NULL THEN
        INSERT INTO public.institution_student_number_formats (
            institution_id, institution_code, format_pattern, format_regex, example
        ) VALUES (
            v_nwu_id, 'NWU', '{NNNNNNNN}', '^\d{8}$', '12345678'
        ) ON CONFLICT (institution_code) DO NOTHING;
    END IF;

    -- Nelson Mandela University (NMU)
    -- Format: {NNNNNNNNN} - 9 digits, e.g., 123456789
    IF v_nmu_id IS NOT NULL THEN
        INSERT INTO public.institution_student_number_formats (
            institution_id, institution_code, format_pattern, format_regex, example
        ) VALUES (
            v_nmu_id, 'NMU', '{NNNNNNNNN}', '^\d{9}$', '123456789'
        ) ON CONFLICT (institution_code) DO NOTHING;
    END IF;

    -- University of the Western Cape (UWC)
    -- Format: {NNNNNNN} - 7 digits, e.g., 4112117
    IF v_uwc_id IS NOT NULL THEN
        INSERT INTO public.institution_student_number_formats (
            institution_id, institution_code, format_pattern, format_regex, example
        ) VALUES (
            v_uwc_id, 'UWC', '{NNNNNNN}', '^\d{7}$', '4112117'
        ) ON CONFLICT (institution_code) DO NOTHING;
    END IF;

    -- Walter Sisulu University (WSU)
    -- Format: {YY}{NNNNNNN} - e.g., 220123456
    IF v_wsu_id IS NOT NULL THEN
        INSERT INTO public.institution_student_number_formats (
            institution_id, institution_code, format_pattern, format_regex, example
        ) VALUES (
            v_wsu_id, 'WSU', '{YY}{NNNNNNN}', '^\d{9}$', '220123456'
        ) ON CONFLICT (institution_code) DO NOTHING;
    END IF;

    -- Tshwane University of Technology (TUT)
    -- Format: {NNNNNNN} - 7 digits, e.g., 2401234
    IF v_tut_id IS NOT NULL THEN
        INSERT INTO public.institution_student_number_formats (
            institution_id, institution_code, format_pattern, format_regex, example
        ) VALUES (
            v_tut_id, 'TUT', '{NNNNNNN}', '^\d{7}$', '2401234'
        ) ON CONFLICT (institution_code) DO NOTHING;
    END IF;

    -- Vaal University of Technology (VUT)
    -- Format: {NNNNNNNN} - 8 digits, e.g., 20241234
    IF v_vut_id IS NOT NULL THEN
        INSERT INTO public.institution_student_number_formats (
            institution_id, institution_code, format_pattern, format_regex, example
        ) VALUES (
            v_vut_id, 'VUT', '{NNNNNNNN}', '^\d{8}$', '20241234'
        ) ON CONFLICT (institution_code) DO NOTHING;
    END IF;

    -- Cape Peninsula University of Technology (CPUT)
    -- Format: {NNNNNNNNN} - 9 digits, e.g., 212345678
    IF v_cput_id IS NOT NULL THEN
        INSERT INTO public.institution_student_number_formats (
            institution_id, institution_code, format_pattern, format_regex, example
        ) VALUES (
            v_cput_id, 'CPUT', '{NNNNNNNNN}', '^\d{9}$', '212345678'
        ) ON CONFLICT (institution_code) DO NOTHING;
    END IF;

    -- Eduvos (Private College)
    -- Format: EDU{YY}{NNNNN} - e.g., EDU2600001
    IF v_eduvos_id IS NOT NULL THEN
        INSERT INTO public.institution_student_number_formats (
            institution_id, institution_code, format_pattern, format_regex, example
        ) VALUES (
            v_eduvos_id, 'EDUVOS', 'EDU{YY}{NNNNN}', '^EDU\d{7}$', 'EDU2600001'
        ) ON CONFLICT (institution_code) DO NOTHING;
    END IF;

    RAISE NOTICE 'Student number formats seeded for existing institutions';
END $$;

-- ============================================================================
-- FALLBACK: Insert formats for institutions that may be created later
-- ============================================================================
-- These are inserted without institution_id, which can be updated later
-- when the institution is created via a trigger

-- Create a trigger function to link orphan formats when institutions are created
CREATE OR REPLACE FUNCTION public.link_student_number_format()
RETURNS TRIGGER AS $$
DECLARE
    code_map JSONB := '{
        "university-of-pretoria": "UP",
        "up": "UP",
        "university-of-cape-town": "UCT",
        "uct": "UCT",
        "university-of-witwatersrand": "WITS",
        "wits": "WITS",
        "stellenbosch-university": "SUN",
        "sun": "SUN",
        "university-of-kwazulu-natal": "UKZN",
        "ukzn": "UKZN",
        "university-of-free-state": "UFS",
        "ufs": "UFS",
        "north-west-university": "NWU",
        "nwu": "NWU",
        "nelson-mandela-university": "NMU",
        "nmu": "NMU",
        "university-of-western-cape": "UWC",
        "uwc": "UWC",
        "walter-sisulu-university": "WSU",
        "wsu": "WSU",
        "tshwane-university-of-technology": "TUT",
        "tut": "TUT",
        "vaal-university-of-technology": "VUT",
        "vut": "VUT",
        "cape-peninsula-university-of-technology": "CPUT",
        "cput": "CPUT",
        "eduvos": "EDUVOS"
    }'::jsonb;
    inst_code TEXT;
BEGIN
    -- Look up institution code from slug
    inst_code := code_map ->> NEW.slug;

    IF inst_code IS NOT NULL THEN
        -- Update any orphan format records
        UPDATE public.institution_student_number_formats
        SET institution_id = NEW.id
        WHERE institution_code = inst_code
        AND institution_id IS NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: This trigger is created but won't fire for existing institutions
-- It's useful for future institution creations
DROP TRIGGER IF EXISTS link_student_number_format_on_institution ON public.institutions;
CREATE TRIGGER link_student_number_format_on_institution
    AFTER INSERT ON public.institutions
    FOR EACH ROW
    EXECUTE FUNCTION public.link_student_number_format();

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================
/*
-- Run this to verify seeded formats:
SELECT
    isf.institution_code,
    isf.format_pattern,
    isf.format_regex,
    isf.example,
    i.name AS institution_name,
    i.slug AS institution_slug
FROM public.institution_student_number_formats isf
LEFT JOIN public.institutions i ON i.id = isf.institution_id
ORDER BY isf.institution_code;
*/

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON FUNCTION public.link_student_number_format IS 'Links orphan student number formats to newly created institutions based on slug';
