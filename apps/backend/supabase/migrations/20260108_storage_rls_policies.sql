-- Storage RLS Policies for One For All
-- APPLIED via Supabase MCP on 2026-01-08
--
-- Security Model:
--   - Agents (service_role): INSERT only - upload docs, never read/delete
--   - Dashboard (authenticated): Full access to own documents
--   - Tests (anon): Full access to TEST-* prefixed documents

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SERVICE ROLE POLICIES (agents - upload only, no read/delete)
-- ============================================================================

CREATE POLICY "Service role can upload documents"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (true);

-- ============================================================================
-- APPLICATION DOCUMENTS BUCKET POLICIES
-- ============================================================================

-- Users can upload their own application documents
-- Path format: {applicant_id}/{filename}
CREATE POLICY "Users can upload application documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'application-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own application documents
CREATE POLICY "Users can view application documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'application-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own application documents
CREATE POLICY "Users can delete application documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'application-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- NSFAS DOCUMENTS BUCKET POLICIES
-- ============================================================================

-- Users can upload their own NSFAS documents
CREATE POLICY "Users can upload nsfas documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'nsfas-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own NSFAS documents
CREATE POLICY "Users can view nsfas documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'nsfas-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can delete their own NSFAS documents
CREATE POLICY "Users can delete nsfas documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'nsfas-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================================
-- TEST DATA POLICIES (for CI/CD and local testing)
-- ============================================================================

-- Anonymous users can upload with TEST- prefix (for API testing)
CREATE POLICY "Test uploads allowed"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  (storage.foldername(name))[1] LIKE 'TEST-%'
);

-- Anonymous can view TEST- documents
CREATE POLICY "Test views allowed"
ON storage.objects
FOR SELECT
TO anon
USING (
  (storage.foldername(name))[1] LIKE 'TEST-%'
);

-- Anonymous can delete TEST- documents
CREATE POLICY "Test deletes allowed"
ON storage.objects
FOR DELETE
TO anon
USING (
  (storage.foldername(name))[1] LIKE 'TEST-%'
);
