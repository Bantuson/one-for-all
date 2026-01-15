'use client'

import { cn } from '@/lib/utils'
import {
  getCourseDisplayStatus,
  type CourseDbStatus,
  type CourseComputedStatus,
  type CourseDisplayStatus,
} from '@/lib/types/courseStatus'

interface CourseStatusBadgeProps {
  status: CourseDbStatus | null
  computedStatus: CourseComputedStatus | null
  className?: string
  /** Show as a smaller inline badge */
  size?: 'sm' | 'default'
}

const STATUS_CONFIG: Record<
  CourseDisplayStatus,
  { label: string; className: string; ariaLabel: string }
> = {
  coming_soon: {
    label: 'Coming Soon',
    className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
    ariaLabel: 'Applications opening soon',
  },
  open: {
    label: 'Open',
    className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    ariaLabel: 'Applications open',
  },
  closed: {
    label: 'Closed',
    className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    ariaLabel: 'Applications closed',
  },
}

/**
 * CourseStatusBadge - Displays the current application status for a course.
 *
 * Uses computed_status (based on dates) when available, otherwise falls back
 * to the manual database status.
 *
 * Accessibility:
 * - Uses semantic role="status" for screen reader announcements
 * - Includes aria-label for clear status description
 * - Colors meet WCAG 2.1 AA contrast requirements
 */
export function CourseStatusBadge({
  status,
  computedStatus,
  className,
  size = 'default',
}: CourseStatusBadgeProps) {
  const displayStatus = getCourseDisplayStatus(status, computedStatus)
  const config = STATUS_CONFIG[displayStatus]

  return (
    <span
      role="status"
      aria-label={config.ariaLabel}
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}

// Export for barrel file
export default CourseStatusBadge
