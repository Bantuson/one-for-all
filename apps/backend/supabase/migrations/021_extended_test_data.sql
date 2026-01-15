-- Migration: 021_extended_test_data
-- Description: Extend test applicants with comprehensive data and documents
-- Created: 2026-01-14

-- ============================================================================
-- UPDATE TEST APPLICANTS WITH COMPREHENSIVE DATA
-- ============================================================================

DO $$
DECLARE
    -- Test applicant IDs
    v_thabo_id UUID;
    v_nomsa_id UUID;
    v_sipho_id UUID;

    -- Test application IDs
    v_thabo_app_id UUID;
    v_nomsa_app_id UUID;
    v_sipho_app_id UUID;

    -- Institution ID
    v_eduvos_id UUID;
BEGIN
    -- ========================================================================
    -- STEP 1: Get test applicant IDs
    -- ========================================================================
    SELECT id INTO v_thabo_id
    FROM public.applicant_accounts
    WHERE email = 'thabo.molefe@test.ofa.co.za'
    LIMIT 1;

    SELECT id INTO v_nomsa_id
    FROM public.applicant_accounts
    WHERE email = 'nomsa.dlamini@test.ofa.co.za'
    LIMIT 1;

    SELECT id INTO v_sipho_id
    FROM public.applicant_accounts
    WHERE email = 'sipho.ndlovu@test.ofa.co.za'
    LIMIT 1;

    -- Get Eduvos institution ID
    SELECT id INTO v_eduvos_id
    FROM public.institutions
    WHERE slug = 'eduvos'
    LIMIT 1;

    -- Check if test data exists
    IF v_thabo_id IS NULL OR v_nomsa_id IS NULL OR v_sipho_id IS NULL THEN
        RAISE WARNING 'Test applicants not found - run migration 018 first';
        RETURN;
    END IF;

    IF v_eduvos_id IS NULL THEN
        RAISE WARNING 'Eduvos institution not found - skipping extended test data';
        RETURN;
    END IF;

    RAISE NOTICE 'Found test applicants: Thabo (%), Nomsa (%), Sipho (%)', v_thabo_id, v_nomsa_id, v_sipho_id;

    -- ========================================================================
    -- STEP 2: Get application IDs
    -- ========================================================================
    SELECT id INTO v_thabo_app_id
    FROM public.applications
    WHERE applicant_id = v_thabo_id
    AND institution_id = v_eduvos_id
    LIMIT 1;

    SELECT id INTO v_nomsa_app_id
    FROM public.applications
    WHERE applicant_id = v_nomsa_id
    AND institution_id = v_eduvos_id
    LIMIT 1;

    SELECT id INTO v_sipho_app_id
    FROM public.applications
    WHERE applicant_id = v_sipho_id
    AND institution_id = v_eduvos_id
    LIMIT 1;

    IF v_thabo_app_id IS NULL OR v_nomsa_app_id IS NULL OR v_sipho_app_id IS NULL THEN
        RAISE WARNING 'Test applications not found - run migration 018 first';
        RETURN;
    END IF;

    RAISE NOTICE 'Found test applications: Thabo (%), Nomsa (%), Sipho (%)', v_thabo_app_id, v_nomsa_app_id, v_sipho_app_id;

    -- ========================================================================
    -- STEP 3: Update Thabo Molefe with comprehensive data
    -- ========================================================================
    RAISE NOTICE 'Updating Thabo Molefe personal_info...';

    UPDATE public.applications
    SET personal_info = jsonb_set(
        jsonb_set(
            jsonb_set(
                jsonb_set(
                    jsonb_set(
                        personal_info,
                        '{physical_address}',
                        '"123 Main Road, Midrand, Gauteng, 1685"'
                    ),
                    '{province}',
                    '"Gauteng"'
                ),
                '{home_language}',
                '"Zulu"'
            ),
            '{citizenship}',
            '"South African"'
        ),
        '{gender}',
        '"Male"'
    )
    WHERE id = v_thabo_app_id;

    RAISE NOTICE 'Updated Thabo personal_info';

    -- ========================================================================
    -- STEP 4: Update Nomsa Dlamini with comprehensive data
    -- ========================================================================
    RAISE NOTICE 'Updating Nomsa Dlamini personal_info...';

    UPDATE public.applications
    SET personal_info = jsonb_set(
        jsonb_set(
            jsonb_set(
                jsonb_set(
                    jsonb_set(
                        personal_info,
                        '{physical_address}',
                        '"45 Sisulu Avenue, Centurion, Gauteng, 0157"'
                    ),
                    '{province}',
                    '"KwaZulu-Natal"'
                ),
                '{home_language}',
                '"Zulu"'
            ),
            '{citizenship}',
            '"South African"'
        ),
        '{gender}',
        '"Female"'
    )
    WHERE id = v_nomsa_app_id;

    RAISE NOTICE 'Updated Nomsa personal_info';

    -- ========================================================================
    -- STEP 5: Update Sipho Ndlovu with comprehensive data
    -- ========================================================================
    RAISE NOTICE 'Updating Sipho Ndlovu personal_info...';

    UPDATE public.applications
    SET personal_info = jsonb_set(
        jsonb_set(
            jsonb_set(
                jsonb_set(
                    jsonb_set(
                        personal_info,
                        '{physical_address}',
                        '"78 Biko Road, Sandton, Gauteng, 2196"'
                    ),
                    '{province}',
                    '"Limpopo"'
                ),
                '{home_language}',
                '"Sepedi"'
            ),
            '{citizenship}',
            '"South African"'
        ),
        '{gender}',
        '"Male"'
    )
    WHERE id = v_sipho_app_id;

    RAISE NOTICE 'Updated Sipho personal_info';

    -- ========================================================================
    -- STEP 6: Insert Thabo's documents (3 approved)
    -- ========================================================================
    RAISE NOTICE 'Creating Thabo documents...';

    INSERT INTO public.application_documents (
        application_id,
        file_url,
        document_type,
        review_status,
        reviewed_by,
        reviewed_at,
        uploaded_at
    )
    VALUES
        (
            v_thabo_app_id,
            'https://storage.example.com/thabo-id-document.pdf',
            'ID Document',
            'approved',
            v_thabo_id,
            NOW() - INTERVAL '3 days',
            NOW() - INTERVAL '5 days'
        ),
        (
            v_thabo_app_id,
            'https://storage.example.com/thabo-matric-cert.pdf',
            'Matric Certificate',
            'approved',
            v_thabo_id,
            NOW() - INTERVAL '3 days',
            NOW() - INTERVAL '5 days'
        ),
        (
            v_thabo_app_id,
            'https://storage.example.com/thabo-proof-of-address.pdf',
            'Proof of Address',
            'pending',
            NULL,
            NULL,
            NOW() - INTERVAL '2 days'
        )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created Thabo documents';

    -- ========================================================================
    -- STEP 7: Insert Nomsa's documents (3 approved)
    -- ========================================================================
    RAISE NOTICE 'Creating Nomsa documents...';

    INSERT INTO public.application_documents (
        application_id,
        file_url,
        document_type,
        review_status,
        reviewed_by,
        reviewed_at,
        uploaded_at
    )
    VALUES
        (
            v_nomsa_app_id,
            'https://storage.example.com/nomsa-id-document.pdf',
            'ID Document',
            'approved',
            v_nomsa_id,
            NOW() - INTERVAL '4 days',
            NOW() - INTERVAL '6 days'
        ),
        (
            v_nomsa_app_id,
            'https://storage.example.com/nomsa-matric-cert.pdf',
            'Matric Certificate',
            'approved',
            v_nomsa_id,
            NOW() - INTERVAL '4 days',
            NOW() - INTERVAL '6 days'
        ),
        (
            v_nomsa_app_id,
            'https://storage.example.com/nomsa-proof-of-address.pdf',
            'Proof of Address',
            'approved',
            v_nomsa_id,
            NOW() - INTERVAL '4 days',
            NOW() - INTERVAL '6 days'
        )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created Nomsa documents';

    -- ========================================================================
    -- STEP 8: Insert Sipho's documents (1 approved, 1 flagged, 1 pending)
    -- ========================================================================
    RAISE NOTICE 'Creating Sipho documents...';

    INSERT INTO public.application_documents (
        application_id,
        file_url,
        document_type,
        review_status,
        reviewed_by,
        reviewed_at,
        uploaded_at
    )
    VALUES
        (
            v_sipho_app_id,
            'https://storage.example.com/sipho-id-document.pdf',
            'ID Document',
            'approved',
            v_sipho_id,
            NOW() - INTERVAL '2 days',
            NOW() - INTERVAL '4 days'
        )
    ON CONFLICT DO NOTHING;

    INSERT INTO public.application_documents (
        application_id,
        file_url,
        document_type,
        review_status,
        flag_reason,
        flagged_by,
        flagged_at,
        uploaded_at
    )
    VALUES
        (
            v_sipho_app_id,
            'https://storage.example.com/sipho-matric-cert.pdf',
            'Matric Certificate',
            'flagged',
            'Certificate unclear, please upload clearer copy',
            v_sipho_id,
            NOW() - INTERVAL '1 day',
            NOW() - INTERVAL '4 days'
        )
    ON CONFLICT DO NOTHING;

    INSERT INTO public.application_documents (
        application_id,
        file_url,
        document_type,
        review_status,
        uploaded_at
    )
    VALUES
        (
            v_sipho_app_id,
            'https://storage.example.com/sipho-proof-of-address.pdf',
            'Proof of Address',
            'pending',
            NOW() - INTERVAL '1 day'
        )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Created Sipho documents';

    -- ========================================================================
    -- SUMMARY
    -- ========================================================================
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Extended test data complete!';
    RAISE NOTICE 'Updated 3 applicants with comprehensive personal info';
    RAISE NOTICE 'Created 9 test documents:';
    RAISE NOTICE '  - Thabo: 2 approved, 1 pending';
    RAISE NOTICE '  - Nomsa: 3 approved';
    RAISE NOTICE '  - Sipho: 1 approved, 1 flagged, 1 pending';
    RAISE NOTICE '========================================';
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
/*
-- Check updated personal_info
SELECT
    aa.username,
    a.personal_info->>'province' AS province,
    a.personal_info->>'home_language' AS home_language,
    a.personal_info->>'citizenship' AS citizenship,
    a.personal_info->>'gender' AS gender,
    a.personal_info->>'physical_address' AS physical_address
FROM public.applications a
JOIN public.applicant_accounts aa ON aa.id = a.applicant_id
WHERE aa.email LIKE '%@test.ofa.co.za'
ORDER BY aa.username;

-- Check documents and review status
SELECT
    aa.username,
    ad.document_type,
    ad.review_status,
    ad.flag_reason,
    ad.uploaded_at,
    ad.reviewed_at
FROM public.application_documents ad
JOIN public.applications a ON a.id = ad.application_id
JOIN public.applicant_accounts aa ON aa.id = a.applicant_id
WHERE aa.email LIKE '%@test.ofa.co.za'
ORDER BY aa.username, ad.document_type;
*/

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON SCHEMA public IS 'Migration 021: Extended test data with comprehensive personal info and document review statuses';
