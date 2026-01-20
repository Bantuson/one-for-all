-- Add threshold override columns to courses table
ALTER TABLE public.courses
    ADD COLUMN IF NOT EXISTS auto_accept_threshold DECIMAL(3,2) DEFAULT 0.80,
    ADD COLUMN IF NOT EXISTS conditional_threshold DECIMAL(3,2) DEFAULT 1.00,
    ADD COLUMN IF NOT EXISTS waitlist_threshold DECIMAL(3,2) DEFAULT 1.50,
    ADD COLUMN IF NOT EXISTS intake_limit INTEGER;

-- Add constraints
ALTER TABLE public.courses
    ADD CONSTRAINT check_auto_accept_threshold
        CHECK (auto_accept_threshold > 0 AND auto_accept_threshold <= 1.0),
    ADD CONSTRAINT check_conditional_threshold
        CHECK (conditional_threshold >= auto_accept_threshold AND conditional_threshold <= 2.0),
    ADD CONSTRAINT check_waitlist_threshold
        CHECK (waitlist_threshold >= conditional_threshold AND waitlist_threshold <= 3.0);

-- Create index for courses with intake limits
CREATE INDEX IF NOT EXISTS idx_courses_with_limits ON public.courses(id) WHERE intake_limit IS NOT NULL;

-- Add comments
COMMENT ON COLUMN public.courses.auto_accept_threshold IS 'Percentage of intake limit for auto-accept recommendation (default 80%)';
COMMENT ON COLUMN public.courses.conditional_threshold IS 'Percentage of intake limit for conditional accept (default 100%)';
COMMENT ON COLUMN public.courses.waitlist_threshold IS 'Percentage of intake limit for waitlist (default 150%)';
COMMENT ON COLUMN public.courses.intake_limit IS 'Maximum number of students to accept for this course';
