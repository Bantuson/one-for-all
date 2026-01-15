'use client'

import { cn } from '@/lib/utils'
import {
  type ApplicationNote,
  NOTE_COLORS,
  NOTE_TYPE_LABELS,
} from '@/lib/types/applications'

interface NoteCardProps {
  note: ApplicationNote
  className?: string
}

/**
 * NoteCard - Displays a single application note with color-coded styling.
 *
 * Features:
 * - Color-coded border and background using NOTE_COLORS
 * - Title displayed as heading with font-medium
 * - Body text truncated with muted foreground color
 * - Badge showing note type using NOTE_TYPE_LABELS
 * - Relative timestamp display (e.g., "2 hours ago")
 *
 * Accessibility:
 * - Semantic structure with clear visual hierarchy
 * - Color is not the only indicator (text labels included)
 * - Proper heading structure
 */
export function NoteCard({ note, className }: NoteCardProps) {
  // Format relative timestamp
  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    const diffWeeks = Math.floor(diffDays / 7)
    const diffMonths = Math.floor(diffDays / 30)
    const diffYears = Math.floor(diffDays / 365)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`
    if (diffDays < 7) return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`
    if (diffWeeks < 4) return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`
    if (diffMonths < 12) return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`
    return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`
  }

  const colorClasses = NOTE_COLORS[note.color]
  const typeLabel = NOTE_TYPE_LABELS[note.note_type]
  const relativeTime = getRelativeTime(note.created_at)

  return (
    <div
      className={cn(
        'rounded-lg border-2 p-3 flex flex-col gap-2',
        colorClasses,
        className
      )}
    >
      {/* Title */}
      <h3 className="font-medium text-sm line-clamp-1">{note.title}</h3>

      {/* Body text */}
      <p className="text-xs text-muted-foreground line-clamp-3">{note.body}</p>

      {/* Footer with badge and timestamp */}
      <div className="flex items-center justify-between mt-auto pt-2">
        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-background/50">
          {typeLabel}
        </span>
        <span className="text-[10px] text-muted-foreground">{relativeTime}</span>
      </div>
    </div>
  )
}

export default NoteCard
