-- Migration: 028_rankings_refresh_queue.sql
-- Description: Demand-triggered refresh mechanism for application_rankings materialized view
-- Purpose: Support 15-minute refresh cycles with change-triggered refresh requests

-- ============================================================================
-- REFRESH QUEUE TABLE
-- ============================================================================
-- Tracks refresh requests for materialized views, enabling demand-triggered
-- updates when underlying data changes

CREATE TABLE IF NOT EXISTS public.refresh_queue (
    view_name TEXT PRIMARY KEY,
    requested_at TIMESTAMPTZ,
    last_refreshed_at TIMESTAMPTZ,
    refresh_in_progress BOOLEAN DEFAULT FALSE,
    refresh_started_at TIMESTAMPTZ,
    last_refresh_duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comment for documentation
COMMENT ON TABLE public.refresh_queue IS 'Tracks refresh state for materialized views with demand-triggered updates';
COMMENT ON COLUMN public.refresh_queue.view_name IS 'Name of the materialized view';
COMMENT ON COLUMN public.refresh_queue.requested_at IS 'Timestamp when a refresh was last requested';
COMMENT ON COLUMN public.refresh_queue.last_refreshed_at IS 'Timestamp when the view was last successfully refreshed';
COMMENT ON COLUMN public.refresh_queue.refresh_in_progress IS 'Flag to prevent concurrent refresh operations';
COMMENT ON COLUMN public.refresh_queue.refresh_started_at IS 'Timestamp when current refresh started (for timeout detection)';
COMMENT ON COLUMN public.refresh_queue.last_refresh_duration_ms IS 'Duration of last refresh in milliseconds (for monitoring)';

-- ============================================================================
-- REQUEST REFRESH FUNCTION
-- ============================================================================
-- Call this function to request a refresh of the rankings view

CREATE OR REPLACE FUNCTION public.request_rankings_refresh()
RETURNS void AS $$
BEGIN
    INSERT INTO public.refresh_queue (view_name, requested_at, updated_at)
    VALUES ('application_rankings', NOW(), NOW())
    ON CONFLICT (view_name) DO UPDATE
    SET requested_at = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.request_rankings_refresh IS 'Request a refresh of the application_rankings materialized view';

-- ============================================================================
-- TRIGGER FUNCTION FOR AUTOMATIC REFRESH REQUESTS
-- ============================================================================
-- Automatically requests a refresh when application_choices data changes

CREATE OR REPLACE FUNCTION public.trigger_rankings_refresh()
RETURNS trigger AS $$
BEGIN
    PERFORM public.request_rankings_refresh();
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.trigger_rankings_refresh IS 'Trigger function to request rankings refresh on data changes';

-- ============================================================================
-- ATTACH TRIGGER TO APPLICATION_CHOICES (IF TABLE EXISTS)
-- ============================================================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'application_choices'
    ) THEN
        -- Drop existing trigger if present
        DROP TRIGGER IF EXISTS trg_rankings_refresh ON public.application_choices;

        -- Create trigger for INSERT, UPDATE, DELETE
        -- Use FOR EACH STATEMENT to batch multiple changes
        CREATE TRIGGER trg_rankings_refresh
            AFTER INSERT OR UPDATE OR DELETE ON public.application_choices
            FOR EACH STATEMENT
            EXECUTE FUNCTION public.trigger_rankings_refresh();

        RAISE NOTICE 'Created trigger trg_rankings_refresh on application_choices';
    ELSE
        RAISE NOTICE 'Table application_choices does not exist, skipping trigger creation';
    END IF;
END $$;

-- ============================================================================
-- SHOULD REFRESH CHECK FUNCTION
-- ============================================================================
-- Returns TRUE if the rankings view should be refreshed based on:
-- 1. A refresh has been requested after the last refresh
-- 2. No refresh is currently in progress (or has timed out after 5 minutes)

CREATE OR REPLACE FUNCTION public.should_refresh_rankings()
RETURNS BOOLEAN AS $$
DECLARE
    queue_record RECORD;
    timeout_threshold INTERVAL := INTERVAL '5 minutes';
BEGIN
    SELECT * INTO queue_record
    FROM public.refresh_queue
    WHERE view_name = 'application_rankings';

    -- No queue record means no refresh ever requested
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Check if refresh is stuck (started but not completed within timeout)
    IF queue_record.refresh_in_progress = TRUE THEN
        IF queue_record.refresh_started_at IS NOT NULL
           AND queue_record.refresh_started_at < (NOW() - timeout_threshold) THEN
            -- Reset stuck refresh
            UPDATE public.refresh_queue
            SET refresh_in_progress = FALSE,
                updated_at = NOW()
            WHERE view_name = 'application_rankings';
            -- Allow refresh to proceed
        ELSE
            -- Refresh is in progress, don't start another
            RETURN FALSE;
        END IF;
    END IF;

    -- Never refreshed before, but refresh requested
    IF queue_record.last_refreshed_at IS NULL AND queue_record.requested_at IS NOT NULL THEN
        RETURN TRUE;
    END IF;

    -- Check if refresh was requested after last refresh
    RETURN queue_record.requested_at > queue_record.last_refreshed_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.should_refresh_rankings IS 'Check if application_rankings view needs refresh based on pending requests';

