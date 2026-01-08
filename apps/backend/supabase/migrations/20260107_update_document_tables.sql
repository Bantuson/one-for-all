-- ============================================================================
-- Phase 3: Update Document Tables Schema
-- ============================================================================
-- Adds file_name and storage_path columns to application_documents and
-- nsfas_documents tables for better file tracking.
--
-- Created: 2026-01-07
-- ============================================================================

-- ============================================================================
-- Update application_documents table
-- ============================================================================

-- Add file_name column (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'application_documents' AND column_name = 'file_name'
  ) THEN
    ALTER TABLE application_documents
    ADD COLUMN file_name text;
  END IF;
END $$;

-- Add storage_path column (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'application_documents' AND column_name = 'storage_path'
  ) THEN
    ALTER TABLE application_documents
    ADD COLUMN storage_path text;
  END IF;
END $$;

-- Add file_size column for tracking (optional but useful)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'application_documents' AND column_name = 'file_size'
  ) THEN
    ALTER TABLE application_documents
    ADD COLUMN file_size integer;
  END IF;
END $$;

-- Add mime_type column for tracking file types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'application_documents' AND column_name = 'mime_type'
  ) THEN
    ALTER TABLE application_documents
    ADD COLUMN mime_type text;
  END IF;
END $$;

-- ============================================================================
-- Update nsfas_documents table
-- ============================================================================

-- Add file_name column (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nsfas_documents' AND column_name = 'file_name'
  ) THEN
    ALTER TABLE nsfas_documents
    ADD COLUMN file_name text;
  END IF;
END $$;

-- Add storage_path column (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nsfas_documents' AND column_name = 'storage_path'
  ) THEN
    ALTER TABLE nsfas_documents
    ADD COLUMN storage_path text;
  END IF;
END $$;

-- Add file_size column for tracking (optional but useful)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nsfas_documents' AND column_name = 'file_size'
  ) THEN
    ALTER TABLE nsfas_documents
    ADD COLUMN file_size integer;
  END IF;
END $$;

-- Add mime_type column for tracking file types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nsfas_documents' AND column_name = 'mime_type'
  ) THEN
    ALTER TABLE nsfas_documents
    ADD COLUMN mime_type text;
  END IF;
END $$;

-- ============================================================================
-- Add indexes for better query performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_appdocs_storage_path
ON application_documents (storage_path);

CREATE INDEX IF NOT EXISTS idx_nsfasdocs_storage_path
ON nsfas_documents (storage_path);

-- ============================================================================
-- Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN application_documents.file_name IS 'Original filename uploaded by user';
COMMENT ON COLUMN application_documents.storage_path IS 'Path in Supabase Storage bucket (e.g., application_id/document_type/uuid.pdf)';
COMMENT ON COLUMN application_documents.file_size IS 'File size in bytes';
COMMENT ON COLUMN application_documents.mime_type IS 'MIME type of the file (e.g., application/pdf, image/jpeg)';

COMMENT ON COLUMN nsfas_documents.file_name IS 'Original filename uploaded by user';
COMMENT ON COLUMN nsfas_documents.storage_path IS 'Path in Supabase Storage bucket (e.g., nsfas_application_id/document_type/uuid.pdf)';
COMMENT ON COLUMN nsfas_documents.file_size IS 'File size in bytes';
COMMENT ON COLUMN nsfas_documents.mime_type IS 'MIME type of the file (e.g., application/pdf, image/jpeg)';
