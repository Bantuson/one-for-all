-- Migration: OTP Verification System
-- Description: Create otp_codes table for real OTP verification flow
-- Date: 2026-01-07

-- OTP codes table for verification
CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier TEXT NOT NULL,           -- email or phone number
    channel TEXT NOT NULL,              -- 'email', 'sms', 'whatsapp'
    code TEXT NOT NULL,                 -- 6-digit code
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
    verified_at TIMESTAMPTZ,            -- NULL until verified
    attempts INT DEFAULT 0,             -- Track failed attempts
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Indexes for fast lookup
    CONSTRAINT valid_channel CHECK (channel IN ('email', 'sms', 'whatsapp'))
);

-- Index for fast OTP verification lookups (only active codes)
CREATE INDEX idx_otp_lookup ON otp_codes(identifier, code)
WHERE verified_at IS NULL AND expires_at > NOW();

-- Index for cleanup operations (expired codes)
CREATE INDEX idx_otp_cleanup ON otp_codes(expires_at)
WHERE verified_at IS NULL;

-- Index for audit queries
CREATE INDEX idx_otp_created ON otp_codes(created_at);

-- RLS policies
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- Only service role can access OTP codes (security: prevent user access to OTP table)
CREATE POLICY "Service role full access" ON otp_codes
FOR ALL USING (auth.role() = 'service_role');

-- Comment the table
COMMENT ON TABLE otp_codes IS 'Stores OTP verification codes with 10-minute expiry for email/SMS/WhatsApp channels';
COMMENT ON COLUMN otp_codes.identifier IS 'Email address or phone number where OTP was sent';
COMMENT ON COLUMN otp_codes.channel IS 'Delivery channel: email, sms, or whatsapp';
COMMENT ON COLUMN otp_codes.code IS '6-digit verification code';
COMMENT ON COLUMN otp_codes.expires_at IS 'OTP expiration timestamp (default 10 minutes from creation)';
COMMENT ON COLUMN otp_codes.verified_at IS 'Timestamp when OTP was successfully verified (NULL until verified)';
COMMENT ON COLUMN otp_codes.attempts IS 'Number of verification attempts (max 3 allowed)';
