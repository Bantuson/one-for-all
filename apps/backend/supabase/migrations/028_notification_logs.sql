-- Migration: 028_notification_logs.sql
-- Description: Create notification_logs table for multi-channel notification tracking
-- Created: 2026-01-20
-- Phase 2: WhatsApp-primary notification routing with SMS fallback and email archive

-- =============================================================================
-- NOTIFICATION LOGS TABLE
-- Tracks all notification delivery attempts across channels
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Recipient Information
    recipient TEXT NOT NULL,                          -- Phone number or email address
    recipient_type TEXT NOT NULL DEFAULT 'phone',     -- 'phone' or 'email'

    -- Notification Details
    notification_type TEXT NOT NULL,                  -- 'otp', 'application_update', 'reminder', 'marketing'
    message_preview TEXT,                             -- First 100 chars of message for debugging
    priority TEXT NOT NULL DEFAULT 'normal',          -- 'high', 'normal', 'low'

    -- Channel & Routing
    channel TEXT NOT NULL,                            -- 'whatsapp', 'sms', 'email'
    channel_priority INTEGER NOT NULL DEFAULT 1,     -- 1 = primary attempt, 2+ = failover
    was_failover BOOLEAN NOT NULL DEFAULT FALSE,
    original_channel TEXT,                            -- If failover, what was the original channel?

    -- Delivery Status
    status TEXT NOT NULL DEFAULT 'pending',           -- 'pending', 'sent', 'delivered', 'failed', 'expired'
    provider_message_id TEXT,                         -- Twilio SID, SendGrid message ID, etc.
    error_code TEXT,
    error_message TEXT,

    -- Timing
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,

    -- Cost Tracking
    estimated_cost_usd DECIMAL(10, 6),                -- Estimated cost in USD

    -- Retry Information
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMPTZ,

    -- Foreign Keys (optional - links to applicant if available)
    applicant_id UUID REFERENCES applicant_accounts(id) ON DELETE SET NULL,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb               -- Additional context (template_name, etc.)
);

-- =============================================================================
-- INDEXES FOR COMMON QUERY PATTERNS
-- =============================================================================

-- Lookup by recipient (most common query)
CREATE INDEX idx_notification_logs_recipient ON notification_logs(recipient);

-- Time-based queries for analytics
CREATE INDEX idx_notification_logs_created ON notification_logs(created_at DESC);

-- Status filtering for monitoring/debugging
CREATE INDEX idx_notification_logs_status ON notification_logs(status);

-- Channel analytics
CREATE INDEX idx_notification_logs_channel ON notification_logs(channel);

-- Notification type filtering
CREATE INDEX idx_notification_logs_type ON notification_logs(notification_type);

-- Composite index for retry queue processing
CREATE INDEX idx_notification_logs_retry_queue
    ON notification_logs(status, next_retry_at)
    WHERE status = 'failed' AND retry_count < max_retries;

-- Composite index for delivery rate analysis
CREATE INDEX idx_notification_logs_delivery_analysis
    ON notification_logs(channel, status, created_at DESC);

-- =============================================================================
-- USER NOTIFICATION PREFERENCES TABLE
-- Stores per-user channel preferences for routing decisions
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User identifier (phone or email)
    identifier TEXT NOT NULL UNIQUE,
    identifier_type TEXT NOT NULL DEFAULT 'phone',    -- 'phone' or 'email'

    -- Channel Preferences (1 = most preferred)
    preferred_channel TEXT NOT NULL DEFAULT 'whatsapp',
    channel_priority JSONB NOT NULL DEFAULT '{"whatsapp": 1, "sms": 2, "email": 3}'::jsonb,

    -- WhatsApp Availability
    whatsapp_available BOOLEAN NOT NULL DEFAULT TRUE,
    whatsapp_opt_in BOOLEAN NOT NULL DEFAULT TRUE,
    whatsapp_last_delivery_status TEXT,               -- Last known delivery status

    -- SMS Availability
    sms_available BOOLEAN NOT NULL DEFAULT TRUE,
    sms_opt_in BOOLEAN NOT NULL DEFAULT TRUE,

    -- Email Availability
    email_address TEXT,                                -- May differ from phone-based identifier
    email_opt_in BOOLEAN NOT NULL DEFAULT TRUE,

    -- Quiet Hours (user timezone)
    quiet_hours_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '07:00',
    timezone TEXT DEFAULT 'Africa/Johannesburg',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Foreign Keys
    applicant_id UUID REFERENCES applicant_accounts(id) ON DELETE CASCADE
);

-- Index for preference lookups
CREATE INDEX idx_notification_preferences_identifier ON notification_preferences(identifier);
CREATE INDEX idx_notification_preferences_applicant ON notification_preferences(applicant_id);

-- =============================================================================
-- NOTIFICATION COST TRACKING VIEW
-- For monitoring and optimizing notification costs
-- =============================================================================

CREATE OR REPLACE VIEW notification_cost_summary AS
SELECT
    date_trunc('day', created_at) AS date,
    channel,
    notification_type,
    COUNT(*) AS total_sent,
    COUNT(*) FILTER (WHERE status = 'delivered') AS delivered,
    COUNT(*) FILTER (WHERE status = 'failed') AS failed,
    SUM(estimated_cost_usd) AS total_cost_usd,
    AVG(estimated_cost_usd) AS avg_cost_per_notification,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'delivered')::DECIMAL /
        NULLIF(COUNT(*), 0) * 100, 2
    ) AS delivery_rate_pct
FROM notification_logs
GROUP BY date_trunc('day', created_at), channel, notification_type
ORDER BY date DESC, channel;

-- =============================================================================
-- TRIGGER: Auto-update updated_at for notification_preferences
-- =============================================================================

CREATE OR REPLACE FUNCTION update_notification_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notification_preferences_timestamp
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_preferences_timestamp();

-- =============================================================================
-- ROW-LEVEL SECURITY (Prepare for multi-tenant)
-- =============================================================================

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Service role can access all records (for backend tools)
CREATE POLICY "Service role full access to notification_logs"
    ON notification_logs
    FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to notification_preferences"
    ON notification_preferences
    FOR ALL
    USING (auth.role() = 'service_role');

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE notification_logs IS
    'Tracks all notification delivery attempts with channel routing, failover, and cost data';

COMMENT ON TABLE notification_preferences IS
    'Per-user notification channel preferences for smart routing decisions';

COMMENT ON VIEW notification_cost_summary IS
    'Daily aggregated view of notification costs and delivery rates by channel';

COMMENT ON COLUMN notification_logs.channel_priority IS
    '1 = primary channel attempt, 2+ = failover attempts';

COMMENT ON COLUMN notification_logs.estimated_cost_usd IS
    'WhatsApp: $0.005, SMS: $0.04, Email: $0.001 per message';

COMMENT ON COLUMN notification_preferences.channel_priority IS
    'JSON object mapping channel names to priority order (1 = most preferred)';
