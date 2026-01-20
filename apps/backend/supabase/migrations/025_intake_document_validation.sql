-- Add columns for intake document validation
ALTER TABLE public.application_documents
    ADD COLUMN IF NOT EXISTS agent_validated BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS validation_tier TEXT CHECK (validation_tier IN ('rule_based', 'ai_vision')),
    ADD COLUMN IF NOT EXISTS validation_details JSONB DEFAULT '{}';

ALTER TABLE public.applications
    ADD COLUMN IF NOT EXISTS documents_validated BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS documents_validated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_appdocs_agent_validated
    ON public.application_documents(agent_validated, application_id);

-- Add comment for documentation
COMMENT ON COLUMN public.application_documents.agent_validated IS 'Whether this document has been validated by the intake agent';
COMMENT ON COLUMN public.application_documents.validation_tier IS 'Validation method: rule_based (format/size checks) or ai_vision (GPT-4V analysis)';
COMMENT ON COLUMN public.application_documents.validation_details IS 'JSON containing validation results, scores, and any issues found';
COMMENT ON COLUMN public.applications.documents_validated IS 'Whether all required documents have been validated for this application';
