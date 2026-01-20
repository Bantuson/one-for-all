-- Helper function for APS extraction from JSONB
CREATE OR REPLACE FUNCTION public.extract_aps_score(academic_info JSONB)
RETURNS NUMERIC AS $$
BEGIN
    RETURN COALESCE(
        (academic_info->>'aps_score')::NUMERIC,
        (academic_info->>'total_aps')::NUMERIC,
        0
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Materialized view for application rankings by course
CREATE MATERIALIZED VIEW IF NOT EXISTS public.application_rankings AS
WITH ranked_applications AS (
    SELECT
        ac.id AS choice_id,
        ac.application_id,
        ac.course_id,
        ac.priority AS choice_number,
        ac.status AS choice_status,
        a.applicant_id,
        a.institution_id,
        public.extract_aps_score(a.academic_info) AS aps_score,
        c.requirements->>'minimum_aps' AS course_min_aps,
        c.name AS course_name,
        c.requirements->>'intake_limit' AS intake_limit,
        ROW_NUMBER() OVER (
            PARTITION BY ac.course_id
            ORDER BY public.extract_aps_score(a.academic_info) DESC, ac.created_at ASC
        ) AS rank_position
    FROM public.application_choices ac
    JOIN public.applications a ON a.id = ac.application_id
    JOIN public.courses c ON c.id = ac.course_id
    WHERE ac.status NOT IN ('withdrawn', 'rejected')
)
SELECT
    *,
    CASE
        WHEN intake_limit IS NULL THEN 'manual_review'
        WHEN rank_position <= (intake_limit::INTEGER * 0.8) THEN 'auto_accept_recommended'
        WHEN rank_position <= intake_limit::INTEGER THEN 'conditional_recommended'
        WHEN rank_position <= (intake_limit::INTEGER * 1.5) THEN 'waitlist_recommended'
        ELSE 'rejection_flagged'
    END AS recommendation
FROM ranked_applications;

-- Create indexes for the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_rankings_choice_id ON public.application_rankings(choice_id);
CREATE INDEX IF NOT EXISTS idx_app_rankings_course ON public.application_rankings(course_id, rank_position);
CREATE INDEX IF NOT EXISTS idx_app_rankings_recommendation ON public.application_rankings(recommendation);

-- Function to refresh the rankings view
CREATE OR REPLACE FUNCTION public.refresh_application_rankings(p_course_id UUID DEFAULT NULL)
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.application_rankings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.refresh_application_rankings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.extract_aps_score(JSONB) TO authenticated;
GRANT SELECT ON public.application_rankings TO authenticated;

-- Add comments
COMMENT ON MATERIALIZED VIEW public.application_rankings IS 'Pre-computed rankings for application choices based on APS scores';
COMMENT ON FUNCTION public.refresh_application_rankings IS 'Refresh the application rankings materialized view';
