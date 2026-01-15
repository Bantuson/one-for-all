'use client'

import { useCallback, useMemo } from 'react'
import { User, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { ChoiceStatusBadge } from '@/components/applications/ChoiceStatusBadge'
import {
  type ApplicationRow,
  getApplicantFullName,
} from '@/lib/types/applications'

interface ApplicationCardProps {
  application: ApplicationRow
  onClick: () => void
}

/**
 * ApplicationCard - Displays an application summary in a card format.
 *
 * Follows the course card design pattern from SetupEditorMasterDetail.tsx
 * with a fixed height of 260px and three-section layout.
 *
 * Layout:
 * - Header: User icon + "Applicant" label + status badge (right)
 * - Body: Applicant name (with student number badge right-aligned), email,
 *         APS score and subjects info
 * - Footer: View details button
 *
 * Accessibility:
 * - Card is keyboard accessible via onClick handler
 * - Interactive elements have proper focus states
 * - Uses semantic structure with clear visual hierarchy
 * - Footer button uses stopPropagation to prevent double-triggering
 * - Screen reader announcements for status via ChoiceStatusBadge
 */
export function ApplicationCard({ application, onClick }: ApplicationCardProps) {
  const fullName = getApplicantFullName(application.personal_info)

  // Determine student number: prefer institution student number, then platform
  const studentNumber =
    application.personal_info.student_number ||
    application.applicant?.platform_student_number ||
    null

  const email = application.personal_info.email || application.applicant?.email || null
  const choiceStatus = application.choice_status

  // Academic info
  const apsScore = application.academic_info?.aps_score
  const subjects = application.academic_info?.subjects

  // Memoize subjects display to avoid recalculation on every render
  const subjectsDisplay = useMemo(() => {
    if (!subjects || subjects.length === 0) return null
    return subjects.slice(0, 3).map(s => `${s.name} (${s.grade})`).join(', ')
  }, [subjects])

  const subjectsCount = subjects?.length || 0

  const handleCardClick = useCallback(() => {
    onClick()
  }, [onClick])

  const handleFooterButtonClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation()
      onClick()
    },
    [onClick]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onClick()
      }
    },
    [onClick]
  )

  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        'h-[260px] rounded-lg border border-border bg-card overflow-hidden',
        'flex flex-col cursor-pointer',
        'hover:border-primary/50 transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
      )}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      aria-label={`View application from ${fullName}`}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 font-mono text-sm">
          <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-foreground text-xs">Applicant</span>
        </div>
        {choiceStatus && (
          <ChoiceStatusBadge status={choiceStatus} size="sm" className="flex-shrink-0" />
        )}
      </div>

      {/* Body */}
      <div className="p-4 font-mono text-sm flex-1 overflow-y-auto">
        <div className="flex flex-col h-full">
          {/* Row 1: Applicant name with student number badge on right */}
          <div className="flex items-center justify-between">
            <span className="text-syntax-string line-clamp-1 text-xs font-medium">
              {fullName}
            </span>
            {studentNumber && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground ml-2 flex-shrink-0">
                #{studentNumber}
              </span>
            )}
          </div>

          {/* Row 2: Email */}
          {email && (
            <div className="min-w-0 mt-1">
              <span className="text-[10px] text-muted-foreground truncate block">
                {email}
              </span>
            </div>
          )}

          {/* Row 3 & 4: APS and Subjects */}
          <div className="mt-2 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="text-syntax-number">
                APS: {apsScore !== undefined && apsScore !== null ? apsScore : '\u2014'}
              </span>
              <span aria-hidden="true">&bull;</span>
              <span>{subjectsCount} Subject{subjectsCount !== 1 ? 's' : ''}</span>
            </div>
            {subjectsDisplay && (
              <div className="text-[10px] text-muted-foreground mt-1 line-clamp-1">
                {subjectsDisplay}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-border bg-muted/30 flex-shrink-0 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFooterButtonClick}
          aria-label="View application details"
          className="h-7 w-7 p-0"
        >
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}

export default ApplicationCard
