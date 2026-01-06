'use client'

import { User, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import {
  type Application,
  type ApplicationStatus,
  APPLICATION_STATUS_COLORS,
  APPLICATION_STATUS_LABELS,
  getApplicantFullName,
  formatApplicationId,
} from '@/lib/types/applications'

interface ApplicationCardProps {
  application: Application
  onView: () => void
  onClick?: () => void
}

export function ApplicationCard({ application, onView, onClick }: ApplicationCardProps) {
  const fullName = getApplicantFullName(application.personal_info)
  const studentNumber = application.personal_info.student_number || 'N/A'
  const apsScore = application.academic_info.aps_score
  const status = application.status as ApplicationStatus
  const applicationDate = new Date(application.created_at).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  const handleCardClick = () => {
    if (onClick) {
      onClick()
    }
  }

  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onView()
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card overflow-hidden transition-all flex flex-col h-[260px]',
        onClick && 'cursor-pointer hover:border-primary/50'
      )}
      onClick={handleCardClick}
    >
      {/* Card Header */}
      <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 font-mono text-sm">
          <User className="h-4 w-4 text-syntax-export" />
          <span className="text-foreground truncate text-xs">
            {formatApplicationId(application.id)}.app
          </span>
        </div>
        <span
          className={cn(
            'text-[10px] px-1.5 py-0.5 rounded font-medium uppercase',
            APPLICATION_STATUS_COLORS[status] || APPLICATION_STATUS_COLORS.submitted
          )}
        >
          {APPLICATION_STATUS_LABELS[status] || status}
        </span>
      </div>

      {/* Card Body */}
      <div className="p-4 font-mono text-sm space-y-1 flex-1 overflow-y-auto">
        <div className="flex flex-col h-full">
          {/* Applicant name - truncated */}
          <div className="mb-2">
            <span className="text-syntax-string line-clamp-2 text-xs">{fullName}</span>
          </div>

          {/* Key metrics row with badges */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">
              #{studentNumber}
            </span>
            {apsScore !== undefined && apsScore !== null && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                APS: {apsScore}
              </span>
            )}
          </div>

          {/* Email if available */}
          {application.personal_info.email && (
            <div className="mb-2">
              <span className="text-[10px] text-muted-foreground truncate block">
                {application.personal_info.email}
              </span>
            </div>
          )}

          {/* Application date at bottom */}
          <div className="mt-auto pt-1 border-t border-border/50">
            <span className="text-[10px] text-muted-foreground">
              Applied: {applicationDate}
            </span>
          </div>
        </div>
      </div>

      {/* Card Footer - Action Buttons */}
      <div className="px-3 py-1.5 border-t border-border bg-muted/30 flex-shrink-0">
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="sm" onClick={handleViewClick}>
            <FileText className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}
