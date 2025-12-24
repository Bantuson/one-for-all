-- Migration: 005_add_course_level
-- Description: Add level column to courses table for SA qualification framework
-- Created: 2025-12-23

-- Add level column to courses table
-- Supports all South African qualification levels (NQF aligned)
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS level TEXT CHECK (level IN (
    'undergraduate',
    'honours',
    'postgraduate',
    'masters',
    'doctoral',
    'diploma',
    'advanced-diploma',
    'btech',
    'mtech',
    'dtech',
    'certificate',
    'short-course'
  ));

-- Add is_main column to campuses table
-- Marks the primary/main campus of an institution
ALTER TABLE public.campuses
  ADD COLUMN IF NOT EXISTS is_main BOOLEAN DEFAULT false;

-- Create index on level for filtering and querying by qualification type
CREATE INDEX IF NOT EXISTS idx_courses_level ON public.courses(level);

-- Comments for documentation
COMMENT ON COLUMN public.courses.level IS 'South African qualification level (NQF aligned): undergraduate, honours, postgraduate, masters, doctoral, diploma, advanced-diploma, btech, mtech, dtech, certificate, short-course';
COMMENT ON COLUMN public.campuses.is_main IS 'Marks the primary/main campus of an institution';
