-- Migration 022: Remove existing test data
-- Clean slate before creating fresh test applications

DO $$
BEGIN
    -- Delete test applications (cascades to choices and documents via foreign keys)
    DELETE FROM applications
    WHERE applicant_id IN (
        SELECT id FROM applicant_accounts
        WHERE email LIKE '%@test.ofa.co.za'
    );

    -- Delete test applicant accounts
    DELETE FROM applicant_accounts WHERE email LIKE '%@test.ofa.co.za';

    RAISE NOTICE 'Existing test data removed successfully';
END $$;
