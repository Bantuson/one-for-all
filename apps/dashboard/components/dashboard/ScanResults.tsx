'use client'

import { useState } from 'react'
import {
  Building2,
  GraduationCap,
  BookOpen,
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  Check,
  X,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  LayoutGrid,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useScanStore } from '@/lib/stores/scanStore'
import { DashboardPreview } from './DashboardPreview'
import type { ScanResults as ScanResultsType, Campus, Faculty, Course } from '@/lib/scanner/types'

interface ScanResultsProps {
  results: ScanResultsType
  institutionSlug: string
  onAccept: () => void
  onCancel: () => void
  onRescan: () => void
}

export function ScanResults({
  results,
  institutionSlug,
  onAccept,
  onCancel,
  onRescan,
}: ScanResultsProps) {
  const [showPreview, setShowPreview] = useState(false)
  const {
    expandedCampuses,
    expandedFaculties,
    editingItemId,
    toggleCampusExpanded,
    toggleFacultyExpanded,
    setEditingItem,
    updateCampus,
    updateFaculty,
    updateCourse,
    deleteCampus,
    deleteFaculty,
    deleteCourse,
  } = useScanStore()

  // Count totals
  const totalCampuses = results.campuses.length
  const totalFaculties = results.campuses.reduce(
    (sum, c) => sum + c.faculties.length,
    0
  )
  const totalCourses = results.campuses.reduce(
    (sum, c) => sum + c.faculties.reduce((fs, f) => fs + f.courses.length, 0),
    0
  )

  // Show Dashboard Preview mode
  if (showPreview) {
    return (
      <DashboardPreview
        results={results}
        institutionSlug={institutionSlug}
        onBack={() => setShowPreview(false)}
        onAccept={onAccept}
      />
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background sticky top-0 z-10">
        <div className="container max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Scan Results</h1>
              <p className="text-sm text-muted-foreground">
                Review and edit before saving to your dashboard
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onRescan}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Rescan
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(true)}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Preview Dashboard
              </Button>
              <Button variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
              <Button size="sm" onClick={onAccept}>
                <Check className="h-4 w-4 mr-2" />
                Accept & Save
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              <span className="font-medium">{totalCampuses}</span>
              <span className="text-muted-foreground">Campuses</span>
            </div>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-purple-500" />
              <span className="font-medium">{totalFaculties}</span>
              <span className="text-muted-foreground">Faculties</span>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-green-500" />
              <span className="font-medium">{totalCourses}</span>
              <span className="text-muted-foreground">Courses</span>
            </div>
          </div>
        </div>
      </div>

      {/* Results Tree */}
      <div className="flex-1 overflow-auto">
        <div className="container max-w-5xl mx-auto px-4 py-6">
          {results.campuses.length === 0 ? (
            <EmptyState onRescan={onRescan} />
          ) : (
            <div className="space-y-4">
              {results.campuses.map((campus, campusIndex) => (
                <CampusItem
                  key={campus.id || `campus-${campusIndex}`}
                  campus={campus}
                  isExpanded={expandedCampuses.has(campus.id)}
                  expandedFaculties={expandedFaculties}
                  editingItemId={editingItemId}
                  onToggle={() => toggleCampusExpanded(campus.id)}
                  onToggleFaculty={toggleFacultyExpanded}
                  onEdit={setEditingItem}
                  onUpdateCampus={updateCampus}
                  onUpdateFaculty={(facultyId, updates) =>
                    updateFaculty(campus.id, facultyId, updates)
                  }
                  onUpdateCourse={(facultyId, courseId, updates) =>
                    updateCourse(campus.id, facultyId, courseId, updates)
                  }
                  onDeleteCampus={() => deleteCampus(campus.id)}
                  onDeleteFaculty={(facultyId) =>
                    deleteFaculty(campus.id, facultyId)
                  }
                  onDeleteCourse={(facultyId, courseId) =>
                    deleteCourse(campus.id, facultyId, courseId)
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

function EmptyState({ onRescan }: { onRescan: () => void }) {
  return (
    <div className="text-center py-12">
      <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold mb-2">No Data Found</h3>
      <p className="text-muted-foreground mb-4">
        The scanner couldn't find any academic content on the website.
        This could be due to the website structure or access restrictions.
      </p>
      <Button onClick={onRescan}>Try Again</Button>
    </div>
  )
}

interface CampusItemProps {
  campus: Campus
  isExpanded: boolean
  expandedFaculties: Set<string>
  editingItemId: string | null
  onToggle: () => void
  onToggleFaculty: (id: string) => void
  onEdit: (id: string | null) => void
  onUpdateCampus: (id: string, updates: Partial<Campus>) => void
  onUpdateFaculty: (id: string, updates: Partial<Faculty>) => void
  onUpdateCourse: (facultyId: string, courseId: string, updates: Partial<Course>) => void
  onDeleteCampus: () => void
  onDeleteFaculty: (id: string) => void
  onDeleteCourse: (facultyId: string, courseId: string) => void
}

function CampusItem({
  campus,
  isExpanded,
  expandedFaculties,
  editingItemId,
  onToggle,
  onToggleFaculty,
  onEdit,
  onUpdateCampus,
  onUpdateFaculty,
  onUpdateCourse,
  onDeleteCampus,
  onDeleteFaculty,
  onDeleteCourse,
}: CampusItemProps) {
  const isEditing = editingItemId === campus.id
  const [editName, setEditName] = useState(campus.name)

  const handleSave = () => {
    onUpdateCampus(campus.id, { name: editName })
    onEdit(null)
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Campus Header */}
      <div
        className="flex items-center gap-3 p-4 bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
        onClick={() => !isEditing && onToggle()}
      >
        <button className="p-1" onClick={(e) => { e.stopPropagation(); onToggle() }}>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        <Building2 className="h-5 w-5 text-blue-500" />

        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="flex-1 px-2 py-1 border rounded bg-background"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') onEdit(null)
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 font-medium">{campus.name}</span>
        )}

        {campus.location && !isEditing && (
          <span className="text-sm text-muted-foreground">{campus.location}</span>
        )}

        <ConfidenceBadge confidence={campus.confidence} />

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {isEditing ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleSave}>
                <Check className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onEdit(null)}>
                <X className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditName(campus.name)
                  onEdit(campus.id)
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onDeleteCampus}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
              {campus.sourceUrl && (
                <a
                  href={campus.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-muted rounded"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </>
          )}
        </div>
      </div>

      {/* Faculties */}
      {isExpanded && (
        <div className="border-t">
          {campus.faculties.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              No faculties found for this campus
            </div>
          ) : (
            campus.faculties.map((faculty, facultyIndex) => (
              <FacultyItem
                key={faculty.id || `faculty-${facultyIndex}`}
                faculty={faculty}
                isExpanded={expandedFaculties.has(faculty.id)}
                editingItemId={editingItemId}
                onToggle={() => onToggleFaculty(faculty.id)}
                onEdit={onEdit}
                onUpdate={(updates) => onUpdateFaculty(faculty.id, updates)}
                onUpdateCourse={(courseId, updates) =>
                  onUpdateCourse(faculty.id, courseId, updates)
                }
                onDelete={() => onDeleteFaculty(faculty.id)}
                onDeleteCourse={(courseId) =>
                  onDeleteCourse(faculty.id, courseId)
                }
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

interface FacultyItemProps {
  faculty: Faculty
  isExpanded: boolean
  editingItemId: string | null
  onToggle: () => void
  onEdit: (id: string | null) => void
  onUpdate: (updates: Partial<Faculty>) => void
  onUpdateCourse: (courseId: string, updates: Partial<Course>) => void
  onDelete: () => void
  onDeleteCourse: (courseId: string) => void
}

function FacultyItem({
  faculty,
  isExpanded,
  editingItemId,
  onToggle,
  onEdit,
  onUpdate,
  onUpdateCourse,
  onDelete,
  onDeleteCourse,
}: FacultyItemProps) {
  const isEditing = editingItemId === faculty.id
  const [editName, setEditName] = useState(faculty.name)

  const handleSave = () => {
    onUpdate({ name: editName })
    onEdit(null)
  }

  return (
    <div className="border-b last:border-b-0">
      {/* Faculty Header */}
      <div
        className="flex items-center gap-3 p-3 pl-12 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => !isEditing && onToggle()}
      >
        <button className="p-1" onClick={(e) => { e.stopPropagation(); onToggle() }}>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        <GraduationCap className="h-4 w-4 text-purple-500" />

        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="flex-1 px-2 py-1 border rounded bg-background text-sm"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') onEdit(null)
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 text-sm">{faculty.name}</span>
        )}

        <span className="text-xs text-muted-foreground">
          {faculty.courses.length} courses
        </span>

        <ConfidenceBadge confidence={faculty.confidence} />

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {isEditing ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleSave}>
                <Check className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onEdit(null)}>
                <X className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditName(faculty.name)
                  onEdit(faculty.id)
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onDelete}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Courses */}
      {isExpanded && (
        <div className="bg-muted/30">
          {faculty.courses.length === 0 ? (
            <div className="p-3 pl-20 text-xs text-muted-foreground">
              No courses found for this faculty
            </div>
          ) : (
            faculty.courses.map((course, courseIndex) => (
              <CourseItem
                key={course.id || `course-${courseIndex}`}
                course={course}
                editingItemId={editingItemId}
                onEdit={onEdit}
                onUpdate={(updates) => onUpdateCourse(course.id, updates)}
                onDelete={() => onDeleteCourse(course.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

interface CourseItemProps {
  course: Course
  editingItemId: string | null
  onEdit: (id: string | null) => void
  onUpdate: (updates: Partial<Course>) => void
  onDelete: () => void
}

function CourseItem({
  course,
  editingItemId,
  onEdit,
  onUpdate,
  onDelete,
}: CourseItemProps) {
  const isEditing = editingItemId === course.id
  const [editName, setEditName] = useState(course.name)

  const handleSave = () => {
    onUpdate({ name: editName })
    onEdit(null)
  }

  return (
    <div className="flex items-center gap-3 p-2 pl-20 border-b last:border-b-0 hover:bg-muted/50 transition-colors">
      <BookOpen className="h-3 w-3 text-green-500" />

      {isEditing ? (
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="flex-1 px-2 py-1 border rounded bg-background text-xs"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') onEdit(null)
          }}
        />
      ) : (
        <span className="flex-1 text-xs">{course.name}</span>
      )}

      {course.code && !isEditing && (
        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {course.code}
        </span>
      )}

      <ConfidenceBadge confidence={course.confidence} size="sm" />

      <div className="flex items-center gap-1">
        {isEditing ? (
          <>
            <Button variant="ghost" size="sm" onClick={handleSave}>
              <Check className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onEdit(null)}>
              <X className="h-3 w-3" />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditName(course.name)
                onEdit(course.id)
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

function ConfidenceBadge({
  confidence,
  size = 'md',
}: {
  confidence: number
  size?: 'sm' | 'md'
}) {
  const percent = Math.round(confidence * 100)
  let colorClass = 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'

  if (percent < 50) {
    colorClass = 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
  } else if (percent < 75) {
    colorClass = 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
  }

  const sizeClass = size === 'sm' ? 'text-[10px] px-1 py-0.5' : 'text-xs px-1.5 py-0.5'

  return (
    <span
      className={`${sizeClass} ${colorClass} rounded font-medium`}
      title={`${percent}% confidence`}
    >
      {percent}%
    </span>
  )
}
