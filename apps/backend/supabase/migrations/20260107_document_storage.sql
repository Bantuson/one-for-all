-- ============================================================================
-- Phase 3: Document Upload System - Supabase Storage Setup
-- ============================================================================
-- This migration creates storage buckets for application and NSFAS documents
-- and sets up Row-Level Security (RLS) policies for secure document access.
--
-- Created: 2026-01-07
-- ============================================================================

-- Create storage buckets for document uploads
-- application-documents: For university application supporting documents
-- nsfas-documents: For NSFAS funding application documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'application-documents',
    'application-documents',
    false,  -- Private bucket, requires authentication
    10485760,  -- 10MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
  ),
  (
    'nsfas-documents',
    'nsfas-documents',
    false,  -- Private bucket, requires authentication
    10485760,  -- 10MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
  )
ON CONFLICT (id) DO NOTHING;  -- Prevent duplicate bucket creation

-- ============================================================================
-- RLS Policies for Application Documents
-- ============================================================================

-- Allow users to upload their own application documents
CREATE POLICY "Users can upload application documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'application-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text
    FROM applications
    WHERE applicant_id = auth.uid()::text
  )
);

-- Allow users to view their own application documents
CREATE POLICY "Users can view their own application documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'application-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text
    FROM applications
    WHERE applicant_id = auth.uid()::text
  )
);

-- Allow users to delete their own application documents
CREATE POLICY "Users can delete their own application documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'application-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text
    FROM applications
    WHERE applicant_id = auth.uid()::text
  )
);

-- ============================================================================
-- RLS Policies for NSFAS Documents
-- ============================================================================

-- Allow users to upload their own NSFAS documents
CREATE POLICY "Users can upload NSFAS documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'nsfas-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text
    FROM nsfas_applications
    WHERE applicant_id = auth.uid()::text
  )
);

-- Allow users to view their own NSFAS documents
CREATE POLICY "Users can view their own NSFAS documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'nsfas-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text
    FROM nsfas_applications
    WHERE applicant_id = auth.uid()::text
  )
);

-- Allow users to delete their own NSFAS documents
CREATE POLICY "Users can delete their own NSFAS documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'nsfas-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text
    FROM nsfas_applications
    WHERE applicant_id = auth.uid()::text
  )
);

-- ============================================================================
-- Service Role Bypass (for CrewAI agents using service role key)
-- ============================================================================
-- The service role key bypasses RLS, allowing CrewAI agents to upload
-- documents on behalf of users during the application flow.

-- Grant storage permissions to service role
GRANT ALL ON storage.objects TO service_role;
GRANT ALL ON storage.buckets TO service_role;
