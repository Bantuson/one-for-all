-- Migration: 033_document_security_fields
-- Description: Add security fields for document processing (H5 security fix)
--   - file_hash: SHA-256 hash of file content for integrity verification
--   - scan_status: Antivirus/malware scan status tracking
--   - upload_ip_address: IP address of uploader for audit trail
--   - detected_mime_type: Deep MIME type detection via python-magic
-- Created: 2026-01-21

-- ============================================================================
-- Part 1: Add security columns to application_documents
-- ============================================================================

-- SHA-256 hash of file content for integrity verification and deduplication
ALTER TABLE public.application_documents
    ADD COLUMN IF NOT EXISTS file_hash TEXT;

COMMENT ON COLUMN public.application_documents.file_hash IS 'SHA-256 hash of file content for integrity verification';

-- Antivirus/malware scan status
-- Values: pending (awaiting scan), clean (passed), infected (failed), skipped (not scanned), error (scan failed)
ALTER TABLE public.application_documents
    ADD COLUMN IF NOT EXISTS scan_status TEXT DEFAULT 'pending';

COMMENT ON COLUMN public.application_documents.scan_status IS 'Antivirus scan status: pending, clean, infected, skipped, error';

-- Constraint to ensure valid scan_status values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'application_documents_scan_status_check'
    ) THEN
        ALTER TABLE public.application_documents
            ADD CONSTRAINT application_documents_scan_status_check
            CHECK (scan_status IN ('pending', 'clean', 'infected', 'skipped', 'error'));
    END IF;
END $$;

-- IP address of the uploader for security audit trail
ALTER TABLE public.application_documents
    ADD COLUMN IF NOT EXISTS upload_ip_address INET;

COMMENT ON COLUMN public.application_documents.upload_ip_address IS 'IP address of uploader for security audit';

-- Deep MIME type detected via python-magic (not trusting file extension)
ALTER TABLE public.application_documents
    ADD COLUMN IF NOT EXISTS detected_mime_type TEXT;

COMMENT ON COLUMN public.application_documents.detected_mime_type IS 'MIME type detected via python-magic for security validation';

-- ============================================================================
-- Part 2: Add security columns to nsfas_documents
-- ============================================================================

-- SHA-256 hash of file content
ALTER TABLE public.nsfas_documents
    ADD COLUMN IF NOT EXISTS file_hash TEXT;

COMMENT ON COLUMN public.nsfas_documents.file_hash IS 'SHA-256 hash of file content for integrity verification';

-- Antivirus/malware scan status
ALTER TABLE public.nsfas_documents
    ADD COLUMN IF NOT EXISTS scan_status TEXT DEFAULT 'pending';

COMMENT ON COLUMN public.nsfas_documents.scan_status IS 'Antivirus scan status: pending, clean, infected, skipped, error';

-- Constraint to ensure valid scan_status values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'nsfas_documents_scan_status_check'
    ) THEN
        ALTER TABLE public.nsfas_documents
            ADD CONSTRAINT nsfas_documents_scan_status_check
            CHECK (scan_status IN ('pending', 'clean', 'infected', 'skipped', 'error'));
    END IF;
END $$;

-- IP address of the uploader
ALTER TABLE public.nsfas_documents
    ADD COLUMN IF NOT EXISTS upload_ip_address INET;

COMMENT ON COLUMN public.nsfas_documents.upload_ip_address IS 'IP address of uploader for security audit';

-- Deep MIME type detection
ALTER TABLE public.nsfas_documents
    ADD COLUMN IF NOT EXISTS detected_mime_type TEXT;

COMMENT ON COLUMN public.nsfas_documents.detected_mime_type IS 'MIME type detected via python-magic for security validation';

-- ============================================================================
-- Part 3: Add indexes for efficient querying by scan_status
-- ============================================================================

-- Index on scan_status for application_documents
-- Enables efficient queries for documents pending scan or with security issues
CREATE INDEX IF NOT EXISTS idx_application_documents_scan_status
    ON public.application_documents (scan_status)
    WHERE scan_status != 'clean';

COMMENT ON INDEX idx_application_documents_scan_status IS 'Partial index for documents needing attention (not clean)';

-- Index on scan_status for nsfas_documents
CREATE INDEX IF NOT EXISTS idx_nsfas_documents_scan_status
    ON public.nsfas_documents (scan_status)
    WHERE scan_status != 'clean';

COMMENT ON INDEX idx_nsfas_documents_scan_status IS 'Partial index for documents needing attention (not clean)';

-- Index on file_hash for duplicate detection
CREATE INDEX IF NOT EXISTS idx_application_documents_file_hash
    ON public.application_documents (file_hash)
    WHERE file_hash IS NOT NULL;

COMMENT ON INDEX idx_application_documents_file_hash IS 'Index for file deduplication and integrity checks';

CREATE INDEX IF NOT EXISTS idx_nsfas_documents_file_hash
    ON public.nsfas_documents (file_hash)
    WHERE file_hash IS NOT NULL;

COMMENT ON INDEX idx_nsfas_documents_file_hash IS 'Index for file deduplication and integrity checks';
