-- Migration: 023_fresh_test_applications
-- Description: Create 5 fresh BCom Accounting test applications with complete data
-- Created: 2026-01-14

-- ============================================================================
-- FRESH TEST DATA FOR BCOM ACCOUNTING APPLICATIONS
-- ============================================================================
-- Creates 5 test applicants with full personal/academic info, application choices,
-- and document placeholders. All applications are for BCom Accounting program.
-- This data is for testing the application management system.

DO $$
DECLARE
    -- Institution IDs
    v_eduvos_id UUID;
    v_midrand_campus_id UUID;
    v_commerce_faculty_id UUID;
    v_bcom_accounting_id UUID;

    -- Applicant IDs
    v_lerato_id UUID;
    v_kabelo_id UUID;
    v_ayanda_id UUID;
    v_naledi_id UUID;
    v_tshepo_id UUID;

    -- Application IDs
    v_lerato_app_id UUID;
    v_kabelo_app_id UUID;
    v_ayanda_app_id UUID;
    v_naledi_app_id UUID;
    v_tshepo_app_id UUID;
BEGIN
    -- ========================================================================
    -- STEP 1: Get Eduvos institution and course IDs
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

    -- Get Midrand campus
    SELECT id INTO v_midrand_campus_id
    FROM public.campuses
    WHERE institution_id = v_eduvos_id
    AND (LOWER(name) LIKE '%midrand%' OR LOWER(code) = 'midrand')
    LIMIT 1;

    -- Get Commerce faculty
    SELECT id INTO v_commerce_faculty_id
    FROM public.faculties
    WHERE institution_id = v_eduvos_id
    AND (LOWER(name) LIKE '%commerce%' OR LOWER(code) = 'commerce')
    LIMIT 1;

    -- Get BCom Accounting course
    SELECT id INTO v_bcom_accounting_id
    FROM public.courses
    WHERE institution_id = v_eduvos_id
    AND code = 'BCOM-ACC'
    LIMIT 1;

    IF v_bcom_accounting_id IS NULL THEN
        RAISE WARNING 'BCom Accounting course not found - skipping test data seeding';
        RETURN;
    END IF;

    RAISE NOTICE 'Found BCom Accounting course: %', v_bcom_accounting_id;

    -- ========================================================================
    -- STEP 2: Create applicant 1 - Lerato Mokoena (Female, APS 32, Sesotho, Gauteng)
    -- ========================================================================
    SELECT id INTO v_lerato_id
    FROM public.applicant_accounts
    WHERE email = 'lerato.mokoena@test.ofa.co.za'
    LIMIT 1;

    IF v_lerato_id IS NULL THEN
        INSERT INTO public.applicant_accounts (username, email, cellphone)
        VALUES ('lerato_mokoena', 'lerato.mokoena@test.ofa.co.za', '+27821234510')
        RETURNING id INTO v_lerato_id;
        RAISE NOTICE 'Created applicant Lerato Mokoena: %', v_lerato_id;
    ELSE
        RAISE NOTICE 'Found applicant Lerato Mokoena: %', v_lerato_id;
    END IF;

    -- Create Lerato's application
    SELECT id INTO v_lerato_app_id
    FROM public.applications
    WHERE applicant_id = v_lerato_id
    AND institution_id = v_eduvos_id
    AND course_id = v_bcom_accounting_id
    LIMIT 1;

    IF v_lerato_app_id IS NULL THEN
        INSERT INTO public.applications (
            applicant_id, institution_id, course_id,
            university_name, faculty, qualification_type, program, year,
            personal_info, academic_info, status
        )
        VALUES (
            v_lerato_id,
            v_eduvos_id,
            v_bcom_accounting_id,
            'Eduvos',
            'Commerce',
            'Undergraduate',
            'BCom Accounting',
            2026,
            '{
                "first_name": "Lerato",
                "last_name": "Mokoena",
                "id_number": "0203155012083",
                "date_of_birth": "2002-03-15",
                "gender": "Female",
                "nationality": "South African",
                "citizenship": "South African",
                "home_language": "Sesotho",
                "email": "lerato.mokoena@test.ofa.co.za",
                "phone": "+27821234510",
                "address": {
                    "street": "45 Nelson Mandela Drive",
                    "suburb": "Centurion",
                    "city": "Pretoria",
                    "province": "Gauteng",
                    "postal_code": "0157"
                },
                "physical_address": "45 Nelson Mandela Drive, Centurion, Pretoria, Gauteng, 0157",
                "province": "Gauteng"
            }'::jsonb,
            '{
                "school_name": "Centurion High School",
                "matric_year": 2020,
                "aps_score": 32,
                "highest_qualification": "National Senior Certificate",
                "subjects": [
                    {"name": "English Home Language", "level": "5", "grade": "C", "percentage": 68},
                    {"name": "Mathematics", "level": "5", "grade": "C", "percentage": 65},
                    {"name": "Accounting", "level": "6", "grade": "B", "percentage": 72},
                    {"name": "Business Studies", "level": "5", "grade": "C", "percentage": 67},
                    {"name": "Economics", "level": "5", "grade": "C", "percentage": 66},
                    {"name": "Life Orientation", "level": "6", "grade": "B", "percentage": 75}
                ]
            }'::jsonb,
            'pending'
        )
        RETURNING id INTO v_lerato_app_id;
        RAISE NOTICE 'Created Lerato application: %', v_lerato_app_id;
    ELSE
        RAISE NOTICE 'Found Lerato application: %', v_lerato_app_id;
    END IF;

    -- Create application choice
    INSERT INTO public.application_choices (
        application_id, priority, course_id, institution_id, faculty_id, campus_id, status
    )
    VALUES (
        v_lerato_app_id, 1, v_bcom_accounting_id, v_eduvos_id, v_commerce_faculty_id, v_midrand_campus_id, 'pending'
    )
    ON CONFLICT (application_id, priority) DO NOTHING;

    -- Create documents
    INSERT INTO public.application_documents (application_id, file_url, document_type, review_status)
    VALUES
        (v_lerato_app_id, 'https://storage.ofa.co.za/docs/lerato_mokoena_id.pdf', 'ID Document', 'pending'),
        (v_lerato_app_id, 'https://storage.ofa.co.za/docs/lerato_mokoena_matric.pdf', 'Matric Certificate', 'pending'),
        (v_lerato_app_id, 'https://storage.ofa.co.za/docs/lerato_mokoena_poa.pdf', 'Proof of Address', 'pending')
    ON CONFLICT DO NOTHING;

    -- ========================================================================
    -- STEP 3: Create applicant 2 - Kabelo Sithole (Male, APS 35, isiZulu, KZN)
    -- ========================================================================
    SELECT id INTO v_kabelo_id
    FROM public.applicant_accounts
    WHERE email = 'kabelo.sithole@test.ofa.co.za'
    LIMIT 1;

    IF v_kabelo_id IS NULL THEN
        INSERT INTO public.applicant_accounts (username, email, cellphone)
        VALUES ('kabelo_sithole', 'kabelo.sithole@test.ofa.co.za', '+27821234511')
        RETURNING id INTO v_kabelo_id;
        RAISE NOTICE 'Created applicant Kabelo Sithole: %', v_kabelo_id;
    ELSE
        RAISE NOTICE 'Found applicant Kabelo Sithole: %', v_kabelo_id;
    END IF;

    -- Create Kabelo's application
    SELECT id INTO v_kabelo_app_id
    FROM public.applications
    WHERE applicant_id = v_kabelo_id
    AND institution_id = v_eduvos_id
    AND course_id = v_bcom_accounting_id
    LIMIT 1;

    IF v_kabelo_app_id IS NULL THEN
        INSERT INTO public.applications (
            applicant_id, institution_id, course_id,
            university_name, faculty, qualification_type, program, year,
            personal_info, academic_info, status
        )
        VALUES (
            v_kabelo_id,
            v_eduvos_id,
            v_bcom_accounting_id,
            'Eduvos',
            'Commerce',
            'Undergraduate',
            'BCom Accounting',
            2026,
            '{
                "first_name": "Kabelo",
                "last_name": "Sithole",
                "id_number": "0104125012089",
                "date_of_birth": "2001-04-12",
                "gender": "Male",
                "nationality": "South African",
                "citizenship": "South African",
                "home_language": "isiZulu",
                "email": "kabelo.sithole@test.ofa.co.za",
                "phone": "+27821234511",
                "address": {
                    "street": "23 Mandela Road",
                    "suburb": "Durban Central",
                    "city": "Durban",
                    "province": "KwaZulu-Natal",
                    "postal_code": "4001"
                },
                "physical_address": "23 Mandela Road, Durban Central, Durban, KwaZulu-Natal, 4001",
                "province": "KwaZulu-Natal"
            }'::jsonb,
            '{
                "school_name": "Durban High School",
                "matric_year": 2019,
                "aps_score": 35,
                "highest_qualification": "National Senior Certificate",
                "subjects": [
                    {"name": "English First Additional Language", "level": "5", "grade": "C", "percentage": 67},
                    {"name": "Mathematics", "level": "6", "grade": "B", "percentage": 74},
                    {"name": "Accounting", "level": "6", "grade": "B", "percentage": 76},
                    {"name": "Business Studies", "level": "6", "grade": "B", "percentage": 73},
                    {"name": "Economics", "level": "6", "grade": "B", "percentage": 71},
                    {"name": "Life Orientation", "level": "6", "grade": "B", "percentage": 78}
                ]
            }'::jsonb,
            'pending'
        )
        RETURNING id INTO v_kabelo_app_id;
        RAISE NOTICE 'Created Kabelo application: %', v_kabelo_app_id;
    ELSE
        RAISE NOTICE 'Found Kabelo application: %', v_kabelo_app_id;
    END IF;

    -- Create application choice
    INSERT INTO public.application_choices (
        application_id, priority, course_id, institution_id, faculty_id, campus_id, status
    )
    VALUES (
        v_kabelo_app_id, 1, v_bcom_accounting_id, v_eduvos_id, v_commerce_faculty_id, v_midrand_campus_id, 'pending'
    )
    ON CONFLICT (application_id, priority) DO NOTHING;

    -- Create documents
    INSERT INTO public.application_documents (application_id, file_url, document_type, review_status)
    VALUES
        (v_kabelo_app_id, 'https://storage.ofa.co.za/docs/kabelo_sithole_id.pdf', 'ID Document', 'pending'),
        (v_kabelo_app_id, 'https://storage.ofa.co.za/docs/kabelo_sithole_matric.pdf', 'Matric Certificate', 'pending'),
        (v_kabelo_app_id, 'https://storage.ofa.co.za/docs/kabelo_sithole_poa.pdf', 'Proof of Address', 'pending')
    ON CONFLICT DO NOTHING;

    -- ========================================================================
    -- STEP 4: Create applicant 3 - Ayanda Nkosi (Female, APS 38, isiXhosa, EC)
    -- ========================================================================
    SELECT id INTO v_ayanda_id
    FROM public.applicant_accounts
    WHERE email = 'ayanda.nkosi@test.ofa.co.za'
    LIMIT 1;

    IF v_ayanda_id IS NULL THEN
        INSERT INTO public.applicant_accounts (username, email, cellphone)
        VALUES ('ayanda_nkosi', 'ayanda.nkosi@test.ofa.co.za', '+27821234512')
        RETURNING id INTO v_ayanda_id;
        RAISE NOTICE 'Created applicant Ayanda Nkosi: %', v_ayanda_id;
    ELSE
        RAISE NOTICE 'Found applicant Ayanda Nkosi: %', v_ayanda_id;
    END IF;

    -- Create Ayanda's application
    SELECT id INTO v_ayanda_app_id
    FROM public.applications
    WHERE applicant_id = v_ayanda_id
    AND institution_id = v_eduvos_id
    AND course_id = v_bcom_accounting_id
    LIMIT 1;

    IF v_ayanda_app_id IS NULL THEN
        INSERT INTO public.applications (
            applicant_id, institution_id, course_id,
            university_name, faculty, qualification_type, program, year,
            personal_info, academic_info, status
        )
        VALUES (
            v_ayanda_id,
            v_eduvos_id,
            v_bcom_accounting_id,
            'Eduvos',
            'Commerce',
            'Undergraduate',
            'BCom Accounting',
            2026,
            '{
                "first_name": "Ayanda",
                "last_name": "Nkosi",
                "id_number": "0007085012084",
                "date_of_birth": "2000-07-08",
                "gender": "Female",
                "nationality": "South African",
                "citizenship": "South African",
                "home_language": "isiXhosa",
                "email": "ayanda.nkosi@test.ofa.co.za",
                "phone": "+27821234512",
                "address": {
                    "street": "78 Steve Biko Street",
                    "suburb": "East London",
                    "city": "Buffalo City",
                    "province": "Eastern Cape",
                    "postal_code": "5201"
                },
                "physical_address": "78 Steve Biko Street, East London, Buffalo City, Eastern Cape, 5201",
                "province": "Eastern Cape"
            }'::jsonb,
            '{
                "school_name": "East London Technical High School",
                "matric_year": 2018,
                "aps_score": 38,
                "highest_qualification": "National Senior Certificate",
                "subjects": [
                    {"name": "English Home Language", "level": "6", "grade": "B", "percentage": 75},
                    {"name": "Mathematics", "level": "7", "grade": "A", "percentage": 82},
                    {"name": "Accounting", "level": "7", "grade": "A", "percentage": 84},
                    {"name": "Business Studies", "level": "6", "grade": "B", "percentage": 76},
                    {"name": "Economics", "level": "6", "grade": "B", "percentage": 73},
                    {"name": "Life Orientation", "level": "7", "grade": "A", "percentage": 86}
                ]
            }'::jsonb,
            'pending'
        )
        RETURNING id INTO v_ayanda_app_id;
        RAISE NOTICE 'Created Ayanda application: %', v_ayanda_app_id;
    ELSE
        RAISE NOTICE 'Found Ayanda application: %', v_ayanda_app_id;
    END IF;

    -- Create application choice
    INSERT INTO public.application_choices (
        application_id, priority, course_id, institution_id, faculty_id, campus_id, status
    )
    VALUES (
        v_ayanda_app_id, 1, v_bcom_accounting_id, v_eduvos_id, v_commerce_faculty_id, v_midrand_campus_id, 'pending'
    )
    ON CONFLICT (application_id, priority) DO NOTHING;

    -- Create documents
    INSERT INTO public.application_documents (application_id, file_url, document_type, review_status)
    VALUES
        (v_ayanda_app_id, 'https://storage.ofa.co.za/docs/ayanda_nkosi_id.pdf', 'ID Document', 'pending'),
        (v_ayanda_app_id, 'https://storage.ofa.co.za/docs/ayanda_nkosi_matric.pdf', 'Matric Certificate', 'pending'),
        (v_ayanda_app_id, 'https://storage.ofa.co.za/docs/ayanda_nkosi_poa.pdf', 'Proof of Address', 'pending')
    ON CONFLICT DO NOTHING;

    -- ========================================================================
    -- STEP 5: Create applicant 4 - Naledi Khumalo (Female, APS 30, Setswana, NW)
    -- ========================================================================
    SELECT id INTO v_naledi_id
    FROM public.applicant_accounts
    WHERE email = 'naledi.khumalo@test.ofa.co.za'
    LIMIT 1;

    IF v_naledi_id IS NULL THEN
        INSERT INTO public.applicant_accounts (username, email, cellphone)
        VALUES ('naledi_khumalo', 'naledi.khumalo@test.ofa.co.za', '+27821234513')
        RETURNING id INTO v_naledi_id;
        RAISE NOTICE 'Created applicant Naledi Khumalo: %', v_naledi_id;
    ELSE
        RAISE NOTICE 'Found applicant Naledi Khumalo: %', v_naledi_id;
    END IF;

    -- Create Naledi's application
    SELECT id INTO v_naledi_app_id
    FROM public.applications
    WHERE applicant_id = v_naledi_id
    AND institution_id = v_eduvos_id
    AND course_id = v_bcom_accounting_id
    LIMIT 1;

    IF v_naledi_app_id IS NULL THEN
        INSERT INTO public.applications (
            applicant_id, institution_id, course_id,
            university_name, faculty, qualification_type, program, year,
            personal_info, academic_info, status
        )
        VALUES (
            v_naledi_id,
            v_eduvos_id,
            v_bcom_accounting_id,
            'Eduvos',
            'Commerce',
            'Undergraduate',
            'BCom Accounting',
            2026,
            '{
                "first_name": "Naledi",
                "last_name": "Khumalo",
                "id_number": "0309065012080",
                "date_of_birth": "2003-09-06",
                "gender": "Female",
                "nationality": "South African",
                "citizenship": "South African",
                "home_language": "Setswana",
                "email": "naledi.khumalo@test.ofa.co.za",
                "phone": "+27821234513",
                "address": {
                    "street": "12 Church Street",
                    "suburb": "Rustenburg",
                    "city": "Rustenburg",
                    "province": "North West",
                    "postal_code": "0299"
                },
                "physical_address": "12 Church Street, Rustenburg, Rustenburg, North West, 0299",
                "province": "North West"
            }'::jsonb,
            '{
                "school_name": "Rustenburg High School for Girls",
                "matric_year": 2021,
                "aps_score": 30,
                "highest_qualification": "National Senior Certificate",
                "subjects": [
                    {"name": "English First Additional Language", "level": "4", "grade": "D", "percentage": 58},
                    {"name": "Mathematics", "level": "5", "grade": "C", "percentage": 64},
                    {"name": "Accounting", "level": "5", "grade": "C", "percentage": 66},
                    {"name": "Business Studies", "level": "5", "grade": "C", "percentage": 62},
                    {"name": "Geography", "level": "5", "grade": "C", "percentage": 63},
                    {"name": "Life Orientation", "level": "6", "grade": "B", "percentage": 71}
                ]
            }'::jsonb,
            'pending'
        )
        RETURNING id INTO v_naledi_app_id;
        RAISE NOTICE 'Created Naledi application: %', v_naledi_app_id;
    ELSE
        RAISE NOTICE 'Found Naledi application: %', v_naledi_app_id;
    END IF;

    -- Create application choice
    INSERT INTO public.application_choices (
        application_id, priority, course_id, institution_id, faculty_id, campus_id, status
    )
    VALUES (
        v_naledi_app_id, 1, v_bcom_accounting_id, v_eduvos_id, v_commerce_faculty_id, v_midrand_campus_id, 'pending'
    )
    ON CONFLICT (application_id, priority) DO NOTHING;

    -- Create documents
    INSERT INTO public.application_documents (application_id, file_url, document_type, review_status)
    VALUES
        (v_naledi_app_id, 'https://storage.ofa.co.za/docs/naledi_khumalo_id.pdf', 'ID Document', 'pending'),
        (v_naledi_app_id, 'https://storage.ofa.co.za/docs/naledi_khumalo_matric.pdf', 'Matric Certificate', 'pending'),
        (v_naledi_app_id, 'https://storage.ofa.co.za/docs/naledi_khumalo_poa.pdf', 'Proof of Address', 'pending')
    ON CONFLICT DO NOTHING;

    -- ========================================================================
    -- STEP 6: Create applicant 5 - Tshepo Mabaso (Male, APS 28, Sepedi, Limpopo)
    -- ========================================================================
    SELECT id INTO v_tshepo_id
    FROM public.applicant_accounts
    WHERE email = 'tshepo.mabaso@test.ofa.co.za'
    LIMIT 1;

    IF v_tshepo_id IS NULL THEN
        INSERT INTO public.applicant_accounts (username, email, cellphone)
        VALUES ('tshepo_mabaso', 'tshepo.mabaso@test.ofa.co.za', '+27821234514')
        RETURNING id INTO v_tshepo_id;
        RAISE NOTICE 'Created applicant Tshepo Mabaso: %', v_tshepo_id;
    ELSE
        RAISE NOTICE 'Found applicant Tshepo Mabaso: %', v_tshepo_id;
    END IF;

    -- Create Tshepo's application
    SELECT id INTO v_tshepo_app_id
    FROM public.applications
    WHERE applicant_id = v_tshepo_id
    AND institution_id = v_eduvos_id
    AND course_id = v_bcom_accounting_id
    LIMIT 1;

    IF v_tshepo_app_id IS NULL THEN
        INSERT INTO public.applications (
            applicant_id, institution_id, course_id,
            university_name, faculty, qualification_type, program, year,
            personal_info, academic_info, status
        )
        VALUES (
            v_tshepo_id,
            v_eduvos_id,
            v_bcom_accounting_id,
            'Eduvos',
            'Commerce',
            'Undergraduate',
            'BCom Accounting',
            2026,
            '{
                "first_name": "Tshepo",
                "last_name": "Mabaso",
                "id_number": "0411225012085",
                "date_of_birth": "2004-11-22",
                "gender": "Male",
                "nationality": "South African",
                "citizenship": "South African",
                "home_language": "Sepedi",
                "email": "tshepo.mabaso@test.ofa.co.za",
                "phone": "+27821234514",
                "address": {
                    "street": "56 Hans van Rensburg Street",
                    "suburb": "Polokwane Central",
                    "city": "Polokwane",
                    "province": "Limpopo",
                    "postal_code": "0699"
                },
                "physical_address": "56 Hans van Rensburg Street, Polokwane Central, Polokwane, Limpopo, 0699",
                "province": "Limpopo"
            }'::jsonb,
            '{
                "school_name": "Polokwane High School",
                "matric_year": 2022,
                "aps_score": 28,
                "highest_qualification": "National Senior Certificate",
                "subjects": [
                    {"name": "English First Additional Language", "level": "4", "grade": "D", "percentage": 56},
                    {"name": "Mathematics", "level": "4", "grade": "D", "percentage": 54},
                    {"name": "Accounting", "level": "5", "grade": "C", "percentage": 62},
                    {"name": "Business Studies", "level": "5", "grade": "C", "percentage": 60},
                    {"name": "Agricultural Sciences", "level": "4", "grade": "D", "percentage": 57},
                    {"name": "Life Orientation", "level": "6", "grade": "B", "percentage": 69}
                ]
            }'::jsonb,
            'pending'
        )
        RETURNING id INTO v_tshepo_app_id;
        RAISE NOTICE 'Created Tshepo application: %', v_tshepo_app_id;
    ELSE
        RAISE NOTICE 'Found Tshepo application: %', v_tshepo_app_id;
    END IF;

    -- Create application choice
    INSERT INTO public.application_choices (
        application_id, priority, course_id, institution_id, faculty_id, campus_id, status
    )
    VALUES (
        v_tshepo_app_id, 1, v_bcom_accounting_id, v_eduvos_id, v_commerce_faculty_id, v_midrand_campus_id, 'pending'
    )
    ON CONFLICT (application_id, priority) DO NOTHING;

    -- Create documents
    INSERT INTO public.application_documents (application_id, file_url, document_type, review_status)
    VALUES
        (v_tshepo_app_id, 'https://storage.ofa.co.za/docs/tshepo_mabaso_id.pdf', 'ID Document', 'pending'),
        (v_tshepo_app_id, 'https://storage.ofa.co.za/docs/tshepo_mabaso_matric.pdf', 'Matric Certificate', 'pending'),
        (v_tshepo_app_id, 'https://storage.ofa.co.za/docs/tshepo_mabaso_poa.pdf', 'Proof of Address', 'pending')
    ON CONFLICT DO NOTHING;

    -- ========================================================================
    -- SUMMARY
    -- ========================================================================
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Fresh BCom Accounting test data seeding complete!';
    RAISE NOTICE 'Institution: Eduvos (%)' , v_eduvos_id;
    RAISE NOTICE 'Course: BCom Accounting (%)' , v_bcom_accounting_id;
    RAISE NOTICE 'Applicants created: 5';
    RAISE NOTICE '  1. Lerato Mokoena (%, APS 32, Gauteng)', v_lerato_id;
    RAISE NOTICE '  2. Kabelo Sithole (%, APS 35, KZN)', v_kabelo_id;
    RAISE NOTICE '  3. Ayanda Nkosi (%, APS 38, Eastern Cape)', v_ayanda_id;
    RAISE NOTICE '  4. Naledi Khumalo (%, APS 30, North West)', v_naledi_id;
    RAISE NOTICE '  5. Tshepo Mabaso (%, APS 28, Limpopo)', v_tshepo_id;
    RAISE NOTICE 'Applications: 5 (all BCom Accounting)';
    RAISE NOTICE 'Application choices: 5 (all priority 1, pending)';
    RAISE NOTICE 'Documents: 15 (3 per applicant, all pending review)';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
