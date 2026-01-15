'use client'

import { cn } from '@/lib/utils'
import { type ApplicationNote } from '@/lib/types/applications'
import { NoteCard } from './NoteCard'

interface NotesGridProps {
  notes: ApplicationNote[]
  className?: string
}

/**
 * NotesGrid - Displays multiple application notes in a 4-column grid layout.
 *
 * Features:
 * - Responsive 4-column grid with consistent gap spacing
 * - Returns null if no notes are provided (no empty state)
 * - Uses NoteCard component for individual note rendering
 *
 * Layout:
 * - Grid with 4 columns
 * - 3 units of gap spacing between cards
 * - Responsive behavior inherited from grid
 */
export function NotesGrid({ notes, className }: NotesGridProps) {
  if (!notes || notes.length === 0) {
    return null
  }

  return (
    <div className={cn('grid grid-cols-4 gap-3', className)}>
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </div>
  )
}

export default NotesGrid
