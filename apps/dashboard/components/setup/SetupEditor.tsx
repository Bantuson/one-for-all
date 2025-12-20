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
  Plus,
  Undo2,
  Moon,
  Sun,
  Building2,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { TrafficLightsFilename, ModuleBadge } from '@/components/ui/TrafficLights'
import {
  useSetupStore,
  selectCampusCount,
  selectFacultyCount,
  selectCourseCount,
} from '@/lib/stores/setupStore'
import type {
  PreConfiguredCampus,
  PreConfiguredFaculty,
  PreConfiguredCourse,
  CourseLevel,
} from '@/lib/institutions/types'

// ============================================================================
// Types
// ============================================================================

interface SetupEditorProps {
  className?: string
}

type EditableCampus = PreConfiguredCampus & {
  _id: string
  _isNew?: boolean
  _isDeleted?: boolean
}

// ============================================================================
// Constants
// ============================================================================

const LEVEL_COLORS: Record<CourseLevel, string> = {
  undergraduate: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  honours: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  postgraduate: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  masters: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  doctoral: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400',
  diploma: 'bg-green-500/10 text-green-600 dark:text-green-400',
  'advanced-diploma': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  btech: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
  mtech: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  dtech: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  certificate: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  'short-course': 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
}

// ============================================================================
// Component
// ============================================================================

