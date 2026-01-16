'use client'

import { useCallback, useMemo } from 'react'
import { Eye } from 'lucide-react'
import {
  CodeCard,
  CodeCardHeader,
  CodeCardBody,
  CodeCardFooter,
} from '@/components/ui/CodeCard'
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
 * ApplicationCard - Displays an application summary in a clean card format.
 *
 * Simplified design with:
 * - Header: Traffic lights + reference ID + status badge
 * - Body: Name, email, APS + subjects chips
 * - Footer: View button only
 */
export function ApplicationCard({ application, onClick }: ApplicationCardProps) {
  const fullName = getApplicantFullName(application.personal_info)
  const email = application.personal_info.email || application.applicant?.email || null
  const choiceStatus = application.choice_status

  // Academic info
  const apsScore = application.academic_info?.aps_score
  const subjects = application.academic_info?.subjects
  const subjectsCount = subjects?.length || 0

  // Generate reference number (format: #OFA-2k26-####)
  const refNumber = useMemo(() => {
    const year = new Date().getFullYear().toString().slice(-2)
    const idSuffix = application.id?.slice(-4) || '0000'
    return `#OFA-2k${year}-${idSuffix}`
  }, [application.id])

  // Map status to traffic light status
  const trafficLightStatus = useMemo(() => {
    if (!choiceStatus) return 'neutral'
    if (choiceStatus === 'accepted' || choiceStatus === 'conditionally_accepted') return 'active'
    if (choiceStatus === 'pending' || choiceStatus === 'under_review' || choiceStatus === 'waitlisted') return 'warning'
    if (choiceStatus === 'rejected' || choiceStatus === 'withdrawn') return 'error'
    return 'neutral'
  }, [choiceStatus])

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
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      aria-label={`View application from ${fullName}`}
      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
    >
      <CodeCard className="h-full flex flex-col min-h-[220px] cursor-pointer">
        <CodeCardHeader
          filename={refNumber}
          filenameSize="xs"
          status={trafficLightStatus}
          rightContent={
            choiceStatus && (
              <ChoiceStatusBadge status={choiceStatus} size="sm" className="flex-shrink-0" />
            )
          }
          className="py-2"
        />

        <CodeCardBody className="flex-1 py-3">
          {/* Name - prominent */}
          <div className="text-sm font-medium text-foreground mb-0.5">
            {fullName}
          </div>

          {/* Email - muted */}
          {email && (
            <div className="text-xs text-muted-foreground mb-3 truncate">
              {email}
            </div>
          )}

          {/* APS + Subjects chips */}
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-traffic-green/10 text-traffic-green">
              APS: {apsScore !== undefined && apsScore !== null ? apsScore : '\u2014'}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {subjectsCount} Subject{subjectsCount !== 1 ? 's' : ''}
            </span>
          </div>
        </CodeCardBody>

        <CodeCardFooter>
          <div /> {/* Empty left side */}
          <button
            onClick={handleFooterButtonClick}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            aria-label="View application details"
          >
            <Eye className="h-4 w-4 text-muted-foreground" />
          </button>
        </CodeCardFooter>
      </CodeCard>
    </div>
  )
}

export default ApplicationCard
