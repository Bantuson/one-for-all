'use client'

import * as React from 'react'
import { TeamInviteStep } from '@/components/setup/TeamInviteStep'

// ============================================================================
// Types
// ============================================================================

interface TeamStepProps {
  className?: string
}

// ============================================================================
// Component
// ============================================================================

/**
 * Step 7: Team Invitations
 *
 * Wraps the TeamInviteStep component to allow users to:
 * - Invite team members via email
 * - Assign permissions to each invite
 * - Manage pending invites
 *
 * This step is optional and can be skipped.
 * The component automatically uses the unified registration store.
 */
export function TeamStep({ className }: TeamStepProps) {
  return (
    <div className={className}>
      <TeamInviteStep showWrapper={false} />
    </div>
  )
}

export default TeamStep
