'use client'

import { cn } from '@/lib/utils'

interface ChoicePriorityBadgeProps {
  priority: 1 | 2
  className?: string
}

/**
 * ChoicePriorityBadge - Displays the priority level of an application choice.
 *
 * Design decision: Only shows badge for 2nd choice applications.
 * 1st choice is the default/primary, so no badge is needed.
 *
 * Accessibility:
 * - Uses aria-label for screen reader context
 * - Sufficient color contrast for visibility
 */
export function ChoicePriorityBadge({ priority, className }: ChoicePriorityBadgeProps) {
  // Don't show badge for 1st choice (it's the default)
  if (priority === 1) return null

  return (
    <span
      aria-label="Second choice application"
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
        className
      )}
    >
      2nd Choice
    </span>
  )
}

export default ChoicePriorityBadge
