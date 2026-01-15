-- Migration: 018_seed_test_applications
-- Description: Seed test data for Eduvos Midrand Commerce Faculty
-- Created: 2026-01-13

-- ============================================================================
-- TEST DATA SEEDING FOR EDUVOS
-- ============================================================================
-- Creates test applicants and applications for Eduvos Midrand Commerce Faculty
-- This is development/testing data only - safe to run multiple times (idempotent)

DO $$
DECLARE
    -- Institution/Faculty/Campus IDs
    v_eduvos_id UUID;
    v_midrand_campus_id UUID;
    v_commerce_faculty_id UUID;
    v_bcom_general_id UUID;
    v_bcom_accounting_id UUID;

    -- Test applicant IDs
    v_thabo_id UUID;
    v_nomsa_id UUID;
    v_sipho_id UUID;

    -- Test application IDs
    v_thabo_app_id UUID;
    v_nomsa_app_id UUID;
    v_sipho_app_id UUID;
BEGIN
    -- ========================================================================
    -- STEP 1: Get Eduvos institution ID
    -- ========================================================================
    SELECT id INTO v_eduvos_id
    FROM public.institutions
    WHERE slug = 'eduvos'
    LIMIT 1;

    IF v_eduvos_id IS NULL THEN
        RAISE WARNING 'Eduvos institution not found - skipping test data seeding';
        RETURN;
    END IF;

    RAISE NOTICE 'Found Eduvos institution: %', v_eduvos_id;

    -- ========================================================================
    -- STEP 2: Get Midrand campus ID (or create if not exists)
    -- ========================================================================
    SELECT id INTO v_midrand_campus_id
    FROM public.campuses
    WHERE institution_id = v_eduvos_id
    AND (LOWER(name) LIKE '%midrand%' OR LOWER(code) = 'midrand')
    LIMIT 1;

    IF v_midrand_campus_id IS NULL THEN
        INSERT INTO public.campuses (institution_id, name, code, location)
        VALUES (v_eduvos_id, 'Midrand', 'MIDRAND', 'Midrand, Gauteng')
        RETURNING id INTO v_midrand_campus_id;
        RAISE NOTICE 'Created Midrand campus: %', v_midrand_campus_id;
    ELSE
        RAISE NOTICE 'Found Midrand campus: %', v_midrand_campus_id;
    END IF;

    -- ========================================================================
    -- STEP 3: Get Commerce faculty ID (or create if not exists)
    -- ========================================================================
    SELECT id INTO v_commerce_faculty_id
    FROM public.faculties
    WHERE institution_id = v_eduvos_id
    AND (LOWER(name) LIKE '%commerce%' OR LOWER(code) = 'commerce')
    LIMIT 1;

    IF v_commerce_faculty_id IS NULL THEN
        INSERT INTO public.faculties (institution_id, campus_id, name, code)
        VALUES (v_eduvos_id, v_midrand_campus_id, 'Faculty of Commerce', 'COMMERCE')
        RETURNING id INTO v_commerce_faculty_id;
        RAISE NOTICE 'Created Commerce faculty: %', v_commerce_faculty_id;
    ELSE
        RAISE NOTICE 'Found Commerce faculty: %', v_commerce_faculty_id;
    END IF;

    -- ========================================================================
    -- STEP 4: Get or create BCom courses
    -- ========================================================================
    -- BCom General
    SELECT id INTO v_bcom_general_id
    FROM public.courses
    WHERE institution_id = v_eduvos_id
    AND (LOWER(code) = 'bcom-gen' OR LOWER(name) LIKE '%bcom general%')
    LIMIT 1;

    IF v_bcom_general_id IS NULL THEN
        INSERT INTO public.courses (
            institution_id, faculty_id, campus_id, name, code, description,
            requirements, status, opening_date, closing_date
        )
        VALUES (
            v_eduvos_id,
            v_commerce_faculty_id,
            v_midrand_campus_id,
            'Bachelor of Commerce (General)',
            'BCOM-GEN',
            'A comprehensive commerce degree covering business fundamentals',
            '{"minimum_aps": 26, "required_subjects": ["Mathematics", "English"], "minimum_subject_levels": {"Mathematics": 4, "English": 4}}'::jsonb,
            'active',
            '2026-01-01',
            '2026-09-30'
        )
        RETURNING id INTO v_bcom_general_id;
        RAISE NOTICE 'Created BCom General course: %', v_bcom_general_id;
    ELSE
        RAISE NOTICE 'Found BCom General course: %', v_bcom_general_id;
    END IF;

    -- BCom Accounting
    SELECT id INTO v_bcom_accounting_id
    FROM public.courses
    WHERE institution_id = v_eduvos_id
    AND (LOWER(code) = 'bcom-acc' OR LOWER(name) LIKE '%bcom accounting%')
    LIMIT 1;

    IF v_bcom_accounting_id IS NULL THEN
        INSERT INTO public.courses (
            institution_id, faculty_id, campus_id, name, code, description,
            requirements, status, opening_date, closing_date
        )
        VALUES (
            v_eduvos_id,
            v_commerce_faculty_id,
            v_midrand_campus_id,
            'Bachelor of Commerce (Accounting)',
            'BCOM-ACC',
            'Specialized accounting degree preparing students for CA qualification',
            '{"minimum_aps": 28, "required_subjects": ["Mathematics", "English", "Accounting"], "minimum_subject_levels": {"Mathematics": 5, "English": 4, "Accounting": 5}}'::jsonb,
            'active',
            '2026-01-01',
            '2026-09-30'
        )
        RETURNING id INTO v_bcom_accounting_id;
        RAISE NOTICE 'Created BCom Accounting course: %', v_bcom_accounting_id;
    ELSE
        RAISE NOTICE 'Found BCom Accounting course: %', v_bcom_accounting_id;
    END IF;

    -- ========================================================================
    -- STEP 5: Create test applicants
    -- ========================================================================

    -- Thabo Molefe
    SELECT id INTO v_thabo_id
    FROM public.applicant_accounts
    WHERE email = 'thabo.molefe@test.ofa.co.za'
    LIMIT 1;

    IF v_thabo_id IS NULL THEN
        INSERT INTO public.applicant_accounts (
            username, email, cellphone
        )
        VALUES (
            'thabo_molefe',
            'thabo.molefe@test.ofa.co.za',
            '+27821234501'
        )
        RETURNING id INTO v_thabo_id;
        RAISE NOTICE 'Created test applicant Thabo: %', v_thabo_id;
    ELSE
        RAISE NOTICE 'Found test applicant Thabo: %', v_thabo_id;
    END IF;

    -- Nomsa Dlamini
    SELECT id INTO v_nomsa_id
    FROM public.applicant_accounts
    WHERE email = 'nomsa.dlamini@test.ofa.co.za'
    LIMIT 1;

    IF v_nomsa_id IS NULL THEN
        INSERT INTO public.applicant_accounts (
            username, email, cellphone
        )
        VALUES (
            'nomsa_dlamini',
            'nomsa.dlamini@test.ofa.co.za',
            '+27821234502'
        )
        RETURNING id INTO v_nomsa_id;
        RAISE NOTICE 'Created test applicant Nomsa: %', v_nomsa_id;
    ELSE
        RAISE NOTICE 'Found test applicant Nomsa: %', v_nomsa_id;
    END IF;

    -- Sipho Ndlovu
    SELECT id INTO v_sipho_id
    FROM public.applicant_accounts
    WHERE email = 'sipho.ndlovu@test.ofa.co.za'
    LIMIT 1;

    IF v_sipho_id IS NULL THEN
        INSERT INTO public.applicant_accounts (
            username, email, cellphone
        )
        VALUES (
            'sipho_ndlovu',
            'sipho.ndlovu@test.ofa.co.za',
            '+27821234503'
        )
        RETURNING id INTO v_sipho_id;
        RAISE NOTICE 'Created test applicant Sipho: %', v_sipho_id;
    ELSE
        RAISE NOTICE 'Found test applicant Sipho: %', v_sipho_id;
    END IF;

    -- ========================================================================
    -- STEP 6: Create test applications
    -- ========================================================================

    -- Thabo's application
    SELECT id INTO v_thabo_app_id
    FROM public.applications
    WHERE applicant_id = v_thabo_id
    AND institution_id = v_eduvos_id
    LIMIT 1;

    IF v_thabo_app_id IS NULL THEN
        INSERT INTO public.applications (
            applicant_id, institution_id, course_id,
            university_name, faculty, qualification_type, program, year,
            personal_info, academic_info, status
        )
        VALUES (
            v_thabo_id,
            v_eduvos_id,
            v_bcom_general_id,
            'Eduvos',
            'Commerce',
            'Undergraduate',
            'BCom General',
            2026,
            '{
                "first_name": "Thabo",
                "last_name": "Molefe",
                "id_number": "0301155012081",
                "date_of_birth": "2003-01-15",
                "gender": "Male",
                "nationality": "South African",
                "home_language": "Zulu",
                "email": "thabo.molefe@test.ofa.co.za",
                "phone": "+27821234501",
                "address": {
                    "street": "123 Mandela Street",
                    "suburb": "Midrand",
                    "city": "Johannesburg",
                    "province": "Gauteng",
                    "postal_code": "1685"
                }
            }'::jsonb,
            '{
                "school_name": "Midrand High School",
                "matric_year": 2025,
                "aps_score": 32,
                "subjects": [
                    {"name": "English Home Language", "level": 5, "percentage": 68},
                    {"name": "Mathematics", "level": 5, "percentage": 65},
                    {"name": "Accounting", "level": 5, "percentage": 70},
                    {"name": "Business Studies", "level": 6, "percentage": 75},
                    {"name": "Economics", "level": 5, "percentage": 67},
                    {"name": "Life Orientation", "level": 6, "percentage": 78},
                    {"name": "Afrikaans FAL", "level": 4, "percentage": 58}
                ]
            }'::jsonb,
            'under_review'
        )
        RETURNING id INTO v_thabo_app_id;
        RAISE NOTICE 'Created Thabo application: %', v_thabo_app_id;
    ELSE
        RAISE NOTICE 'Found Thabo application: %', v_thabo_app_id;
    END IF;

    -- Nomsa's application
    SELECT id INTO v_nomsa_app_id
    FROM public.applications
    WHERE applicant_id = v_nomsa_id
    AND institution_id = v_eduvos_id
    LIMIT 1;

    IF v_nomsa_app_id IS NULL THEN
        INSERT INTO public.applications (
            applicant_id, institution_id, course_id,
            university_name, faculty, qualification_type, program, year,
            personal_info, academic_info, status
        )
        VALUES (
            v_nomsa_id,
            v_eduvos_id,
            v_bcom_accounting_id,
            'Eduvos',
            'Commerce',
            'Undergraduate',
            'BCom Accounting',
            2026,
            '{
                "first_name": "Nomsa",
                "last_name": "Dlamini",
                "id_number": "0208234012089",
                "date_of_birth": "2002-08-23",
                "gender": "Female",
                "nationality": "South African",
                "home_language": "Xhosa",
                "email": "nomsa.dlamini@test.ofa.co.za",
                "phone": "+27821234502",
                "address": {
                    "street": "45 Sisulu Avenue",
                    "suburb": "Centurion",
                    "city": "Pretoria",
                    "province": "Gauteng",
                    "postal_code": "0157"
                }
            }'::jsonb,
            '{
                "school_name": "Centurion College",
                "matric_year": 2025,
                "aps_score": 38,
                "subjects": [
                    {"name": "English Home Language", "level": 6, "percentage": 75},
                    {"name": "Mathematics", "level": 6, "percentage": 78},
                    {"name": "Accounting", "level": 7, "percentage": 85},
                    {"name": "Business Studies", "level": 6, "percentage": 76},
                    {"name": "Economics", "level": 6, "percentage": 74},
                    {"name": "Life Orientation", "level": 7, "percentage": 88},
                    {"name": "IsiZulu FAL", "level": 5, "percentage": 68}
                ]
            }'::jsonb,
            'accepted'
        )
        RETURNING id INTO v_nomsa_app_id;
        RAISE NOTICE 'Created Nomsa application: %', v_nomsa_app_id;
    ELSE
        RAISE NOTICE 'Found Nomsa application: %', v_nomsa_app_id;
    END IF;

    -- Sipho's application
    SELECT id INTO v_sipho_app_id
    FROM public.applications
    WHERE applicant_id = v_sipho_id
    AND institution_id = v_eduvos_id
    LIMIT 1;

    IF v_sipho_app_id IS NULL THEN
        INSERT INTO public.applications (
            applicant_id, institution_id, course_id,
            university_name, faculty, qualification_type, program, year,
            personal_info, academic_info, status
        )
        VALUES (
            v_sipho_id,
            v_eduvos_id,
            v_bcom_general_id,
            'Eduvos',
            'Commerce',
            'Undergraduate',
            'BCom General',
            2026,
            '{
                "first_name": "Sipho",
                "last_name": "Ndlovu",
                "id_number": "0405125012087",
                "date_of_birth": "2004-05-12",
                "gender": "Male",
                "nationality": "South African",
                "home_language": "Sotho",
                "email": "sipho.ndlovu@test.ofa.co.za",
                "phone": "+27821234503",
                "address": {
                    "street": "78 Biko Road",
                    "suburb": "Sandton",
                    "city": "Johannesburg",
                    "province": "Gauteng",
                    "postal_code": "2196"
                }
            }'::jsonb,
            '{
                "school_name": "Sandton High School",
                "matric_year": 2025,
                "aps_score": 28,
                "subjects": [
                    {"name": "English Home Language", "level": 4, "percentage": 55},
                    {"name": "Mathematics", "level": 4, "percentage": 52},
                    {"name": "Accounting", "level": 4, "percentage": 56},
                    {"name": "Business Studies", "level": 5, "percentage": 62},
                    {"name": "Geography", "level": 5, "percentage": 64},
                    {"name": "Life Orientation", "level": 6, "percentage": 72},
                    {"name": "Sesotho HL", "level": 5, "percentage": 65}
                ]
            }'::jsonb,
            'pending'
        )
        RETURNING id INTO v_sipho_app_id;
        RAISE NOTICE 'Created Sipho application: %', v_sipho_app_id;
    ELSE
        RAISE NOTICE 'Found Sipho application: %', v_sipho_app_id;
    END IF;

    -- ========================================================================
    -- STEP 7: Create application choices
    -- ========================================================================

    -- Thabo: BCom General (1st choice, under_review) + BCom Accounting (2nd choice, pending)
    INSERT INTO public.application_choices (
        application_id, priority, course_id, institution_id, faculty_id, campus_id, status
    )
    VALUES
        (v_thabo_app_id, 1, v_bcom_general_id, v_eduvos_id, v_commerce_faculty_id, v_midrand_campus_id, 'under_review'),
        (v_thabo_app_id, 2, v_bcom_accounting_id, v_eduvos_id, v_commerce_faculty_id, v_midrand_campus_id, 'pending')
    ON CONFLICT (application_id, priority) DO NOTHING;

    RAISE NOTICE 'Created/verified Thabo application choices';

    -- Nomsa: BCom Accounting (1st choice, accepted)
    INSERT INTO public.application_choices (
        application_id, priority, course_id, institution_id, faculty_id, campus_id, status, reviewed_at
    )
    VALUES
        (v_nomsa_app_id, 1, v_bcom_accounting_id, v_eduvos_id, v_commerce_faculty_id, v_midrand_campus_id, 'accepted', NOW() - INTERVAL '2 days')
    ON CONFLICT (application_id, priority) DO NOTHING;

    RAISE NOTICE 'Created/verified Nomsa application choices';

    -- Sipho: BCom General (1st choice, pending) + BCom Accounting (2nd choice, rejected)
    INSERT INTO public.application_choices (
        application_id, priority, course_id, institution_id, faculty_id, campus_id, status, status_reason, reviewed_at
    )
    VALUES
        (v_sipho_app_id, 1, v_bcom_general_id, v_eduvos_id, v_commerce_faculty_id, v_midrand_campus_id, 'pending', NULL, NULL),
        (v_sipho_app_id, 2, v_bcom_accounting_id, v_eduvos_id, v_commerce_faculty_id, v_midrand_campus_id, 'rejected', 'Does not meet minimum APS requirement of 28 for BCom Accounting', NOW() - INTERVAL '1 day')
    ON CONFLICT (application_id, priority) DO NOTHING;

    RAISE NOTICE 'Created/verified Sipho application choices';

    -- ========================================================================
    -- SUMMARY
    -- ========================================================================
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Test data seeding complete!';
    RAISE NOTICE 'Institution: Eduvos (%)' , v_eduvos_id;
    RAISE NOTICE 'Campus: Midrand (%)' , v_midrand_campus_id;
    RAISE NOTICE 'Faculty: Commerce (%)' , v_commerce_faculty_id;
    RAISE NOTICE 'Courses: BCom General (%), BCom Accounting (%)' , v_bcom_general_id, v_bcom_accounting_id;
    RAISE NOTICE 'Applicants: Thabo (%), Nomsa (%), Sipho (%)' , v_thabo_id, v_nomsa_id, v_sipho_id;
    RAISE NOTICE 'Applications: 3 created with 5 total choices';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
/*
-- Check test applicants
SELECT
    aa.id,
    aa.username,
    aa.email,
    aa.cellphone,
    aa.platform_student_number
FROM public.applicant_accounts aa
WHERE aa.email LIKE '%@test.ofa.co.za';

-- Check test applications with choices
SELECT
    a.id AS application_id,
    aa.username,
    aa.email,
    a.status AS app_status,
    ac.priority,
    c.name AS course_name,
    ac.status AS choice_status,
    ac.status_reason
FROM public.applications a
JOIN public.applicant_accounts aa ON aa.id = a.applicant_id
LEFT JOIN public.application_choices ac ON ac.application_id = a.id
LEFT JOIN public.courses c ON c.id = ac.course_id
WHERE aa.email LIKE '%@test.ofa.co.za'
ORDER BY aa.username, ac.priority;
*/

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON SCHEMA public IS 'Migration 018: Seeded test data for Eduvos Midrand Commerce Faculty with 3 applicants and 5 application choices';
