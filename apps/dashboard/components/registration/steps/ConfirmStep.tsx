'use client'

import * as React from 'react'
import { Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useUnifiedRegistrationStore,
  selectCampusCount,
  selectFacultyCount,
  selectCourseCount,
} from '@/lib/stores/unifiedRegistrationStore'

// ============================================================================
// Types
// ============================================================================

interface ConfirmStepProps {
  className?: string
}

// ============================================================================
// Component
// ============================================================================

/**
 * Step 8: Confirmation & Submission
 *
 * Displays a comprehensive summary of:
 * 1. Institution details (name, type, contact info)
 * 2. Setup data (campus, faculty, course counts)
 * 3. Team invitations (count and permission breakdown)
 *
 * Shows loading state during submission and "What happens next" section.
 */
export function ConfirmStep({ className }: ConfirmStepProps) {
  const institutionData = useUnifiedRegistrationStore((state) => state.institutionData)
  const institutionType = useUnifiedRegistrationStore((state) => state.institutionType)
  const pendingInvites = useUnifiedRegistrationStore((state) => state.pendingInvites)
  const isSubmitting = useUnifiedRegistrationStore((state) => state.isSubmitting)

  const campusCount = useUnifiedRegistrationStore(selectCampusCount)
  const facultyCount = useUnifiedRegistrationStore(selectFacultyCount)
  const courseCount = useUnifiedRegistrationStore(selectCourseCount)

  // Calculate permission breakdown for team invites
  const permissionBreakdown = React.useMemo(() => {
    const counts = { admin: 0, standard: 0 }
    pendingInvites.forEach((invite) => {
      if (invite.permissions.includes('admin_access')) {
        counts.admin++
      } else {
        counts.standard++
      }
    })
    return counts
  }, [pendingInvites])

  return (
    <div className={cn('space-y-6', className)}>
      {/* Institution Details Summary - Terminal Style */}
      <div className="font-mono">
        <p className="text-sm mb-4 text-center">
          <span className="text-traffic-green">//</span>
          <span className="text-muted-foreground"> Institution information:</span>
        </p>

        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
          <div>
            <span className="text-syntax-key">&quot;name&quot;</span>
            <span className="text-foreground"> : </span>
            <span className="text-syntax-string">&quot;{institutionData.name}&quot;</span>
          </div>
          <div>
            <span className="text-syntax-key">&quot;type&quot;</span>
            <span className="text-foreground"> : </span>
            <span className="text-syntax-string">&quot;{institutionType}&quot;</span>
          </div>
          {institutionData.contactEmail && (
            <div>
              <span className="text-syntax-key">&quot;email&quot;</span>
              <span className="text-foreground"> : </span>
              <span className="text-syntax-string">&quot;{institutionData.contactEmail}&quot;</span>
            </div>
          )}
          {institutionData.contactPhone && (
            <div>
              <span className="text-syntax-key">&quot;phone&quot;</span>
              <span className="text-foreground"> : </span>
              <span className="text-syntax-string">&quot;{institutionData.contactPhone}&quot;</span>
            </div>
          )}
          {institutionData.website && (
            <div>
              <span className="text-syntax-key">&quot;website&quot;</span>
              <span className="text-foreground"> : </span>
              <span className="text-syntax-string">&quot;{institutionData.website}&quot;</span>
            </div>
          )}
        </div>
      </div>

      {/* Setup Data Summary - Terminal Style */}
      <div className="font-mono">
        <p className="text-sm mb-4 text-center">
          <span className="text-traffic-green">//</span>
          <span className="text-muted-foreground"> Dashboard data to be created:</span>
        </p>

        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
          <div>
            <span className="text-syntax-key">&quot;campuses&quot;</span>
            <span className="text-foreground"> : </span>
            <span className="text-syntax-number">{campusCount}</span>
          </div>
          <div>
            <span className="text-syntax-key">&quot;faculties&quot;</span>
            <span className="text-foreground"> : </span>
            <span className="text-syntax-number">{facultyCount}</span>
          </div>
          <div>
            <span className="text-syntax-key">&quot;courses&quot;</span>
            <span className="text-foreground"> : </span>
            <span className="text-syntax-number">{courseCount}</span>
          </div>
        </div>
      </div>

      {/* Team Summary Section - Terminal Style */}
      <div className="font-mono">
        <p className="text-sm mb-4 text-center">
          <span className="text-traffic-green">//</span>
          <span className="text-muted-foreground"> Team invitations to send:</span>
        </p>
        <div className="bg-muted/30 rounded-lg p-4">
          {pendingInvites.length > 0 ? (
            <div className="space-y-2">
              <div>
                <span className="text-syntax-key">&quot;team_invites&quot;</span>
                <span className="text-foreground"> : </span>
                <span className="text-syntax-number">{pendingInvites.length}</span>
              </div>
              {permissionBreakdown.admin > 0 && (
                <div className="pl-4">
                  <span className="text-syntax-key">&quot;full_admin&quot;</span>
                  <span className="text-foreground"> : </span>
                  <span className="text-traffic-red">{permissionBreakdown.admin}</span>
                </div>
              )}
              {permissionBreakdown.standard > 0 && (
                <div className="pl-4">
                  <span className="text-syntax-key">&quot;standard&quot;</span>
                  <span className="text-foreground"> : </span>
                  <span className="text-traffic-green">{permissionBreakdown.standard}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-syntax-comment">
              // No team invites configured (you can add team members later)
            </div>
          )}
        </div>
      </div>

      {/* What happens next - Terminal Style */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="font-mono text-sm mb-3 text-center">
          <span className="text-traffic-green">//</span>
          <span className="text-muted-foreground"> What happens next:</span>
        </p>
        <ul className="space-y-2 font-mono text-sm">
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span className="text-foreground">
              Your institution profile will be created in the system
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span className="text-foreground">
              Dashboard will be populated with {campusCount} campus{campusCount !== 1 ? 'es' : ''}, {facultyCount} facult{facultyCount !== 1 ? 'ies' : 'y'}, and {courseCount} course{courseCount !== 1 ? 's' : ''}
            </span>
          </li>
          {pendingInvites.length > 0 && (
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span className="text-foreground">
                {pendingInvites.length} team invitation{pendingInvites.length !== 1 ? 's' : ''} will be sent via email
              </span>
            </li>
          )}
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span className="text-foreground">
              You&apos;ll be redirected to your dashboard to start managing applications
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span className="text-foreground">
              You can continue editing structure anytime from Settings
            </span>
          </li>
        </ul>
      </div>

      {/* Loading State */}
      {isSubmitting && (
        <div className="flex items-center justify-center gap-3 py-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="font-mono text-sm text-muted-foreground text-center">
            // Creating your institution...
          </span>
        </div>
      )}
    </div>
  )
}

export default ConfirmStep
