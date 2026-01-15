'use client'

import { cn } from '@/lib/utils'
import {
  type ChoiceStatus,
  CHOICE_STATUS_COLORS,
  CHOICE_STATUS_LABELS,
} from '@/lib/types/applications'

interface ChoiceStatusBadgeProps {
  status: ChoiceStatus
  className?: string
  /** Show as a smaller inline badge */
  size?: 'sm' | 'default'
}

/**
 * ChoiceStatusBadge - Displays the review status of an application choice.
 *
 * Each choice within an application can have its own status independent of
 * other choices (e.g., first choice accepted, second choice waitlisted).
 *
 * Accessibility:
 * - Uses role="status" for screen reader announcements
 * - Includes descriptive aria-label
 * - Colors meet WCAG 2.1 AA contrast requirements
 */
export function ChoiceStatusBadge({ status, className, size = 'default' }: ChoiceStatusBadgeProps) {
  const label = CHOICE_STATUS_LABELS[status]
  const colorClass = CHOICE_STATUS_COLORS[status]

  return (
    <span
      role="status"
      aria-label={`Application status: ${label}`}
      className={cn(
        'inline-flex items-center rounded font-medium',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        colorClass,
        className
      )}
    >
      {label}
    </span>
  )
}

export default ChoiceStatusBadge
