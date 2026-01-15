'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  type ApplicationNote,
  type NoteColor,
  type NoteType,
  NOTE_COLORS,
} from '@/lib/types/applications'

interface AddNoteFormProps {
  applicationId: string
  onSave: (note: Partial<ApplicationNote>) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

const NOTE_COLOR_OPTIONS: NoteColor[] = ['gray', 'green', 'yellow', 'red', 'blue', 'purple']
const NOTE_TYPE_OPTIONS: { value: NoteType; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'flag', label: 'Flag' },
  { value: 'review', label: 'Review' },
  { value: 'followup', label: 'Follow-up' },
]

/**
 * AddNoteForm - Form for creating new application notes.
 *
 * Features:
 * - Title input (required)
 * - Body textarea (required)
 * - Color selector with 6 color options displayed as clickable circles
 * - Note type selector (optional, defaults to 'general')
 * - Save and Cancel buttons
 * - Form validation (title and body required)
 * - Loading state support
 *
 * Accessibility:
 * - Proper form labels
 * - Keyboard navigation support
 * - Clear visual feedback for selected color
 * - Disabled state during loading
 */
export function AddNoteForm({
  applicationId,
  onSave,
  onCancel,
  isLoading = false,
}: AddNoteFormProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [color, setColor] = useState<NoteColor>('gray')
  const [noteType, setNoteType] = useState<NoteType>('general')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !body.trim()) {
      return
    }

    const noteData: Partial<ApplicationNote> = {
      application_id: applicationId,
      title: title.trim(),
      body: body.trim(),
      color,
      note_type: noteType,
    }

    await onSave(noteData)
  }

  const isFormValid = title.trim().length > 0 && body.trim().length > 0

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title input */}
      <div className="space-y-2">
        <label htmlFor="note-title" className="text-sm font-medium">
          Title <span className="text-red-500">*</span>
        </label>
        <Input
          id="note-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter note title..."
          disabled={isLoading}
          required
        />
      </div>

      {/* Body textarea */}
      <div className="space-y-2">
        <label htmlFor="note-body" className="text-sm font-medium">
          Body <span className="text-red-500">*</span>
        </label>
        <textarea
          id="note-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Enter note details..."
          disabled={isLoading}
          required
          rows={4}
          className={cn(
            'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
            'ring-offset-background placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'resize-none'
          )}
        />
      </div>

      {/* Color + Note Type - Same Row */}
      <div className="flex items-center justify-between gap-4">
        {/* Color selector with label */}
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Color</label>
          <div className="flex items-center gap-2">
            {NOTE_COLOR_OPTIONS.map((colorOption) => {
              const isSelected = color === colorOption
              const colorClasses = NOTE_COLORS[colorOption]

              return (
                <button
                  key={colorOption}
                  type="button"
                  onClick={() => setColor(colorOption)}
                  disabled={isLoading}
                  className={cn(
                    'h-8 w-8 rounded-full border-2 transition-all',
                    'hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    colorClasses,
                    isSelected ? 'border-foreground ring-2 ring-ring' : 'border-transparent'
                  )}
                  aria-label={`Select ${colorOption} color`}
                  aria-pressed={isSelected}
                />
              )
            })}
          </div>
        </div>

        {/* Note type selector with label */}
        <div className="space-y-1">
          <label htmlFor="note-type" className="text-xs font-medium text-muted-foreground">Type</label>
          <select
            id="note-type"
            value={noteType}
            onChange={(e) => setNoteType(e.target.value as NoteType)}
            disabled={isLoading}
            className={cn(
              'flex h-8 px-2 text-xs rounded-md border border-input bg-background',
              'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            {NOTE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={!isFormValid || isLoading}
        >
          {isLoading ? 'Saving...' : 'Save Note'}
        </Button>
      </div>
    </form>
  )
}

export default AddNoteForm
