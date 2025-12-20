'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTheme } from 'next-themes'
import {
  ChevronRight,
  ChevronDown,
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
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
  ProgrammeTypeCategory,
} from '@/lib/institutions/types'

// ============================================================================
// Types
// ============================================================================

interface SetupEditorMasterDetailProps {
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
// Tree Node ID Generators
// ============================================================================

function getCampusNodeId(campusId: string): string {
  return `campus:${campusId}`
}

function getProgrammeTypeNodeId(campusId: string, programmeType: string): string {
  return `programme:${campusId}:${programmeType}`
}

function getFacultyNodeId(campusId: string, programmeType: string, facultyCode: string): string {
  return `faculty:${campusId}:${programmeType}:${facultyCode}`
}

// ============================================================================
// Breadcrumb Component
// ============================================================================

interface BreadcrumbProps {
  institutionName: string
  selectedCampus: EditableCampus | null
  selectedProgrammeType: string | null
  selectedFaculty: PreConfiguredFaculty | null
  onNavigateToRoot: () => void
  onNavigateToCampus: () => void
  onNavigateToProgrammeType: () => void
}

function Breadcrumb({
  institutionName,
  selectedCampus,
  selectedProgrammeType,
  selectedFaculty,
  onNavigateToRoot,
  onNavigateToCampus,
  onNavigateToProgrammeType,
}: BreadcrumbProps) {
  const segments: { label: string; onClick?: () => void; isActive: boolean }[] = []

  if (selectedCampus) {
    segments.push({
      label: selectedCampus.name,
      onClick: onNavigateToCampus,
      isActive: !selectedProgrammeType,
    })
  }

  if (selectedProgrammeType) {
    segments.push({
      label: selectedProgrammeType.toLowerCase(),
      onClick: onNavigateToProgrammeType,
      isActive: !selectedFaculty,
    })
  }

  if (selectedFaculty) {
    segments.push({
      label: selectedFaculty.code.toLowerCase(),
      isActive: true,
    })
  }

  return (
    <div className="px-4 py-2 border-b border-border bg-muted/30">
      <div className="flex items-center gap-1 font-mono text-sm">
        <span className="text-traffic-green">$</span>
        <span className="text-syntax-key ml-1">pwd:</span>
        <div className="flex items-center">
          {segments.map((segment, index) => (
            <span key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="h-3 w-3 mx-1 text-muted-foreground" aria-hidden="true" />
              )}
              {segment.onClick && !segment.isActive ? (
                <button
                  type="button"
                  onClick={segment.onClick}
                  className="text-syntax-string hover:text-primary hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded"
                >
                  {segment.label}
                </button>
              ) : (
                <span className={cn(segment.isActive ? 'text-foreground' : 'text-syntax-string')}>
                  {segment.label}
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Tree Node Components
// ============================================================================

interface TreeNodeProps {
  label: string
  nodeId: string
  icon: React.ReactNode
  isExpanded: boolean
  isSelected: boolean
  hasChildren: boolean
  level: number
  badge?: React.ReactNode
  isDeleted?: boolean
  isNew?: boolean
  actions?: React.ReactNode
  onToggle: () => void
  onSelect: () => void
}

function TreeNode({
  label,
  nodeId,
  icon,
  isExpanded,
  isSelected,
  hasChildren,
  level,
  badge,
  isDeleted,
  isNew,
  actions,
  onToggle,
  onSelect,
}: TreeNodeProps) {
  const paddingLeft = level * 12

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onSelect()
      } else if (event.key === 'ArrowRight' && hasChildren && !isExpanded) {
        event.preventDefault()
        onToggle()
      } else if (event.key === 'ArrowLeft' && hasChildren && isExpanded) {
        event.preventDefault()
        onToggle()
      }
    },
    [hasChildren, isExpanded, onSelect, onToggle]
  )

  return (
    <div
      role="treeitem"
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-selected={isSelected}
      tabIndex={0}
      className={cn(
        'group flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer',
        'font-mono text-sm transition-all',
        'hover:bg-muted/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isSelected && 'ring-2 ring-primary bg-primary/10',
        isDeleted && 'opacity-50 line-through'
      )}
      style={{ paddingLeft: `${paddingLeft + 8}px` }}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
    >
      {hasChildren ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          className="p-0.5 -ml-1 hover:bg-muted rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </button>
      ) : (
        <span className="w-4" aria-hidden="true" />
      )}
      <span className="shrink-0">{icon}</span>
      <span className={cn('truncate flex-1', isSelected ? 'text-foreground' : 'text-muted-foreground')}>
        {label}
      </span>
      {isNew && (
        <span className="text-[10px] px-1 py-0.5 bg-green-500/10 text-green-600 rounded">new</span>
      )}
      {isDeleted && (
        <span className="text-[10px] px-1 py-0.5 bg-destructive/10 text-destructive rounded">removed</span>
      )}
      {badge && <span className="shrink-0">{badge}</span>}
      {actions && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Navigation Tree Component
// ============================================================================

interface NavigationTreeProps {
  campuses: EditableCampus[]
  expandedNodes: Set<string>
  selectedCampusId: string | null
  selectedProgrammeType: string | null
  selectedFacultyCode: string | null
  editingItemId: string | null
  onToggleNode: (nodeId: string) => void
  onSelectFaculty: (campus: EditableCampus, programmeType: string, faculty: PreConfiguredFaculty) => void
  onAddCampus: () => void
  onEditCampus: (campusId: string) => void
  onDeleteCampus: (campusId: string) => void
  onRestoreCampus: (campusId: string) => void
  onAddFaculty: (campusId: string, programmeType: string) => void
  onEditFaculty: (campusId: string, facultyCode: string) => void
  onDeleteFaculty: (campusId: string, facultyCode: string) => void
}

function NavigationTree({
  campuses,
  expandedNodes,
  selectedCampusId,
  selectedProgrammeType,
  selectedFacultyCode,
  editingItemId,
  onToggleNode,
  onSelectFaculty,
  onAddCampus,
  onEditCampus,
  onDeleteCampus,
  onRestoreCampus,
  onAddFaculty,
  onEditFaculty,
  onDeleteFaculty,
}: NavigationTreeProps) {
  const totalFaculties = useMemo(() => {
    return campuses
      .filter((c) => !c._isDeleted)
      .reduce(
        (total, campus) =>
          total + campus.programmeTypes.reduce((ptTotal, pt) => ptTotal + pt.faculties.length, 0),
        0
      )
  }, [campuses])

  return (
    <div className="flex flex-col h-full" role="tree" aria-label="Institution hierarchy">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <TrafficLightsFilename
            status="active"
            filename="structure/"
            rightContent={
              <span className="text-xs font-mono text-syntax-number">{totalFaculties}</span>
            }
          />
          <Button variant="ghost" size="sm" onClick={onAddCampus}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-2" role="group">
        {campuses.map((campus) => {
          const campusNodeId = getCampusNodeId(campus._id)
          const isCampusExpanded = expandedNodes.has(campusNodeId)
          const hasProgrammeTypes = campus.programmeTypes.length > 0

          return (
            <div key={campus._id} role="group" aria-label={campus.name}>
              <TreeNode
                label={`${campus.name}/`}
                nodeId={campusNodeId}
                icon={<Folder className={cn('h-3.5 w-3.5', campus._isDeleted ? 'text-destructive' : 'text-syntax-key')} />}
                isExpanded={isCampusExpanded}
                isSelected={false}
                hasChildren={hasProgrammeTypes && !campus._isDeleted}
                level={0}
                isDeleted={campus._isDeleted}
                isNew={campus._isNew}
                badge={
                  !campus._isDeleted && (
                    <span className="text-xs font-mono text-syntax-comment">
                      {campus.programmeTypes.reduce((sum, pt) => sum + pt.faculties.length, 0)}
                    </span>
                  )
                }
                actions={
                  campus._isDeleted ? (
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => onRestoreCampus(campus._id)}>
                      <Undo2 className="h-3 w-3" />
                    </Button>
                  ) : (
                    <>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => onEditCampus(campus._id)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => onDeleteCampus(campus._id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </>
                  )
                }
                onToggle={() => onToggleNode(campusNodeId)}
                onSelect={() => onToggleNode(campusNodeId)}
              />

              {isCampusExpanded && !campus._isDeleted &&
                campus.programmeTypes.map((pt) => {
                  const ptNodeId = getProgrammeTypeNodeId(campus._id, pt.type)
                  const isPtExpanded = expandedNodes.has(ptNodeId)
                  const hasFaculties = pt.faculties.length > 0

                  return (
                    <div key={pt.type} role="group" aria-label={pt.displayName}>
                      <TreeNode
                        label={`${pt.type.toLowerCase()}/`}
                        nodeId={ptNodeId}
                        icon={<GraduationCap className="h-3.5 w-3.5 text-syntax-export" />}
                        isExpanded={isPtExpanded}
                        isSelected={false}
                        hasChildren={hasFaculties}
                        level={1}
                        badge={
                          <span className="text-xs font-mono text-syntax-comment">
                            {pt.faculties.length}
                          </span>
                        }
                        actions={
                          <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => onAddFaculty(campus._id, pt.type)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        }
                        onToggle={() => onToggleNode(ptNodeId)}
                        onSelect={() => onToggleNode(ptNodeId)}
                      />

                      {isPtExpanded &&
                        pt.faculties.map((faculty, index) => {
                          const facultyNodeId = getFacultyNodeId(campus._id, pt.type, faculty.code)
                          const isSelected =
                            selectedCampusId === campus._id &&
                            selectedProgrammeType === pt.type &&
                            selectedFacultyCode === faculty.code

                          return (
                            <TreeNode
                              key={`${campus._id}-${pt.type}-${faculty.code}-${index}`}
                              label={`${faculty.code.toLowerCase()}/`}
                              nodeId={facultyNodeId}
                              icon={<BookOpen className="h-3.5 w-3.5 text-syntax-string" />}
                              isExpanded={false}
                              isSelected={isSelected}
                              hasChildren={false}
                              level={2}
                              badge={
                                <span className="text-xs font-mono text-syntax-number">
                                  {faculty.courses.length}
                                </span>
                              }
                              actions={
                                <>
                                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => onEditFaculty(campus._id, faculty.code)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => onDeleteFaculty(campus._id, faculty.code)}>
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </>
                              }
                              onToggle={() => {}}
                              onSelect={() => onSelectFaculty(campus, pt.type, faculty)}
                            />
                          )
                        })}
                    </div>
                  )
                })}
            </div>
          )
        })}

        {campuses.filter((c) => !c._isDeleted).length === 0 && (
          <div className="p-4 text-center font-mono">
            <p className="text-syntax-comment text-sm">// No campuses found</p>
            <p className="text-syntax-comment text-xs mt-1">$ add --campus to get started</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Course Card Component (Editable)
// ============================================================================

interface EditableCourseCardProps {
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

function EditableCourseCard({
  course,
  campusId,
  facultyCode,
  facultyName,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: EditableCourseCardProps) {
  const [editName, setEditName] = useState(course.name)

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50 transition-all flex flex-col">
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
      </div>

      {/* Card Body */}
      <div className="p-4 font-mono text-sm space-y-1 flex-1">
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
            {/* Course name with proper indentation */}
            <div>
              <div>
                <span className="text-syntax-export">export</span>
                <span className="text-syntax-string ml-1">"</span>
                <span className="text-syntax-string">{course.name}</span>
                <span className="text-syntax-string">"</span>
              </div>
              <div className="ml-6">
                <span className="text-syntax-from">from</span>
                <span className="text-syntax-string ml-1">"{facultyName}"</span>
              </div>
            </div>
            {course.description && (
              <>
                <div className="text-syntax-comment">//</div>
                <div className="text-syntax-comment">// {course.description}</div>
              </>
            )}

            {/* Course details */}
            <div className="mt-2 space-y-1 text-xs font-mono">
              {course.requirements?.minimumAps && (
                <div>
                  <span className="text-syntax-key">'minimumAps'</span>
                  <span className="text-foreground">: {course.requirements.minimumAps}</span>
                </div>
              )}
              {course.requirements?.requiredSubjects && course.requirements.requiredSubjects.length > 0 && (
                <div className="flex flex-wrap gap-1 items-start">
                  <span className="text-syntax-key">'subjects'</span>
                  <span className="text-foreground">: </span>
                  {course.requirements.requiredSubjects.map((subj, i) => (
                    <span key={i} className="text-syntax-string">[{subj}]</span>
                  ))}
                </div>
              )}
              <div>
                <span className="text-syntax-key">'duration'</span>
                <span className="text-foreground">: {course.durationYears} years</span>
              </div>
              {course.deadline && (
                <div>
                  <span className="text-syntax-key">'deadline'</span>
                  <span className="text-foreground">: {course.deadline}</span>
                </div>
              )}
              <div>
                <span className="text-syntax-key">'status'</span>
                <span className="text-foreground">: </span>
                <span className={course.status === 'closed' ? 'text-red-500' : 'text-green-500'}>
                  {course.status || 'open'}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Card Footer - Action Buttons */}
      <div className="px-4 py-3 border-t border-border bg-muted/20">
        <div className="flex gap-1 justify-end">
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
    </div>
  )
}

// ============================================================================
// Detail Panel Component
// ============================================================================

interface DetailPanelProps {
  selectedCampus: EditableCampus | null
  selectedProgrammeType: string | null
  selectedFaculty: PreConfiguredFaculty | null
  editingItemId: string | null
  onSetEditingItem: (id: string | null) => void
  onUpdateCourse: (campusId: string, facultyCode: string, courseCode: string, updates: Partial<PreConfiguredCourse>) => void
  onDeleteCourse: (campusId: string, facultyCode: string, courseCode: string) => void
  onAddCourse: (campusId: string, facultyCode: string) => void
}

function DetailPanel({
  selectedCampus,
  selectedProgrammeType,
  selectedFaculty,
  editingItemId,
  onSetEditingItem,
  onUpdateCourse,
  onDeleteCourse,
  onAddCourse,
}: DetailPanelProps) {
  if (!selectedFaculty || !selectedCampus) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-card">
        <div className="text-center font-mono max-w-sm">
          <div className="mb-4">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50" aria-hidden="true" />
          </div>
          <p className="text-syntax-comment text-sm">// No faculty selected</p>
          <p className="text-syntax-comment text-xs mt-1">
            $ select a faculty from the tree to view and edit courses
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-card overflow-y-auto flex flex-col">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-border sticky top-0 z-10 bg-card">
        <div className="flex items-center justify-between">
          <TrafficLightsFilename
            status="active"
            filename={`${selectedFaculty.code.toLowerCase()}.courses`}
            badge={<ModuleBadge label="faculty" />}
            rightContent={
              <span className="text-xs font-mono text-syntax-number">
                {selectedFaculty.courses.length}
              </span>
            }
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddCourse(selectedCampus._id, selectedFaculty.code)}
            className="text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            <span>Add Course</span>
          </Button>
        </div>
      </div>

      {/* Courses List */}
      {selectedFaculty.courses.length > 0 ? (
        <div className="flex-1 p-4 grid grid-cols-2 gap-4">
          {selectedFaculty.courses.map((course, index) => (
            <EditableCourseCard
              key={`${selectedCampus._id}-${selectedFaculty.code}-${course.code}-${index}`}
              course={course}
              campusId={selectedCampus._id}
              facultyCode={selectedFaculty.code}
              facultyName={selectedFaculty.name}
              isEditing={
                editingItemId === `${selectedCampus._id}-${selectedFaculty.code}-${course.code}`
              }
              onEdit={() =>
                onSetEditingItem(`${selectedCampus._id}-${selectedFaculty.code}-${course.code}`)
              }
              onSave={(name) => {
                onUpdateCourse(selectedCampus._id, selectedFaculty.code, course.code, { name })
                onSetEditingItem(null)
              }}
              onCancel={() => onSetEditingItem(null)}
              onDelete={() =>
                onDeleteCourse(selectedCampus._id, selectedFaculty.code, course.code)
              }
            />
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="mb-4">
              <span className="text-4xl" role="img" aria-label="Empty folder">
                📁
              </span>
            </div>
            <div className="font-mono text-sm space-y-2 text-syntax-comment">
              <p>// No courses found in this faculty</p>
              <p className="text-foreground">const courses = [];</p>
              <p>// Add your first course to get started</p>
            </div>
            <div className="mt-6">
              <Button
                variant="default"
                size="sm"
                onClick={() => onAddCourse(selectedCampus._id, selectedFaculty.code)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Course
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function SetupEditorMasterDetail({ className }: SetupEditorMasterDetailProps) {
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
  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(null)
  const [selectedProgrammeType, setSelectedProgrammeType] = useState<string | null>(null)
  const [selectedFacultyCode, setSelectedFacultyCode] = useState<string | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    const firstCampus = editedCampuses.find((c) => !c._isDeleted)
    if (firstCampus) {
      initial.add(getCampusNodeId(firstCampus._id))
    }
    return initial
  })

  // Derived state
  const selectedCampus = useMemo(
    () => editedCampuses.find((c) => c._id === selectedCampusId) || null,
    [editedCampuses, selectedCampusId]
  )

  const selectedFaculty = useMemo(() => {
    if (!selectedCampus || !selectedProgrammeType || !selectedFacultyCode) return null
    const pt = selectedCampus.programmeTypes.find((p) => p.type === selectedProgrammeType)
    return pt?.faculties.find((f) => f.code === selectedFacultyCode) || null
  }, [selectedCampus, selectedProgrammeType, selectedFacultyCode])

  const institutionName = mode === 'manual' ? manualInstitutionName : institutionData?.name || 'Institution'

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  // Handlers
  const handleToggleNode = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }, [])

  const handleSelectFaculty = useCallback(
    (campus: EditableCampus, programmeType: string, faculty: PreConfiguredFaculty) => {
      setSelectedCampusId(campus._id)
      setSelectedProgrammeType(programmeType)
      setSelectedFacultyCode(faculty.code)

      // Ensure parent nodes are expanded
      setExpandedNodes((prev) => {
        const next = new Set(prev)
        next.add(getCampusNodeId(campus._id))
        next.add(getProgrammeTypeNodeId(campus._id, programmeType))
        return next
      })
    },
    []
  )

  const handleNavigateToRoot = useCallback(() => {
    setSelectedCampusId(null)
    setSelectedProgrammeType(null)
    setSelectedFacultyCode(null)
  }, [])

  const handleNavigateToCampus = useCallback(() => {
    setSelectedProgrammeType(null)
    setSelectedFacultyCode(null)
  }, [])

  const handleNavigateToProgrammeType = useCallback(() => {
    setSelectedFacultyCode(null)
  }, [])

  const handleAddCampus = useCallback(() => {
    addCampus({
      name: 'New Campus',
      code: `CAM${Date.now().toString().slice(-4)}`,
      location: 'Location TBD',
      programmeTypes: [],
    })
  }, [addCampus])

  const handleAddFaculty = useCallback(
    (campusId: string, programmeType: string) => {
      addFaculty(campusId, {
        name: 'New Faculty',
        code: `FAC${Date.now().toString().slice(-4)}`,
        courses: [],
      })
    },
    [addFaculty]
  )

  const handleAddCourse = useCallback(
    (campusId: string, facultyCode: string) => {
      addCourse(campusId, facultyCode, {
        name: 'New Course',
        code: `CRS${Date.now().toString().slice(-4)}`,
        level: 'undergraduate',
        durationYears: 3,
      })
    },
    [addCourse]
  )

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Terminal-style title bar */}
      <div className="px-4 py-2 border-b border-border bg-card flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-traffic-red" aria-hidden="true" />
            <span className="h-2.5 w-2.5 rounded-full bg-traffic-yellow" aria-hidden="true" />
            <span className="h-2.5 w-2.5 rounded-full bg-traffic-green" aria-hidden="true" />
          </div>
          <div className="flex items-center gap-2 ml-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="font-mono text-sm font-medium">{institutionName}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <Button variant="ghost" size="sm" onClick={toggleTheme} className="gap-2 text-xs">
            {theme === 'dark' ? (
              <>
                <Sun className="h-4 w-4" />
                <span className="font-mono">light</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4" />
                <span className="font-mono">dark</span>
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

      {/* Breadcrumb */}
      <Breadcrumb
        institutionName={institutionName}
        selectedCampus={selectedCampus}
        selectedProgrammeType={selectedProgrammeType}
        selectedFaculty={selectedFaculty}
        onNavigateToRoot={handleNavigateToRoot}
        onNavigateToCampus={handleNavigateToCampus}
        onNavigateToProgrammeType={handleNavigateToProgrammeType}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Tree (Left Panel) */}
        <div className="w-72 border-r border-border bg-muted/20 overflow-hidden flex flex-col">
          <NavigationTree
            campuses={editedCampuses}
            expandedNodes={expandedNodes}
            selectedCampusId={selectedCampusId}
            selectedProgrammeType={selectedProgrammeType}
            selectedFacultyCode={selectedFacultyCode}
            editingItemId={editingItemId}
            onToggleNode={handleToggleNode}
            onSelectFaculty={handleSelectFaculty}
            onAddCampus={handleAddCampus}
            onEditCampus={(id) => setEditingItem(id)}
            onDeleteCampus={deleteCampus}
            onRestoreCampus={restoreCampus}
            onAddFaculty={handleAddFaculty}
            onEditFaculty={(campusId, facultyCode) => setEditingItem(`${campusId}-${facultyCode}`)}
            onDeleteFaculty={deleteFaculty}
          />
        </div>

        {/* Detail Panel (Right Panel) */}
        <DetailPanel
          selectedCampus={selectedCampus}
          selectedProgrammeType={selectedProgrammeType}
          selectedFaculty={selectedFaculty}
          editingItemId={editingItemId}
          onSetEditingItem={setEditingItem}
          onUpdateCourse={updateCourse}
          onDeleteCourse={deleteCourse}
          onAddCourse={handleAddCourse}
        />
      </div>
    </div>
  )
}

export default SetupEditorMasterDetail
