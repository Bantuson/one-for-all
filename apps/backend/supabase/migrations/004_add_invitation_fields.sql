-- Migration: 004_add_invitation_fields
-- Description: Add invitation tracking fields to institution_members table
-- Created: 2025-12-18

-- Add invitation tracking columns to institution_members table
ALTER TABLE public.institution_members
  -- Make user_id nullable to support pending invitations
  ALTER COLUMN user_id DROP NOT NULL,

  -- Add invitation tracking fields
  ADD COLUMN IF NOT EXISTS invitation_token UUID,
  ADD COLUMN IF NOT EXISTS invitation_status TEXT CHECK (invitation_status IN ('pending', 'accepted', 'expired', 'revoked')),
  ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invited_email TEXT;

-- Add index for invitation token lookups
CREATE INDEX IF NOT EXISTS idx_institution_members_invitation_token
  ON public.institution_members(invitation_token)
  WHERE invitation_token IS NOT NULL;

-- Add index for pending invitations
CREATE INDEX IF NOT EXISTS idx_institution_members_invitation_status
  ON public.institution_members(invitation_status)
  WHERE invitation_status = 'pending';

-- Add index for invited email lookups
CREATE INDEX IF NOT EXISTS idx_institution_members_invited_email
  ON public.institution_members(invited_email)
  WHERE invited_email IS NOT NULL;

-- Update the unique constraint to allow multiple pending invitations for same email
-- Drop the existing constraint and recreate it to only apply when user_id is not null
ALTER TABLE public.institution_members
  DROP CONSTRAINT IF EXISTS institution_members_institution_id_user_id_key;

-- Create a unique constraint that only applies when user_id is not null (accepted invitations)
CREATE UNIQUE INDEX IF NOT EXISTS idx_institution_members_unique_active_membership
  ON public.institution_members(institution_id, user_id)
  WHERE user_id IS NOT NULL;

-- Create a unique constraint for pending invitations per institution per email
CREATE UNIQUE INDEX IF NOT EXISTS idx_institution_members_unique_pending_invitation
  ON public.institution_members(institution_id, invited_email)
  WHERE invitation_status = 'pending' AND user_id IS NULL;

-- Add check constraint to ensure either user_id or invited_email is present
ALTER TABLE public.institution_members
  ADD CONSTRAINT check_user_id_or_invited_email
  CHECK (user_id IS NOT NULL OR invited_email IS NOT NULL);

-- Add check constraint to ensure pending invitations have required fields
ALTER TABLE public.institution_members
  ADD CONSTRAINT check_pending_invitation_fields
  CHECK (
    (invitation_status = 'pending' AND invitation_token IS NOT NULL AND invitation_expires_at IS NOT NULL AND invited_email IS NOT NULL)
    OR invitation_status != 'pending'
    OR invitation_status IS NULL
  );

-- Comments for documentation
COMMENT ON COLUMN public.institution_members.invitation_token IS 'Unique token for accepting invitations (UUID)';
COMMENT ON COLUMN public.institution_members.invitation_status IS 'Status of invitation: pending, accepted, expired, revoked';
COMMENT ON COLUMN public.institution_members.invitation_expires_at IS 'Expiration timestamp for invitation (typically 7 days)';
COMMENT ON COLUMN public.institution_members.invited_email IS 'Email address of invited user (before they accept)';