-- ============================================================================
-- GET RANKINGS STALENESS INFO
-- ============================================================================
-- Returns information about the current state of rankings for monitoring

CREATE OR REPLACE FUNCTION public.get_rankings_refresh_status()
RETURNS TABLE (
    view_name TEXT,
    last_refreshed_at TIMESTAMPTZ,
    requested_at TIMESTAMPTZ,
    refresh_in_progress BOOLEAN,
    is_stale BOOLEAN,
    staleness_seconds INTEGER,
    last_refresh_duration_ms INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        rq.view_name,
        rq.last_refreshed_at,
        rq.requested_at,
        rq.refresh_in_progress,
        public.should_refresh_rankings() AS is_stale,
        EXTRACT(EPOCH FROM (NOW() - COALESCE(rq.last_refreshed_at, '1970-01-01')))::INTEGER AS staleness_seconds,
        rq.last_refresh_duration_ms
    FROM public.refresh_queue rq
    WHERE rq.view_name = 'application_rankings';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_rankings_refresh_status IS 'Get current refresh status for monitoring dashboards';

-- ============================================================================
-- EXECUTE REFRESH WITH LOCKING
-- ============================================================================
-- Performs the actual refresh with proper locking to prevent concurrent refreshes

CREATE OR REPLACE FUNCTION public.execute_rankings_refresh()
RETURNS TABLE (
    success BOOLEAN,
    duration_ms INTEGER,
    message TEXT
) AS $$
DECLARE
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    duration INTEGER;
BEGIN
    -- Try to acquire lock by marking refresh in progress
    UPDATE public.refresh_queue
    SET refresh_in_progress = TRUE,
        refresh_started_at = NOW(),
        updated_at = NOW()
    WHERE view_name = 'application_rankings'
      AND (refresh_in_progress = FALSE
           OR refresh_started_at < NOW() - INTERVAL '5 minutes');

    IF NOT FOUND THEN
        -- Insert queue record if not exists
        INSERT INTO public.refresh_queue (view_name, refresh_in_progress, refresh_started_at)
        VALUES ('application_rankings', TRUE, NOW())
        ON CONFLICT (view_name) DO NOTHING;

        -- Check if we got the lock
        IF NOT FOUND THEN
            RETURN QUERY SELECT FALSE, 0, 'Refresh already in progress'::TEXT;
            RETURN;
        END IF;
    END IF;

    start_time := clock_timestamp();

    BEGIN
        -- Perform the actual refresh
        REFRESH MATERIALIZED VIEW CONCURRENTLY public.application_rankings;

        end_time := clock_timestamp();
        duration := EXTRACT(EPOCH FROM (end_time - start_time)) * 1000;

        -- Update queue with success
        UPDATE public.refresh_queue
        SET refresh_in_progress = FALSE,
            last_refreshed_at = NOW(),
            last_refresh_duration_ms = duration,
            updated_at = NOW()
        WHERE view_name = 'application_rankings';

        RETURN QUERY SELECT TRUE, duration, 'Refresh completed successfully'::TEXT;

    EXCEPTION WHEN OTHERS THEN
        -- Release lock on error
        UPDATE public.refresh_queue
        SET refresh_in_progress = FALSE,
            updated_at = NOW()
        WHERE view_name = 'application_rankings';

        RETURN QUERY SELECT FALSE, 0, ('Refresh failed: ' || SQLERRM)::TEXT;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.execute_rankings_refresh IS 'Execute a refresh of application_rankings with locking and timing';

-- ============================================================================
-- INITIALIZE QUEUE WITH CURRENT STATE
-- ============================================================================

INSERT INTO public.refresh_queue (view_name, last_refreshed_at, refresh_in_progress)
VALUES ('application_rankings', NOW(), FALSE)
ON CONFLICT (view_name) DO UPDATE
SET last_refreshed_at = COALESCE(refresh_queue.last_refreshed_at, NOW()),
    updated_at = NOW();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON public.refresh_queue TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_rankings_refresh() TO authenticated;
GRANT EXECUTE ON FUNCTION public.should_refresh_rankings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_rankings_refresh_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_rankings_refresh() TO authenticated;

-- Service role needs full access for background refresh jobs
GRANT ALL ON public.refresh_queue TO service_role;
