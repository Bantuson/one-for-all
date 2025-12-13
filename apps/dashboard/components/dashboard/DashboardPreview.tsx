'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import {
  Folder,
  BookOpen,
  GraduationCap,
  Pencil,
  Check,
  X,
  Trash2,
  ChevronLeft,
  Eye,
  Moon,
  Sun,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { CommandButton } from '@/components/ui/CommandButton'
import { TrafficLightsFilename, StatusBadge, ModuleBadge } from '@/components/ui/TrafficLights'
import { useScanStore } from '@/lib/stores/scanStore'
import type { ScanResults, Campus, Faculty, Course } from '@/lib/scanner/types'

interface DashboardPreviewProps {
  results: ScanResults
  institutionSlug: string
  onBack: () => void
  onAccept: () => void
}

export function DashboardPreview({
  results,
  institutionSlug,
  onBack,
  onAccept,
}: DashboardPreviewProps) {
  const { theme, setTheme } = useTheme()
  const {
    editingItemId,
    setEditingItem,
    updateCampus,
    updateFaculty,
    updateCourse,
    deleteCampus,
    deleteFaculty,
    deleteCourse,
  } = useScanStore()

  const [selectedCampus, setSelectedCampus] = useState<Campus | null>(
    results.campuses[0] || null
  )
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(
    results.campuses[0]?.faculties[0] || null
  )

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

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Edit
            </Button>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              <span className="font-mono text-sm font-medium">Dashboard Preview</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="gap-2"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4" />
                  <span className="font-mono text-xs">light</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" />
                  <span className="font-mono text-xs">dark</span>
                </>
              )}
            </Button>

            {/* Stats */}
            <div className="hidden md:flex items-center gap-4 text-xs font-mono">
              <span>
                <span className="text-syntax-key">{totalCampuses}</span>{' '}
                <span className="text-muted-foreground">campuses</span>
              </span>
              <span>
                <span className="text-syntax-export">{totalFaculties}</span>{' '}
                <span className="text-muted-foreground">faculties</span>
              </span>
              <span>
                <span className="text-syntax-number">{totalCourses}</span>{' '}
                <span className="text-muted-foreground">courses</span>
              </span>
            </div>

            <Button size="sm" onClick={onAccept}>
              <Check className="h-4 w-4 mr-2" />
              Accept & Save
            </Button>
          </div>
        </div>
      </div>

      {/* Three Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Column 1: Campuses */}
        <div className="w-72 border-r border-border bg-muted/20 overflow-y-auto flex flex-col">
          <div className="px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
            <TrafficLightsFilename
              status="active"
              filename="campuses/"
              rightContent={
                <span className="text-xs font-mono text-syntax-number">
                  {results.campuses.length}
                </span>
              }
            />
          </div>

          <div className="flex-1 p-2 space-y-2">
            {results.campuses.map((campus, index) => (
              <CampusCard
                key={campus.id || `campus-${index}`}
                campus={campus}
                isSelected={selectedCampus?.id === campus.id}
                isEditing={editingItemId === campus.id}
                onSelect={() => {
                  setSelectedCampus(campus)
                  setSelectedFaculty(campus.faculties[0] || null)
                }}
                onEdit={() => setEditingItem(campus.id)}
                onSave={(name) => {
                  updateCampus(campus.id, { name })
                  setEditingItem(null)
                }}
                onCancel={() => setEditingItem(null)}
                onDelete={() => {
                  deleteCampus(campus.id)
                  if (selectedCampus?.id === campus.id) {
                    const remaining = results.campuses.filter((c) => c.id !== campus.id)
                    setSelectedCampus(remaining[0] || null)
                    setSelectedFaculty(remaining[0]?.faculties[0] || null)
                  }
                }}
              />
            ))}
          </div>
        </div>

        {/* Column 2: Faculties */}
        <div className="w-72 border-r border-border bg-muted/20 overflow-y-auto flex flex-col">
          <div className="px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
            <TrafficLightsFilename
              status={selectedCampus ? 'active' : 'neutral'}
              filename="faculties/"
              rightContent={
                selectedCampus && (
                  <span className="text-xs font-mono text-syntax-number">
                    {selectedCampus.faculties.length}
                  </span>
                )
              }
            />
          </div>

          {selectedCampus ? (
            <div className="flex-1 p-2 space-y-2">
              {selectedCampus.faculties.map((faculty, index) => (
                <FacultyCard
                  key={faculty.id || `faculty-${index}`}
                  faculty={faculty}
                  isSelected={selectedFaculty?.id === faculty.id}
                  isEditing={editingItemId === faculty.id}
                  onSelect={() => setSelectedFaculty(faculty)}
                  onEdit={() => setEditingItem(faculty.id)}
                  onSave={(name) => {
                    updateFaculty(selectedCampus.id, faculty.id, { name })
                    setEditingItem(null)
                  }}
                  onCancel={() => setEditingItem(null)}
                  onDelete={() => {
                    deleteFaculty(selectedCampus.id, faculty.id)
                    if (selectedFaculty?.id === faculty.id) {
                      const remaining = selectedCampus.faculties.filter(
                        (f) => f.id !== faculty.id
                      )
                      setSelectedFaculty(remaining[0] || null)
                    }
                  }}
                />
              ))}
            </div>
          ) : (
            <EmptyColumn message="No campus selected" hint="$ select --campus first" />
          )}
        </div>

        {/* Column 3: Courses */}
        <div className="flex-1 bg-card overflow-y-auto flex flex-col">
          <div className="px-4 py-3 border-b border-border sticky top-0 z-10 bg-card">
            <TrafficLightsFilename
              status={selectedFaculty ? 'active' : 'neutral'}
              filename={
                selectedFaculty
                  ? `${selectedFaculty.code.toLowerCase()}.courses`
                  : 'courses/'
              }
              rightContent={
                selectedFaculty && (
                  <span className="text-xs font-mono text-syntax-number">
                    {selectedFaculty.courses.length}
                  </span>
                )
              }
            />
          </div>

          {selectedFaculty && selectedCampus ? (
            selectedFaculty.courses.length > 0 ? (
              <div className="flex-1 p-4 space-y-4">
                {selectedFaculty.courses.map((course, index) => (
                  <CourseCard
                    key={course.id || `course-${index}`}
                    course={course}
                    facultyName={selectedFaculty.name}
                    isEditing={editingItemId === course.id}
                    onEdit={() => setEditingItem(course.id)}
                    onSave={(name) => {
                      updateCourse(selectedCampus.id, selectedFaculty.id, course.id, {
                        name,
                      })
                      setEditingItem(null)
                    }}
                    onCancel={() => setEditingItem(null)}
                    onDelete={() =>
                      deleteCourse(selectedCampus.id, selectedFaculty.id, course.id)
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyColumn
                message="No courses in this faculty"
                hint="const courses = [];"
              />
            )
          ) : (
            <EmptyColumn message="No faculty selected" hint="$ select --faculty first" />
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

function EmptyColumn({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center font-mono">
        <p className="text-syntax-comment text-sm">// {message}</p>
        <p className="text-syntax-comment text-xs mt-1">{hint}</p>
      </div>
    </div>
  )
}

interface CampusCardProps {
  campus: Campus
  isSelected: boolean
  isEditing: boolean
  onSelect: () => void
  onEdit: () => void
  onSave: (name: string) => void
  onCancel: () => void
  onDelete: () => void
}

function CampusCard({
  campus,
  isSelected,
  isEditing,
  onSelect,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: CampusCardProps) {
  const [editName, setEditName] = useState(campus.name)

  return (
    <div
      onClick={() => !isEditing && onSelect()}
      className={cn(
        'w-full rounded-md border border-border bg-card overflow-hidden cursor-pointer',
        'hover:border-primary/50 transition-all',
        isSelected && 'ring-2 ring-primary border-primary'
      )}
    >
      {/* Card Header */}
      <div className="px-3 py-2 border-b border-border/50 bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Folder className="h-3.5 w-3.5 text-syntax-key" />
          <span className="font-mono text-xs text-foreground">
            {campus.code.toLowerCase()}/
          </span>
        </div>
        <div className="flex items-center gap-1">
          <ConfidenceDot confidence={campus.confidence} />
          {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-primary ml-1" />}
        </div>
      </div>

      {/* Card Body */}
      <div className="px-3 py-2 font-mono text-sm space-y-1">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full px-2 py-1 border rounded bg-background text-sm font-mono"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave(editName)
              if (e.key === 'Escape') onCancel()
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <div>
              <span className="text-syntax-key">"name"</span>
              <span className="text-foreground"> : </span>
              <span className="text-syntax-string">"{campus.name}"</span>
            </div>
            <div>
              <span className="text-syntax-key">"faculties"</span>
              <span className="text-foreground"> : </span>
              <span className="text-syntax-number">{campus.faculties.length}</span>
            </div>
          </>
        )}
      </div>

      {/* Card Footer */}
      <div className="px-3 py-1.5 border-t border-border/50 bg-muted/20 flex items-center justify-between">
        {isEditing ? (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" onClick={() => onSave(editName)}>
              <Check className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <>
            <span className="font-mono text-xs text-syntax-comment">
              $ cd {campus.code.toLowerCase()}
            </span>
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditName(campus.name)
                  onEdit()
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onDelete}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

interface FacultyCardProps {
  faculty: Faculty
  isSelected: boolean
  isEditing: boolean
  onSelect: () => void
  onEdit: () => void
  onSave: (name: string) => void
  onCancel: () => void
  onDelete: () => void
}

function FacultyCard({
  faculty,
  isSelected,
  isEditing,
  onSelect,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: FacultyCardProps) {
  const [editName, setEditName] = useState(faculty.name)

  return (
    <div
      onClick={() => !isEditing && onSelect()}
      className={cn(
        'w-full rounded-md border border-border bg-card overflow-hidden cursor-pointer',
        'hover:border-primary/50 transition-all',
        isSelected && 'ring-2 ring-primary border-primary'
      )}
    >
      {/* Card Header */}
      <div className="px-3 py-2 border-b border-border/50 bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-3.5 w-3.5 text-syntax-export" />
          <span className="font-mono text-xs text-foreground">
            {faculty.code.toLowerCase()}/
          </span>
        </div>
        <div className="flex items-center gap-1">
          <ConfidenceDot confidence={faculty.confidence} />
          <ModuleBadge />
        </div>
      </div>

      {/* Card Body */}
      <div className="px-3 py-2 font-mono text-sm space-y-1">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full px-2 py-1 border rounded bg-background text-sm font-mono"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave(editName)
              if (e.key === 'Escape') onCancel()
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <div>
              <span className="text-syntax-key">"name"</span>
              <span className="text-foreground"> : </span>
              <span className="text-syntax-string">"{faculty.name}"</span>
            </div>
            <div>
              <span className="text-syntax-key">"courses"</span>
              <span className="text-foreground"> : </span>
              <span className="text-syntax-number">{faculty.courses.length}</span>
              <span className="text-syntax-comment"> // active</span>
            </div>
          </>
        )}
      </div>

      {/* Card Footer */}
      <div className="px-3 py-1.5 border-t border-border/50 bg-muted/20 flex items-center justify-between">
        {isEditing ? (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" onClick={() => onSave(editName)}>
              <Check className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <>
            <span className="font-mono text-xs text-syntax-comment">
              $ cd {faculty.code.toLowerCase()}
            </span>
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditName(faculty.name)
                  onEdit()
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onDelete}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

interface CourseCardProps {
  course: Course
  facultyName: string
  isEditing: boolean
  onEdit: () => void
  onSave: (name: string) => void
  onCancel: () => void
  onDelete: () => void
}

function CourseCard({
  course,
  facultyName,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: CourseCardProps) {
  const [editName, setEditName] = useState(course.name)

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50 transition-all">
      {/* Card Header */}
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <TrafficLightsFilename
          status="active"
          filename={`${course.code.toLowerCase()}.course`}
          rightContent={<ConfidenceBadge confidence={course.confidence} />}
        />
        <div className="flex gap-1">
          {isEditing ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => onSave(editName)}>
                <Check className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onCancel}>
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
                  onEdit()
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

      {/* Card Body */}
      <div className="p-4 font-mono text-sm space-y-1">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full px-2 py-1 border rounded bg-background text-sm font-mono"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave(editName)
              if (e.key === 'Escape') onCancel()
            }}
          />
        ) : (
          <>
            <div>
              <span className="text-syntax-export">export</span>
              <span className="text-syntax-string"> "{course.name}"</span>
            </div>
            <div className="flex items-center gap-1">
              <span>🎓</span>
              <span className="text-syntax-from">from</span>
              <span className="text-syntax-string">"{facultyName}"</span>
            </div>
            {course.description && (
              <>
                <div className="text-syntax-comment">//</div>
                <div className="text-syntax-comment">// {course.description}</div>
              </>
            )}
          </>
        )}
      </div>

      {/* Card Footer - Requirements */}
      {course.requirements && (
        <div className="px-4 py-3 border-t border-border bg-muted/20">
          <div className="font-mono text-xs space-y-1">
            {course.requirements.minimumAps && (
              <div>
                <span className="text-syntax-key">"minimumAps"</span>
                <span className="text-foreground"> : </span>
                <span className="text-syntax-number">{course.requirements.minimumAps}</span>
              </div>
            )}
            {course.requirements.requiredSubjects &&
              course.requirements.requiredSubjects.length > 0 && (
                <div>
                  <span className="text-syntax-key">"subjects"</span>
                  <span className="text-foreground"> : </span>
                  <span className="text-syntax-string">
                    [{course.requirements.requiredSubjects.slice(0, 2).join(', ')}
                    {course.requirements.requiredSubjects.length > 2 && ', ...'}]
                  </span>
                </div>
              )}
            {course.durationYears && (
              <div>
                <span className="text-syntax-key">"duration"</span>
                <span className="text-foreground"> : </span>
                <span className="text-syntax-number">{course.durationYears}</span>
                <span className="text-syntax-comment"> // years</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ConfidenceDot({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100)
  let colorClass = 'bg-green-500'

  if (percent < 50) {
    colorClass = 'bg-red-500'
  } else if (percent < 75) {
    colorClass = 'bg-amber-500'
  }

  return (
    <span
      className={`h-2 w-2 rounded-full ${colorClass}`}
      title={`${percent}% confidence`}
    />
  )
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100)
  let colorClass = 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'

  if (percent < 50) {
    colorClass = 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
  } else if (percent < 75) {
    colorClass = 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
  }

  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 ${colorClass} rounded font-medium`}
      title={`${percent}% confidence`}
    >
      {percent}%
    </span>
  )
}
