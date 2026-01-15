'use client'

import { useState, useCallback, useEffect } from 'react'
import { DottedModal, DottedModalContent, DottedModalFooter } from '@/components/ui/DottedModal'
import { Button } from '@/components/ui/Button'
import { notify } from '@/lib/toast'
import type { CourseLevel } from '@/lib/institutions/types'

const COURSE_LEVELS: CourseLevel[] = [
  'undergraduate',
  'honours',
  'postgraduate',
  'masters',
  'doctoral',
  'diploma',
  'advanced-diploma',
  'btech',
  'mtech',
  'dtech',
  'certificate',
  'short-course',
]

interface CourseData {
  id: string
  name: string
  code: string
  level: CourseLevel
  description?: string
  durationYears?: number
  requirements?: {
    minimumAps?: number
    requiredSubjects?: string[]
  }
  status?: 'open' | 'closed'
  openingDate?: string | null
  closingDate?: string | null
}

interface EditCourseModalProps {
  isOpen: boolean
  onClose: () => void
  course: CourseData | null
  onSave?: (updatedCourse: CourseData) => void
  // If true, saves via API. If false, only calls onSave callback (for in-memory editing)
  useApi?: boolean
}

interface FormState {
  name: string
  level: CourseLevel
  description: string
  durationYears: number
  minimumAps: number
  requiredSubjects: string
  status: 'open' | 'closed'
  openingDate: string
  closingDate: string
}

export function EditCourseModal({
  isOpen,
  onClose,
  course,
  onSave,
  useApi = true,
}: EditCourseModalProps) {
  const [formState, setFormState] = useState<FormState>({
    name: '',
    level: 'undergraduate',
    description: '',
    durationYears: 3,
    minimumAps: 0,
    requiredSubjects: '',
    status: 'open',
    openingDate: '',
    closingDate: '',
  })
  const [isSaving, setIsSaving] = useState(false)

  // Reset form when course changes
  useEffect(() => {
    if (course) {
      setFormState({
        name: course.name,
        level: course.level,
        description: course.description || '',
        durationYears: course.durationYears || 3,
        minimumAps: course.requirements?.minimumAps || 0,
        requiredSubjects: course.requirements?.requiredSubjects?.join(', ') || '',
        status: course.status || 'open',
        openingDate: course.openingDate || '',
        closingDate: course.closingDate || '',
      })
    }
  }, [course])

  const handleSave = useCallback(async () => {
    if (!course) return

    setIsSaving(true)
    let toastId: string | number | undefined

    try {
      // Parse subjects from comma-separated string
      const subjects = formState.requiredSubjects
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)

      const updatedCourse: CourseData = {
        ...course,
        name: formState.name,
        level: formState.level,
        description: formState.description || undefined,
        durationYears: formState.durationYears,
        requirements: {
          minimumAps: formState.minimumAps || undefined,
          requiredSubjects: subjects.length > 0 ? subjects : undefined,
        },
        status: formState.status,
        openingDate: formState.openingDate || null,
        closingDate: formState.closingDate || null,
      }

      if (useApi && course.id) {
        toastId = notify.loading('Saving course...')

        // Prepare data for API (snake_case)
        const updateData = {
          name: formState.name,
          level: formState.level,
          description: formState.description || null,
          duration_years: formState.durationYears,
          requirements: {
            minimumAps: formState.minimumAps || undefined,
            requiredSubjects: subjects.length > 0 ? subjects : undefined,
          },
          status: formState.status,
          opening_date: formState.openingDate || null,
          closing_date: formState.closingDate || null,
        }

        const response = await fetch(`/api/courses/${course.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to save course')
        }

        notify.dismiss(toastId)
        notify.success('Course saved')
      }

      // Call onSave callback with updated data
      if (onSave) {
        onSave(updatedCourse)
      }

      onClose()
    } catch (error) {
      if (toastId) notify.dismiss(toastId)
      notify.error(error instanceof Error ? error.message : 'Failed to save course')
    } finally {
      setIsSaving(false)
    }
  }, [course, formState, onSave, onClose, useApi])

  if (!course) return null

  return (
    <DottedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`edit ${course.code}`}
    >
      <DottedModalContent>
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-mono text-syntax-key mb-1">
              &apos;name&apos;:
            </label>
            <input
              type="text"
              value={formState.name}
              onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-border rounded-md bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
          </div>

          {/* Level */}
          <div>
            <label className="block text-xs font-mono text-syntax-key mb-1">
              &apos;level&apos;:
            </label>
            <select
              value={formState.level}
              onChange={(e) => setFormState(prev => ({ ...prev, level: e.target.value as CourseLevel }))}
              className="w-full px-3 py-2 border border-border rounded-md bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {COURSE_LEVELS.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-mono text-syntax-key mb-1">
              &apos;duration&apos;:
            </label>
            <input
              type="number"
              min="1"
              max="8"
              value={formState.durationYears}
              onChange={(e) => setFormState(prev => ({ ...prev, durationYears: parseInt(e.target.value) || 3 }))}
              className="w-full px-3 py-2 border border-border rounded-md bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Minimum APS */}
          <div>
            <label className="block text-xs font-mono text-syntax-key mb-1">
              &apos;minimumAps&apos;:
            </label>
            <input
              type="number"
              min="0"
              max="60"
              value={formState.minimumAps}
              onChange={(e) => setFormState(prev => ({ ...prev, minimumAps: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-border rounded-md bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Required Subjects */}
          <div>
            <label className="block text-xs font-mono text-syntax-key mb-1">
              &apos;subjects&apos;:
            </label>
            <input
              type="text"
              value={formState.requiredSubjects}
              onChange={(e) => setFormState(prev => ({ ...prev, requiredSubjects: e.target.value }))}
              placeholder="Math, English, Physics"
              className="w-full px-3 py-2 border border-border rounded-md bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="text-xs text-muted-foreground mt-1">Comma-separated list</p>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-mono text-syntax-key mb-1">
              &apos;status&apos;:
            </label>
            <select
              value={formState.status}
              onChange={(e) => setFormState(prev => ({ ...prev, status: e.target.value as 'open' | 'closed' }))}
              className="w-full px-3 py-2 border border-border rounded-md bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="open">open</option>
              <option value="closed">closed</option>
            </select>
          </div>

          {/* Application Dates */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
            <div>
              <label
                htmlFor="opening-date"
                className="block text-xs font-mono text-syntax-key mb-1"
              >
                &apos;opening_date&apos;:
              </label>
              <input
                id="opening-date"
                type="date"
                value={formState.openingDate}
                onChange={(e) => setFormState(prev => ({ ...prev, openingDate: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-describedby="opening-date-desc"
              />
              <p id="opening-date-desc" className="text-xs text-muted-foreground mt-1">
                When applications open
              </p>
            </div>
            <div>
              <label
                htmlFor="closing-date"
                className="block text-xs font-mono text-syntax-key mb-1"
              >
                &apos;closing_date&apos;:
              </label>
              <input
                id="closing-date"
                type="date"
                value={formState.closingDate}
                onChange={(e) => setFormState(prev => ({ ...prev, closingDate: e.target.value }))}
                min={formState.openingDate || undefined}
                className="w-full px-3 py-2 border border-border rounded-md bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                aria-describedby="closing-date-desc"
              />
              <p id="closing-date-desc" className="text-xs text-muted-foreground mt-1">
                When applications close
              </p>
            </div>
          </div>
        </div>
      </DottedModalContent>

      <DottedModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button variant="success" onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </DottedModalFooter>
    </DottedModal>
  )
}