export function SetupEditor({ className }: SetupEditorProps) {
  const { theme, setTheme } = useTheme()
  const {
    institutionData,
    editedCampuses,
    editingItemId,
    setEditingItem,
    updateCampus,
    deleteCampus,
    restoreCampus,
    addCampus,
    updateFaculty,
    deleteFaculty,
    addFaculty,
    updateCourse,
    deleteCourse,
    addCourse,
    mode,
    manualInstitutionName,
  } = useSetupStore()

  const campusCount = useSetupStore(selectCampusCount)
  const facultyCount = useSetupStore(selectFacultyCount)
  const courseCount = useSetupStore(selectCourseCount)

  // Selection state
  const activeCampuses = editedCampuses.filter((c) => !c._isDeleted)
  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(
    activeCampuses[0]?._id || null
  )
  const firstFacultyCode = activeCampuses[0]?.programmeTypes.flatMap(pt => pt.faculties)[0]?.code || null
  const [selectedFacultyCode, setSelectedFacultyCode] = useState<string | null>(
    firstFacultyCode
  )

  const selectedCampus = editedCampuses.find((c) => c._id === selectedCampusId)
  const allFaculties = selectedCampus?.programmeTypes.flatMap(pt => pt.faculties) || []
  const selectedFaculty = allFaculties.find(
    (f) => f.code === selectedFacultyCode
  )

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const institutionName =
    mode === 'manual' ? manualInstitutionName : institutionData?.name || 'Institution'

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="border-b border-border bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="font-mono text-sm font-medium">{institutionName}</span>
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
                <span className="text-syntax-key">{campusCount}</span>{' '}
                <span className="text-muted-foreground">campuses</span>
              </span>
              <span>
                <span className="text-syntax-export">{facultyCount}</span>{' '}
                <span className="text-muted-foreground">faculties</span>
              </span>
              <span>
                <span className="text-syntax-number">{courseCount}</span>{' '}
                <span className="text-muted-foreground">courses</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Three Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Column 1: Campuses */}
        <div className="w-72 border-r border-border bg-muted/20 overflow-y-auto flex flex-col">
          <div className="px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <TrafficLightsFilename
                status="active"
                filename="campuses/"
                rightContent={
                  <span className="text-xs font-mono text-syntax-number">
                    {campusCount}
                  </span>
                }
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  addCampus({
                    name: 'New Campus',
                    code: `CAM${Date.now().toString().slice(-4)}`,
                    location: 'Location TBD',
                    programmeTypes: [],
                  })
                }
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="flex-1 p-2 space-y-2">
            {editedCampuses.map((campus) => (
              <CampusCard
                key={campus._id}
                campus={campus}
                isSelected={selectedCampusId === campus._id}
                isEditing={editingItemId === campus._id}
                onSelect={() => {
                  if (!campus._isDeleted) {
                    setSelectedCampusId(campus._id)
                    const firstFaculty = campus.programmeTypes.flatMap(pt => pt.faculties)[0]
                    setSelectedFacultyCode(firstFaculty?.code || null)
                  }
                }}
                onEdit={() => setEditingItem(campus._id)}
                onSave={(name) => {
                  updateCampus(campus._id, { name })
                  setEditingItem(null)
                }}
                onCancel={() => setEditingItem(null)}
                onDelete={() => deleteCampus(campus._id)}
                onRestore={() => restoreCampus(campus._id)}
              />
            ))}
          </div>
        </div>

        {/* Column 2: Faculties */}
        <div className="w-72 border-r border-border bg-muted/20 overflow-y-auto flex flex-col">
          <div className="px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <TrafficLightsFilename
                status={selectedCampus ? 'active' : 'neutral'}
                filename="faculties/"
                rightContent={
                  selectedCampus && (
                    <span className="text-xs font-mono text-syntax-number">
                      {allFaculties.length}
                    </span>
                  )
                }
              />
              {selectedCampus && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    addFaculty(selectedCampus._id, {
                      name: 'New Faculty',
                      code: `FAC${Date.now().toString().slice(-4)}`,
                      courses: [],
                    })
                  }
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {selectedCampus && !selectedCampus._isDeleted ? (
            <div className="flex-1 p-2 space-y-2">
              {allFaculties.map((faculty, index) => (
                <FacultyCard
                  key={`${selectedCampus._id}-faculty-${index}`}
                  faculty={faculty}
                  campusId={selectedCampus._id}
                  isSelected={selectedFacultyCode === faculty.code}
                  isEditing={editingItemId === `${selectedCampus._id}-${faculty.code}`}
                  onSelect={() => setSelectedFacultyCode(faculty.code)}
                  onEdit={() => setEditingItem(`${selectedCampus._id}-${faculty.code}`)}
                  onSave={(name) => {
                    updateFaculty(selectedCampus._id, faculty.code, { name })
                    setEditingItem(null)
                  }}
                  onCancel={() => setEditingItem(null)}
                  onDelete={() => {
                    deleteFaculty(selectedCampus._id, faculty.code)
                    if (selectedFacultyCode === faculty.code) {
                      const remaining = allFaculties.filter(
                        (f) => f.code !== faculty.code
                      )
                      setSelectedFacultyCode(remaining[0]?.code || null)
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
            <div className="flex items-center justify-between">
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
              {selectedFaculty && selectedCampus && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    addCourse(selectedCampus._id, selectedFaculty.code, {
                      name: 'New Course',
                      code: `CRS${Date.now().toString().slice(-4)}`,
                      level: 'undergraduate',
                      durationYears: 3,
                    })
                  }
                >
                  <Plus className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>

          {selectedFaculty && selectedCampus && !selectedCampus._isDeleted ? (
            selectedFaculty.courses.length > 0 ? (
              <div className="flex-1 p-4 space-y-4">
                {selectedFaculty.courses.map((course) => (
                  <CourseCard
                    key={course.code}
                    course={course}
                    campusId={selectedCampus._id}
                    facultyCode={selectedFaculty.code}
                    facultyName={selectedFaculty.name}
                    isEditing={
                      editingItemId ===
                      `${selectedCampus._id}-${selectedFaculty.code}-${course.code}`
                    }
                    onEdit={() =>
                      setEditingItem(
                        `${selectedCampus._id}-${selectedFaculty.code}-${course.code}`
                      )
                    }
                    onSave={(name) => {
                      updateCourse(
                        selectedCampus._id,
                        selectedFaculty.code,
                        course.code,
                        { name }
                      )
                      setEditingItem(null)
                    }}
                    onCancel={() => setEditingItem(null)}
                    onDelete={() =>
                      deleteCourse(
                        selectedCampus._id,
                        selectedFaculty.code,
                        course.code
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyColumn message="No courses in this faculty" hint="$ add --course" />
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
  campus: EditableCampus
  isSelected: boolean
  isEditing: boolean
  onSelect: () => void
  onEdit: () => void
  onSave: (name: string) => void
  onCancel: () => void
  onDelete: () => void
  onRestore: () => void
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
  onRestore,
}: CampusCardProps) {
  const [editName, setEditName] = useState(campus.name)

  return (
    <div
      onClick={() => !isEditing && !campus._isDeleted && onSelect()}
      className={cn(
        'w-full rounded-md border border-border bg-card overflow-hidden',
        !campus._isDeleted && 'cursor-pointer hover:border-primary/50 transition-all',
        isSelected && !campus._isDeleted && 'ring-2 ring-primary border-primary',
        campus._isDeleted && 'opacity-50 bg-destructive/5 border-destructive/30'
      )}
    >
      {/* Card Header */}
      <div className="px-3 py-2 border-b border-border/50 bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Folder
            className={cn(
              'h-3.5 w-3.5',
              campus._isDeleted ? 'text-destructive' : 'text-syntax-key'
            )}
          />
          <span className="font-mono text-xs text-foreground">
            {campus.code.toLowerCase()}/
          </span>
        </div>
        <div className="flex items-center gap-1">
          {campus._isNew && (
            <span className="text-[10px] px-1.5 py-0.5 bg-green-500/10 text-green-600 rounded font-medium">
              new
            </span>
          )}
          {campus._isDeleted && (
            <span className="text-[10px] px-1.5 py-0.5 bg-destructive/10 text-destructive rounded font-medium">
              removed
            </span>
          )}
          {campus.isMain && !campus._isDeleted && (
            <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium">
              main
            </span>
          )}
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
            <div className={cn(campus._isDeleted && 'line-through')}>
              <span className="text-syntax-key">"name"</span>
              <span className="text-foreground"> : </span>
              <span className="text-syntax-string">"{campus.name}"</span>
            </div>
            <div className={cn(campus._isDeleted && 'line-through')}>
              <span className="text-syntax-key">"faculties"</span>
              <span className="text-foreground"> : </span>
              <span className="text-syntax-number">{campus.programmeTypes.reduce((sum, pt) => sum + pt.faculties.length, 0)}</span>
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
        ) : campus._isDeleted ? (
          <div className="flex gap-1 w-full justify-end" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" onClick={onRestore}>
              <Undo2 className="h-3 w-3 mr-1" />
              <span className="text-xs">Restore</span>
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
  faculty: PreConfiguredFaculty
  campusId: string
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
  campusId,
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
        <ModuleBadge />
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
  course: PreConfiguredCourse
  campusId: string
  facultyCode: string
  facultyName: string
  isEditing: boolean
  onEdit: () => void
  onSave: (name: string) => void
  onCancel: () => void
  onDelete: () => void
}

function CourseCard({
  course,
  campusId,
  facultyCode,
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
          rightContent={
            <span
              className={cn(
                'text-[10px] px-1.5 py-0.5 rounded font-medium',
                LEVEL_COLORS[course.level]
              )}
            >
              {course.level}
            </span>
          }
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
                <span className="text-syntax-number">
                  {course.requirements.minimumAps}
                </span>
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
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-syntax-number">{course.durationYears}</span>
                <span className="text-syntax-comment">years</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SetupEditor