/*
-- Check fresh test applicants
SELECT
    aa.id,
    aa.username,
    aa.email,
    aa.cellphone
FROM public.applicant_accounts aa
WHERE aa.email IN (
    'lerato.mokoena@test.ofa.co.za',
    'kabelo.sithole@test.ofa.co.za',
    'ayanda.nkosi@test.ofa.co.za',
    'naledi.khumalo@test.ofa.co.za',
    'tshepo.mabaso@test.ofa.co.za'
);

-- Check applications with choices and documents
SELECT
    a.id AS application_id,
    aa.username,
    aa.email,
    (a.personal_info->>'first_name') || ' ' || (a.personal_info->>'last_name') AS full_name,
    (a.academic_info->>'aps_score')::int AS aps_score,
    a.personal_info->>'province' AS province,
    a.status AS app_status,
    ac.priority,
    c.name AS course_name,
    ac.status AS choice_status,
    COUNT(ad.id) AS document_count
FROM public.applications a
JOIN public.applicant_accounts aa ON aa.id = a.applicant_id
LEFT JOIN public.application_choices ac ON ac.application_id = a.id
LEFT JOIN public.courses c ON c.id = ac.course_id
LEFT JOIN public.application_documents ad ON ad.application_id = a.id
WHERE aa.email LIKE '%@test.ofa.co.za'
AND aa.email IN (
    'lerato.mokoena@test.ofa.co.za',
    'kabelo.sithole@test.ofa.co.za',
    'ayanda.nkosi@test.ofa.co.za',
    'naledi.khumalo@test.ofa.co.za',
    'tshepo.mabaso@test.ofa.co.za'
)
GROUP BY a.id, aa.username, aa.email, full_name, aps_score, province, a.status, ac.priority, c.name, ac.status
ORDER BY aps_score DESC, aa.username;

-- Check documents by applicant
SELECT
    aa.username,
    (a.personal_info->>'first_name') || ' ' || (a.personal_info->>'last_name') AS full_name,
    ad.document_type,
    ad.review_status,
    ad.file_url
FROM public.application_documents ad
JOIN public.applications a ON a.id = ad.application_id
JOIN public.applicant_accounts aa ON aa.id = a.applicant_id
WHERE aa.email IN (
    'lerato.mokoena@test.ofa.co.za',
    'kabelo.sithole@test.ofa.co.za',
    'ayanda.nkosi@test.ofa.co.za',
    'naledi.khumalo@test.ofa.co.za',
    'tshepo.mabaso@test.ofa.co.za'
)
ORDER BY aa.username, ad.document_type;
*/

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON SCHEMA public IS 'Migration 023: Created 5 fresh BCom Accounting test applications with complete personal info, academic info, application choices, and documents';
