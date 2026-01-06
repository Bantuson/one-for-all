'use client'

import { useState, useCallback, useMemo } from 'react'
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
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { useSetupStore } from '@/lib/stores/setupStore'
import { DottedModal, DottedModalContent } from '@/components/ui/DottedModal'
import { EditCourseModal } from '@/components/modals/EditCourseModal'
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

const PROGRAMME_TYPE_OPTIONS: { value: ProgrammeTypeCategory; label: string }[] = [
  { value: 'undergraduate', label: 'Undergraduate' },
  { value: 'honours', label: 'Honours' },
  { value: 'postgraduate', label: 'Postgraduate' },
  { value: 'masters', label: 'Masters' },
  { value: 'doctoral', label: 'Doctoral' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'online', label: 'Online' },
  { value: 'short-course', label: 'Short Course' },
]

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
  onAddCampus: () => void
  onAddCourse?: (campusId: string, facultyCode: string) => void
  selectedCampusId?: string
  selectedFacultyCode?: string
}

function Breadcrumb({
  institutionName: _institutionName,
  selectedCampus,
  selectedProgrammeType,
  selectedFaculty,
  onNavigateToRoot: _onNavigateToRoot,
  onNavigateToCampus,
  onNavigateToProgrammeType,
  onAddCampus,
  onAddCourse,
  selectedCampusId,
  selectedFacultyCode,
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
    <div className="sticky top-0 z-20 px-4 h-[77px] flex items-center justify-between">
      <div className="flex items-center gap-1 font-mono text-sm leading-none relative top-[1px]">
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

      {/* Action buttons on the right */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddCampus}
          className="font-mono text-xs gap-2 leading-none"
        >
          <Plus className="h-3 w-3" />
          <span className="relative top-[0.5px]">add campus</span>
        </Button>

        {onAddCourse && selectedCampusId && selectedFacultyCode && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddCourse(selectedCampusId, selectedFacultyCode)}
            className="font-mono text-xs gap-2 leading-none"
          >
            <Plus className="h-3 w-3" />
            <span className="relative top-[0.5px]">Add Course</span>
          </Button>
        )}
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
  nodeId: _nodeId,
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
        isSelected && 'bg-primary/10',
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
  onSelectCampus: (campus: EditableCampus) => void
  onSelectFaculty: (campus: EditableCampus, programmeType: string, faculty: PreConfiguredFaculty) => void
  onAddCampus: () => void
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
  editingItemId: _editingItemId,
  onToggleNode,
  onSelectCampus,
  onSelectFaculty,
  onAddCampus,
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
      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto pt-[12px] pl-2 pb-2 pr-[6px]" role="group">
        {campuses.map((campus) => {
          const campusNodeId = getCampusNodeId(campus._id)
          const isCampusExpanded = expandedNodes.has(campusNodeId)
          const hasProgrammeTypes = campus.programmeTypes.length > 0

          // Check if this campus is selected (for detail view)
          const isCampusSelected =
            selectedCampusId === campus._id && !selectedProgrammeType && !selectedFacultyCode

          return (
            <div key={campus._id} role="group" aria-label={campus.name}>
              <TreeNode
                label={`${campus.name}/`}
                nodeId={campusNodeId}
                icon={<Folder className={cn('h-3.5 w-3.5', campus._isDeleted ? 'text-destructive' : 'text-syntax-key')} />}
                isExpanded={isCampusExpanded}
                isSelected={isCampusSelected}
                hasChildren={hasProgrammeTypes && !campus._isDeleted}
                level={0}
                isDeleted={campus._isDeleted}
                isNew={campus._isNew}
                actions={
                  campus._isDeleted ? (
                    <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => onRestoreCampus(campus._id)}>
                      <Undo2 className="h-3 w-3" />
                    </Button>
                  ) : (
                    <>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => onDeleteCampus(campus._id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </>
                  )
                }
                onToggle={() => onToggleNode(campusNodeId)}
                onSelect={() => onSelectCampus(campus)}
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
                              label={`${faculty.name.toLowerCase().replace(/^faculty of\s+/i, '')}.`}
                              nodeId={facultyNodeId}
                              icon={<BookOpen className="h-3.5 w-3.5 text-syntax-string" />}
                              isExpanded={false}
                              isSelected={isSelected}
                              hasChildren={false}
                              level={2}
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
            <p className="text-sm">
              <span className="text-traffic-green">//</span>
              <span className="text-muted-foreground"> No campuses found</span>
            </p>
            <p className="text-xs mt-1 text-muted-foreground">$ add --campus to get started</p>
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
  onSave: (updates: Partial<PreConfiguredCourse>) => void
  onCancel: () => void
  onDelete: () => void
}

interface CourseEditState {
  name: string
  description: string
  level: CourseLevel
  durationYears: number
  minimumAps: number
  requiredSubjects: string
  status: 'open' | 'closed'
}

function EditableCourseCard({
  course,
  campusId: _campusId,
  facultyCode: _facultyCode,
  facultyName,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}: EditableCourseCardProps) {
  const [editState, setEditState] = useState<CourseEditState>({
    name: course.name,
    description: course.description || '',
    level: course.level,
    durationYears: course.durationYears || 3,
    minimumAps: course.requirements?.minimumAps || 0,
    requiredSubjects: course.requirements?.requiredSubjects?.join(', ') || '',
    status: (course.status as 'open' | 'closed') || 'open',
  })

  // Reset edit state when course changes or editing starts
  const resetEditState = useCallback(() => {
    setEditState({
      name: course.name,
      description: course.description || '',
      level: course.level,
      durationYears: course.durationYears || 3,
      minimumAps: course.requirements?.minimumAps || 0,
      requiredSubjects: course.requirements?.requiredSubjects?.join(', ') || '',
      status: (course.status as 'open' | 'closed') || 'open',
    })
  }, [course])

  const handleSave = useCallback(() => {
    const subjects = editState.requiredSubjects
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    onSave({
      name: editState.name,
      description: editState.description || undefined,
      level: editState.level,
      durationYears: editState.durationYears,
      requirements: {
        minimumAps: editState.minimumAps || undefined,
        requiredSubjects: subjects.length > 0 ? subjects : undefined,
      },
      status: editState.status,
    })
  }, [editState, onSave])

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50 transition-all flex flex-col h-[260px]">
      {/* Card Header */}
      <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 font-mono text-sm">
          <GraduationCap className="h-4 w-4 text-syntax-export" />
          <span className="text-foreground truncate text-xs">
            {course.code.toLowerCase()}.course
          </span>
        </div>
        <span
          className={cn(
            'text-[10px] px-1.5 py-0.5 rounded font-medium',
            LEVEL_COLORS[course.level]
          )}
        >
          {course.level}
        </span>
      </div>

      {/* Card Body */}
      <div className="p-4 font-mono text-sm space-y-1 flex-1 overflow-y-auto">
        {isEditing ? (
          <div className="space-y-3">
            {/* Name */}
            <div>
              <label className="text-xs text-syntax-key block mb-1">'name':</label>
              <input
                type="text"
                value={editState.name}
                onChange={(e) => setEditState(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-2 py-1 border rounded bg-background text-sm font-mono"
                autoFocus
              />
            </div>
            {/* Level */}
            <div>
              <label className="text-xs text-syntax-key block mb-1">'level':</label>
              <select
                value={editState.level}
                onChange={(e) => setEditState(prev => ({ ...prev, level: e.target.value as CourseLevel }))}
                className="w-full px-2 py-1 border rounded bg-background text-sm font-mono"
              >
                {Object.keys(LEVEL_COLORS).map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
            {/* Duration */}
            <div>
              <label className="text-xs text-syntax-key block mb-1">'duration':</label>
              <input
                type="number"
                min="1"
                max="8"
                value={editState.durationYears}
                onChange={(e) => setEditState(prev => ({ ...prev, durationYears: parseInt(e.target.value) || 3 }))}
                className="w-full px-2 py-1 border rounded bg-background text-sm font-mono"
              />
            </div>
            {/* Minimum APS */}
            <div>
              <label className="text-xs text-syntax-key block mb-1">'minimumAps':</label>
              <input
                type="number"
                min="0"
                max="60"
                value={editState.minimumAps}
                onChange={(e) => setEditState(prev => ({ ...prev, minimumAps: parseInt(e.target.value) || 0 }))}
                className="w-full px-2 py-1 border rounded bg-background text-sm font-mono"
              />
            </div>
            {/* Required Subjects */}
            <div>
              <label className="text-xs text-syntax-key block mb-1">'subjects':</label>
              <input
                type="text"
                value={editState.requiredSubjects}
                onChange={(e) => setEditState(prev => ({ ...prev, requiredSubjects: e.target.value }))}
                placeholder="Math, English, Physics"
                className="w-full px-2 py-1 border rounded bg-background text-sm font-mono"
              />
            </div>
            {/* Status */}
            <div>
              <label className="text-xs text-syntax-key block mb-1">'status':</label>
              <select
                value={editState.status}
                onChange={(e) => setEditState(prev => ({ ...prev, status: e.target.value as 'open' | 'closed' }))}
                className="w-full px-2 py-1 border rounded bg-background text-sm font-mono"
              >
                <option value="open">open</option>
                <option value="closed">closed</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Course name - truncated */}
            <div className="mb-2">
              <span className="text-syntax-string line-clamp-2 text-xs">{course.name}</span>
            </div>

            {/* Key metrics row with badges */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {course.requirements?.minimumAps && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  APS: {course.requirements.minimumAps}
                </span>
              )}
              {course.durationYears && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  {course.durationYears}yr
                </span>
              )}
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded',
                course.status === 'closed'
                  ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                  : 'bg-green-500/10 text-green-600 dark:text-green-400'
              )}>
                {course.status || 'open'}
              </span>
            </div>

            {/* Required subjects - compact, max 3 */}
            {course.requirements?.requiredSubjects && course.requirements.requiredSubjects.length > 0 && (
              <div className="mb-2">
                <span className="text-[10px] text-muted-foreground">Subjects: </span>
                <span className="text-[10px] text-amber-500">
                  {course.requirements.requiredSubjects.slice(0, 3).join(', ')}
                  {course.requirements.requiredSubjects.length > 3 && ` +${course.requirements.requiredSubjects.length - 3}`}
                </span>
              </div>
            )}

            {/* Faculty name at bottom - subtle */}
            <div className="mt-auto pt-1 border-t border-border/50">
              <span className="text-[10px] text-muted-foreground truncate block">{facultyName}</span>
            </div>
          </div>
        )}
      </div>

      {/* Card Footer - Action Buttons */}
      <div className="px-3 py-1.5 border-t border-border bg-muted/30 flex-shrink-0">
        <div className="flex gap-1 justify-end">
          {isEditing ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleSave}>
                <Check className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { resetEditState(); onCancel(); }}>
                <X className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  resetEditState()
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
// View-Only Course Card Component (for modal-based editing)
// ============================================================================

interface ViewOnlyCourseCardProps {
  course: PreConfiguredCourse
  facultyName: string
  onEdit: () => void
  onDelete: () => void
}

function ViewOnlyCourseCard({
  course,
  facultyName,
  onEdit,
  onDelete,
}: ViewOnlyCourseCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50 transition-all flex flex-col h-[260px]">
      {/* Card Header */}
      <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 font-mono text-sm">
          <GraduationCap className="h-4 w-4 text-syntax-export" />
          <span className="text-foreground truncate text-xs">
            {course.code.toLowerCase()}.course
          </span>
        </div>
        <span
          className={cn(
            'text-[10px] px-1.5 py-0.5 rounded font-medium',
            LEVEL_COLORS[course.level]
          )}
        >
          {course.level}
        </span>
      </div>

      {/* Card Body */}
      <div className="p-4 font-mono text-sm space-y-1 flex-1 overflow-y-auto">
        <div className="flex flex-col h-full">
          {/* Course name - truncated */}
          <div className="mb-2">
            <span className="text-syntax-string line-clamp-2 text-xs">{course.name}</span>
          </div>

          {/* Key metrics row with badges */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {course.requirements?.minimumAps && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                APS: {course.requirements.minimumAps}
              </span>
            )}
            {course.durationYears && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
                {course.durationYears}yr
              </span>
            )}
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded',
              course.status === 'closed'
                ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                : 'bg-green-500/10 text-green-600 dark:text-green-400'
            )}>
              {course.status || 'open'}
            </span>
          </div>

          {/* Required subjects - compact, max 3 */}
          {course.requirements?.requiredSubjects && course.requirements.requiredSubjects.length > 0 && (
            <div className="mb-2">
              <span className="text-[10px] text-muted-foreground">Subjects: </span>
              <span className="text-[10px] text-amber-500">
                {course.requirements.requiredSubjects.slice(0, 3).join(', ')}
                {course.requirements.requiredSubjects.length > 3 && ` +${course.requirements.requiredSubjects.length - 3}`}
              </span>
            </div>
          )}

          {/* Faculty name at bottom - subtle */}
          <div className="mt-auto pt-1 border-t border-border/50">
            <span className="text-[10px] text-muted-foreground truncate block">{facultyName}</span>
          </div>
        </div>
      </div>

      {/* Card Footer - Action Buttons */}
      <div className="px-3 py-1.5 border-t border-border bg-muted/30 flex-shrink-0">
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
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
  onUpdateCourse: (campusId: string, facultyCode: string, courseCode: string, updates: Partial<PreConfiguredCourse>) => void
  onDeleteCourse: (campusId: string, facultyCode: string, courseCode: string) => void
  onAddCourse: (campusId: string, facultyCode: string) => void
  onOpenEditCourseModal: (campusId: string, facultyCode: string, course: PreConfiguredCourse) => void
}

function DetailPanel({
  selectedCampus,
  selectedProgrammeType: _selectedProgrammeType,
  selectedFaculty,
  onUpdateCourse: _onUpdateCourse,
  onDeleteCourse,
  onAddCourse,
  onOpenEditCourseModal,
}: DetailPanelProps) {
  if (!selectedFaculty || !selectedCampus) {
    return (
      <div className="h-full flex items-center justify-center p-8 -translate-x-8">
        <div className="text-center font-mono max-w-sm">
          <div className="mb-4">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50" aria-hidden="true" />
          </div>
          <p className="text-sm">
            <span className="text-traffic-green">//</span>
            <span className="text-muted-foreground"> No faculty selected</span>
          </p>
          <p className="text-xs mt-1 text-muted-foreground">
            $ select a faculty from the tree to view and edit courses
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto flex flex-col">
      {/* Courses List */}
      {selectedFaculty.courses.length > 0 ? (
        <div className="flex-1 p-4 grid grid-cols-3 gap-4">
          {selectedFaculty.courses.map((course, index) => (
            <ViewOnlyCourseCard
              key={`${selectedCampus._id}-${selectedFaculty.code}-${course.code}-${index}`}
              course={course}
              facultyName={selectedFaculty.name}
              onEdit={() =>
                onOpenEditCourseModal(selectedCampus._id, selectedFaculty.code, course)
              }
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
            <div className="font-mono text-sm space-y-2">
              <p>
                <span className="text-traffic-green">//</span>
                <span className="text-muted-foreground"> No courses found in this faculty</span>
              </p>
              <p className="text-foreground">const courses = [];</p>
              <p>
                <span className="text-traffic-green">//</span>
                <span className="text-muted-foreground"> Add your first course to get started</span>
              </p>
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
// Add Course Form Component
// ============================================================================

interface AddCourseFormProps {
  onSubmit: (courseData: Omit<PreConfiguredCourse, 'code'>) => void
  onCancel: () => void
}

function AddCourseForm({ onSubmit, onCancel }: AddCourseFormProps) {
  const [formState, setFormState] = useState({
    name: '',
    description: '',
    level: 'undergraduate' as CourseLevel,
    durationYears: 3,
    minimumAps: 0,
    requiredSubjects: '',
    status: 'open' as 'open' | 'closed',
  })

  const handleSubmit = useCallback(() => {
    if (!formState.name.trim()) return

    const subjects = formState.requiredSubjects
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    onSubmit({
      name: formState.name.trim(),
      description: formState.description.trim() || undefined,
      level: formState.level,
      durationYears: formState.durationYears,
      requirements: {
        minimumAps: formState.minimumAps || undefined,
        requiredSubjects: subjects.length > 0 ? subjects : undefined,
      },
      status: formState.status,
    })
  }, [formState, onSubmit])

  return (
    <div className="p-4 space-y-4 font-mono text-sm">
      {/* Name (required) */}
      <div>
        <label className="text-xs text-syntax-key block mb-1">'name'<span className="text-destructive">*</span>:</label>
        <input
          type="text"
          value={formState.name}
          onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Bachelor of Science in Computer Science"
          className="w-full px-2 py-1.5 border rounded bg-background text-sm font-mono"
          autoFocus
        />
      </div>

      {/* Level */}
      <div>
        <label className="text-xs text-syntax-key block mb-1">'level':</label>
        <select
          value={formState.level}
          onChange={(e) => setFormState(prev => ({ ...prev, level: e.target.value as CourseLevel }))}
          className="w-full px-2 py-1.5 border rounded bg-background text-sm font-mono"
        >
          {Object.keys(LEVEL_COLORS).map(level => (
            <option key={level} value={level}>{level}</option>
          ))}
        </select>
      </div>

      {/* Duration */}
      <div>
        <label className="text-xs text-syntax-key block mb-1">'duration' (years):</label>
        <input
          type="number"
          min="1"
          max="8"
          value={formState.durationYears}
          onChange={(e) => setFormState(prev => ({ ...prev, durationYears: parseInt(e.target.value) || 3 }))}
          className="w-full px-2 py-1.5 border rounded bg-background text-sm font-mono"
        />
      </div>

      {/* Minimum APS */}
      <div>
        <label className="text-xs text-syntax-key block mb-1">'minimumAps':</label>
        <input
          type="number"
          min="0"
          max="60"
          value={formState.minimumAps}
          onChange={(e) => setFormState(prev => ({ ...prev, minimumAps: parseInt(e.target.value) || 0 }))}
          className="w-full px-2 py-1.5 border rounded bg-background text-sm font-mono"
        />
      </div>

      {/* Required Subjects */}
      <div>
        <label className="text-xs text-syntax-key block mb-1">'subjects' (comma-separated):</label>
        <input
          type="text"
          value={formState.requiredSubjects}
          onChange={(e) => setFormState(prev => ({ ...prev, requiredSubjects: e.target.value }))}
          placeholder="Mathematics, Physical Sciences"
          className="w-full px-2 py-1.5 border rounded bg-background text-sm font-mono"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-xs text-syntax-key block mb-1">'description':</label>
        <textarea
          value={formState.description}
          onChange={(e) => setFormState(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Optional course description..."
          rows={2}
          className="w-full px-2 py-1.5 border rounded bg-background text-sm font-mono resize-none"
        />
      </div>

      {/* Status */}
      <div>
        <label className="text-xs text-syntax-key block mb-1">'status':</label>
        <select
          value={formState.status}
          onChange={(e) => setFormState(prev => ({ ...prev, status: e.target.value as 'open' | 'closed' }))}
          className="w-full px-2 py-1.5 border rounded bg-background text-sm font-mono"
        >
          <option value="open">open</option>
          <option value="closed">closed</option>
        </select>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-border bg-muted/50 -mx-6 px-6 py-4">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="success"
          size="sm"
          onClick={handleSubmit}
          disabled={!formState.name.trim()}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Course
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Add Campus Form Component
// ============================================================================

interface AddCampusFormProps {
  onSubmit: (campusData: { name: string; code: string; location: string; isMain: boolean }) => void
  onCancel: () => void
}

function AddCampusForm({ onSubmit, onCancel }: AddCampusFormProps) {
  const [formState, setFormState] = useState({
    name: '',
    code: '',
    location: '',
    isMain: false,
  })

  const handleSubmit = useCallback(() => {
    if (!formState.name.trim() || !formState.location.trim()) return

    const code = formState.code.trim() || `CAM${Date.now().toString().slice(-4)}`

    onSubmit({
      name: formState.name.trim(),
      code: code.toUpperCase(),
      location: formState.location.trim(),
      isMain: formState.isMain,
    })
  }, [formState, onSubmit])

  return (
    <div className="p-4 space-y-4 font-mono text-sm">
      {/* Campus Name (required) */}
      <div>
        <label htmlFor="campus-name-new" className="text-xs text-syntax-key block mb-1">
          'name'<span className="text-destructive">*</span>:
        </label>
        <input
          id="campus-name-new"
          type="text"
          value={formState.name}
          onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Main Campus"
          className="w-full px-2 py-1.5 border rounded bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          autoFocus
        />
      </div>

      {/* Campus Code */}
      <div>
        <label htmlFor="campus-code-new" className="text-xs text-syntax-key block mb-1">
          'code' (optional):
        </label>
        <input
          id="campus-code-new"
          type="text"
          value={formState.code}
          onChange={(e) => setFormState((prev) => ({ ...prev, code: e.target.value }))}
          placeholder="Auto-generated if empty"
          className="w-full px-2 py-1.5 border rounded bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="text-xs text-muted-foreground mt-1">Leave empty to auto-generate</p>
      </div>

      {/* Location (required) */}
      <div>
        <label htmlFor="campus-location-new" className="text-xs text-syntax-key block mb-1">
          'location'<span className="text-destructive">*</span>:
        </label>
        <input
          id="campus-location-new"
          type="text"
          value={formState.location}
          onChange={(e) => setFormState((prev) => ({ ...prev, location: e.target.value }))}
          placeholder="e.g., Pretoria, Gauteng"
          className="w-full px-2 py-1.5 border rounded bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Is Main Campus */}
      <div className="flex items-center gap-2">
        <input
          id="campus-is-main"
          type="checkbox"
          checked={formState.isMain}
          onChange={(e) => setFormState((prev) => ({ ...prev, isMain: e.target.checked }))}
          className="h-4 w-4 rounded border-gray-300 focus:ring-2 focus:ring-ring"
        />
        <label htmlFor="campus-is-main" className="text-xs text-syntax-key">
          'isMain': <span className="text-syntax-number">{formState.isMain ? 'true' : 'false'}</span>
        </label>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-border bg-muted/50 -mx-6 px-6 py-4">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="success"
          size="sm"
          onClick={handleSubmit}
          disabled={!formState.name.trim() || !formState.location.trim()}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Campus
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Add Faculty Form Component
// ============================================================================

interface AddFacultyFormProps {
  onSubmit: (facultyData: { name: string; code: string; programmeType: ProgrammeTypeCategory }) => void
  onCancel: () => void
}

function AddFacultyForm({ onSubmit, onCancel }: AddFacultyFormProps) {
  const [formState, setFormState] = useState({
    name: '',
    code: '',
    programmeType: 'undergraduate' as ProgrammeTypeCategory,
  })

  const handleSubmit = useCallback(() => {
    if (!formState.name.trim()) return

    const code = formState.code.trim() || `FAC${Date.now().toString().slice(-4)}`

    onSubmit({
      name: formState.name.trim(),
      code: code.toUpperCase(),
      programmeType: formState.programmeType,
    })
  }, [formState, onSubmit])

  return (
    <div className="p-4 space-y-4 font-mono text-sm">
      {/* Faculty Name (required) */}
      <div>
        <label htmlFor="faculty-name" className="text-xs text-syntax-key block mb-1">
          'name'<span className="text-destructive">*</span>:
        </label>
        <input
          id="faculty-name"
          type="text"
          value={formState.name}
          onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Faculty of Engineering"
          className="w-full px-2 py-1.5 border rounded bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          autoFocus
        />
      </div>

      {/* Faculty Code */}
      <div>
        <label htmlFor="faculty-code" className="text-xs text-syntax-key block mb-1">
          'code' (optional):
        </label>
        <input
          id="faculty-code"
          type="text"
          value={formState.code}
          onChange={(e) => setFormState((prev) => ({ ...prev, code: e.target.value }))}
          placeholder="Auto-generated if empty"
          className="w-full px-2 py-1.5 border rounded bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="text-xs text-muted-foreground mt-1">Leave empty to auto-generate</p>
      </div>

      {/* Programme Type (required) */}
      <div>
        <label htmlFor="programme-type" className="text-xs text-syntax-key block mb-1">
          'programmeType'<span className="text-destructive">*</span>:
        </label>
        <select
          id="programme-type"
          value={formState.programmeType}
          onChange={(e) =>
            setFormState((prev) => ({ ...prev, programmeType: e.target.value as ProgrammeTypeCategory }))
          }
          className="w-full px-2 py-1.5 border rounded bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {PROGRAMME_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground mt-1">
          This determines which programme category the faculty belongs to
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-border bg-muted/50 -mx-6 px-6 py-4">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="success" size="sm" onClick={handleSubmit} disabled={!formState.name.trim()}>
          <Plus className="h-3 w-3 mr-1" />
          Add Faculty
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Campus Detail Panel Component
// ============================================================================

interface CampusDetailPanelProps {
  campus: EditableCampus
  onUpdateCampus: (campusId: string, updates: Partial<PreConfiguredCampus>) => void
  onAddFaculty: (campusId: string) => void
}

function CampusDetailPanel({ campus, onUpdateCampus, onAddFaculty }: CampusDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editState, setEditState] = useState({
    name: campus.name,
    code: campus.code,
    location: campus.location,
  })

  // Reset edit state when campus changes
  const resetEditState = useCallback(() => {
    setEditState({
      name: campus.name,
      code: campus.code,
      location: campus.location,
    })
  }, [campus])

  const handleSave = useCallback(() => {
    onUpdateCampus(campus._id, {
      name: editState.name.trim() || campus.name,
      code: editState.code.trim() || campus.code,
      location: editState.location.trim() || campus.location,
    })
    setIsEditing(false)
  }, [campus, editState, onUpdateCampus])

  const handleCancel = useCallback(() => {
    resetEditState()
    setIsEditing(false)
  }, [resetEditState])

  // Count faculties across all programme types
  const facultyCount = useMemo(
    () => campus.programmeTypes.reduce((sum, pt) => sum + pt.faculties.length, 0),
    [campus.programmeTypes]
  )

  // Count courses across all faculties
  const courseCount = useMemo(
    () =>
      campus.programmeTypes.reduce(
        (sum, pt) => sum + pt.faculties.reduce((fSum, f) => fSum + f.courses.length, 0),
        0
      ),
    [campus.programmeTypes]
  )

  return (
    <div className="h-full overflow-y-auto flex flex-col">
      {/* Panel Header */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between -mt-1">
          <div className="flex items-center gap-2 font-mono text-sm">
            <Building2 className="h-4 w-4 text-syntax-key" />
            <span className="text-foreground">{campus.code.toLowerCase()}.campus</span>
            {campus._isNew && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-600">new</span>
            )}
          </div>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                resetEditState()
                setIsEditing(true)
              }}
              className="text-xs"
            >
              <Pencil className="h-3 w-3 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Campus Details */}
      <div className="p-4 space-y-6 mt-[6px]">
        {isEditing ? (
          <div className="space-y-4 font-mono text-sm">
            {/* Name */}
            <div>
              <label htmlFor="campus-name" className="text-xs text-syntax-key block mb-1">
                'name'<span className="text-destructive">*</span>:
              </label>
              <input
                id="campus-name"
                type="text"
                value={editState.name}
                onChange={(e) => setEditState((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-2 py-1.5 border rounded bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
            </div>

            {/* Code */}
            <div>
              <label htmlFor="campus-code" className="text-xs text-syntax-key block mb-1">
                'code':
              </label>
              <input
                id="campus-code"
                type="text"
                value={editState.code}
                onChange={(e) => setEditState((prev) => ({ ...prev, code: e.target.value }))}
                className="w-full px-2 py-1.5 border rounded bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Location */}
            <div>
              <label htmlFor="campus-location" className="text-xs text-syntax-key block mb-1">
                'location':
              </label>
              <input
                id="campus-location"
                type="text"
                value={editState.location}
                onChange={(e) => setEditState((prev) => ({ ...prev, location: e.target.value }))}
                className="w-full px-2 py-1.5 border rounded bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-border bg-muted/50 -mx-4 px-4 py-4">
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
              <Button variant="success" size="sm" onClick={handleSave}>
                <Check className="h-3 w-3 mr-1" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div className="font-mono text-sm space-y-3">
            <div>
              <span className="text-syntax-key">'name'</span>
              <span className="text-foreground">: </span>
              <span className="text-syntax-string">"{campus.name}"</span>
            </div>
            <div>
              <span className="text-syntax-key">'code'</span>
              <span className="text-foreground">: </span>
              <span className="text-syntax-string">"{campus.code}"</span>
            </div>
            <div>
              <span className="text-syntax-key">'location'</span>
              <span className="text-foreground">: </span>
              <span className="text-syntax-string">"{campus.location}"</span>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="pt-4 mt-[18px]">
          <h4 className="font-mono text-xs mb-3"><span className="text-traffic-green">//</span><span className="text-muted-foreground"> Statistics</span></h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-syntax-string" />
                <span className="font-mono text-sm text-muted-foreground">Faculties</span>
              </div>
              <p className="font-mono text-2xl text-foreground mt-1">{facultyCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-syntax-export" />
                <span className="font-mono text-sm text-muted-foreground">Courses</span>
              </div>
              <p className="font-mono text-2xl text-foreground mt-1">{courseCount}</p>
            </div>
          </div>
        </div>

        {/* Programme Types Overview */}
        {campus.programmeTypes.length > 0 && (
          <div className="pt-4">
            <h4 className="font-mono text-xs mb-3"><span className="text-traffic-green">//</span><span className="text-muted-foreground"> Programme Types</span></h4>
            <div className="space-y-2">
              {campus.programmeTypes.map((pt) => (
                <div
                  key={pt.type}
                  className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border"
                >
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-3.5 w-3.5 text-syntax-export" />
                    <span className="font-mono text-sm">{pt.displayName}</span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {pt.faculties.length} {pt.faculties.length === 1 ? 'faculty' : 'faculties'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Faculty Action */}
        <div className="pt-4 flex flex-col items-center">
          <h4 className="font-mono text-xs mb-3 self-start"><span className="text-traffic-green">//</span><span className="text-muted-foreground"> Actions</span></h4>
          <Button variant="default" size="sm" onClick={() => onAddFaculty(campus._id)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Faculty to This Campus
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            You will be prompted to select a programme type for the faculty
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function SetupEditorMasterDetail({ className }: SetupEditorMasterDetailProps) {
  const {
    institutionData,
    editedCampuses,
    editingItemId,
    setEditingItem,
    updateCampus,
    deleteCampus,
    restoreCampus,
    addCampus,
    updateFaculty: _updateFaculty,
    deleteFaculty,
    addFaculty,
    updateCourse,
    deleteCourse,
    addCourse,
    mode,
    manualInstitutionName,
  } = useSetupStore()

  // Selection state
  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(null)
  const [selectedProgrammeType, setSelectedProgrammeType] = useState<string | null>(null)
  const [selectedFacultyCode, setSelectedFacultyCode] = useState<string | null>(null)

  // Add course dialog state
  const [isAddCourseDialogOpen, setIsAddCourseDialogOpen] = useState(false)
  const [addCourseTarget, setAddCourseTarget] = useState<{ campusId: string; facultyCode: string } | null>(null)

  // Add faculty dialog state
  const [isAddFacultyDialogOpen, setIsAddFacultyDialogOpen] = useState(false)
  const [addFacultyTargetCampusId, setAddFacultyTargetCampusId] = useState<string | null>(null)

  // Add campus dialog state
  const [isAddCampusDialogOpen, setIsAddCampusDialogOpen] = useState(false)

  // Edit course modal state
  const [isEditCourseModalOpen, setIsEditCourseModalOpen] = useState(false)
  const [editCourseTarget, setEditCourseTarget] = useState<{
    campusId: string
    facultyCode: string
    course: PreConfiguredCourse
  } | null>(null)

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    editedCampuses.filter((c) => !c._isDeleted).forEach((campus) => {
      initial.add(getCampusNodeId(campus._id))
    })
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
    setIsAddCampusDialogOpen(true)
  }, [])

  // Submit new campus from modal
  const handleSubmitNewCampus = useCallback(
    (campusData: { name: string; code: string; location: string; isMain: boolean }) => {
      addCampus({
        name: campusData.name,
        code: campusData.code,
        location: campusData.location,
        isMain: campusData.isMain,
        programmeTypes: [],
      })
      setIsAddCampusDialogOpen(false)

      // Find the newly added campus and select it
      setTimeout(() => {
        const newCampus = useSetupStore.getState().editedCampuses.find(
          (c) => c.code === campusData.code && c._isNew
        )
        if (newCampus) {
          setSelectedCampusId(newCampus._id)
          setSelectedProgrammeType(null)
          setSelectedFacultyCode(null)
          setExpandedNodes((prev) => {
            const next = new Set(prev)
            next.add(getCampusNodeId(newCampus._id))
            return next
          })
        }
      }, 0)
    },
    [addCampus]
  )

  // Open faculty dialog for a specific campus
  const handleOpenAddFacultyDialog = useCallback((campusId: string) => {
    setAddFacultyTargetCampusId(campusId)
    setIsAddFacultyDialogOpen(true)
  }, [])

  // Submit new faculty with programme type
  const handleSubmitNewFaculty = useCallback(
    (facultyData: { name: string; code: string; programmeType: ProgrammeTypeCategory }) => {
      if (!addFacultyTargetCampusId) return
      addFaculty(
        addFacultyTargetCampusId,
        {
          name: facultyData.name,
          code: facultyData.code,
          courses: [],
        },
        facultyData.programmeType
      )
      setIsAddFacultyDialogOpen(false)
      setAddFacultyTargetCampusId(null)

      // Expand the campus node to show the new faculty
      setExpandedNodes((prev) => {
        const next = new Set(prev)
        next.add(getCampusNodeId(addFacultyTargetCampusId))
        next.add(getProgrammeTypeNodeId(addFacultyTargetCampusId, facultyData.programmeType))
        return next
      })
    },
    [addFaculty, addFacultyTargetCampusId]
  )

  const handleCancelAddFaculty = useCallback(() => {
    setIsAddFacultyDialogOpen(false)
    setAddFacultyTargetCampusId(null)
  }, [])

  // Legacy handler for tree view (opens dialog)
  const handleAddFaculty = useCallback(
    (campusId: string, _programmeType: string) => {
      handleOpenAddFacultyDialog(campusId)
    },
    [handleOpenAddFacultyDialog]
  )

  // Handler for selecting a campus (for detail view)
  const handleSelectCampus = useCallback((campus: EditableCampus) => {
    setSelectedCampusId(campus._id)
    setSelectedProgrammeType(null)
    setSelectedFacultyCode(null)
  }, [])

  const handleAddCourse = useCallback(
    (campusId: string, facultyCode: string) => {
      setAddCourseTarget({ campusId, facultyCode })
      setIsAddCourseDialogOpen(true)
    },
    []
  )

  const handleSubmitNewCourse = useCallback(
    (courseData: Omit<PreConfiguredCourse, 'code'>) => {
      if (!addCourseTarget) return
      addCourse(addCourseTarget.campusId, addCourseTarget.facultyCode, {
        ...courseData,
        code: `CRS${Date.now().toString().slice(-4)}`,
      })
      setIsAddCourseDialogOpen(false)
      setAddCourseTarget(null)
    },
    [addCourse, addCourseTarget]
  )

  const handleCancelAddCourse = useCallback(() => {
    setIsAddCourseDialogOpen(false)
    setAddCourseTarget(null)
  }, [])

  // Edit course modal handlers
  const handleOpenEditCourseModal = useCallback(
    (campusId: string, facultyCode: string, course: PreConfiguredCourse) => {
      setEditCourseTarget({ campusId, facultyCode, course })
      setIsEditCourseModalOpen(true)
    },
    []
  )

  const handleCloseEditCourseModal = useCallback(() => {
    setIsEditCourseModalOpen(false)
    setEditCourseTarget(null)
  }, [])

  const handleSaveEditedCourse = useCallback(
    (updatedCourse: { name: string; level: CourseLevel; durationYears?: number; requirements?: { minimumAps?: number; requiredSubjects?: string[] }; status?: 'open' | 'closed' }) => {
      if (!editCourseTarget) return
      updateCourse(editCourseTarget.campusId, editCourseTarget.facultyCode, editCourseTarget.course.code, {
        name: updatedCourse.name,
        level: updatedCourse.level,
        durationYears: updatedCourse.durationYears,
        requirements: updatedCourse.requirements,
        status: updatedCourse.status,
      })
      handleCloseEditCourseModal()
    },
    [editCourseTarget, updateCourse, handleCloseEditCourseModal]
  )

  return (
    <div className={cn('flex flex-col h-[calc(100vh-76px)] max-h-[calc(100vh-76px)]', className)}>
      {/* Breadcrumb */}
      <Breadcrumb
        institutionName={institutionName}
        selectedCampus={selectedCampus}
        selectedProgrammeType={selectedProgrammeType}
        selectedFaculty={selectedFaculty}
        onNavigateToRoot={handleNavigateToRoot}
        onNavigateToCampus={handleNavigateToCampus}
        onNavigateToProgrammeType={handleNavigateToProgrammeType}
        onAddCampus={handleAddCampus}
        onAddCourse={handleAddCourse}
        selectedCampusId={selectedCampus?._id}
        selectedFacultyCode={selectedFaculty?.code}
      />

      {/* Main content area */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Navigation Tree (Left Panel) */}
        <div className="w-72 h-full overflow-hidden flex flex-col">
          <NavigationTree
            campuses={editedCampuses}
            expandedNodes={expandedNodes}
            selectedCampusId={selectedCampusId}
            selectedProgrammeType={selectedProgrammeType}
            selectedFacultyCode={selectedFacultyCode}
            editingItemId={editingItemId}
            onToggleNode={handleToggleNode}
            onSelectCampus={handleSelectCampus}
            onSelectFaculty={handleSelectFaculty}
            onAddCampus={handleAddCampus}
            onDeleteCampus={deleteCampus}
            onRestoreCampus={restoreCampus}
            onAddFaculty={handleAddFaculty}
            onEditFaculty={(campusId, facultyCode) => setEditingItem(`${campusId}-${facultyCode}`)}
            onDeleteFaculty={deleteFaculty}
          />
        </div>

        {/* Detail Panel (Right Panel) - shows campus or faculty details */}
        <div className="flex-1 overflow-hidden flex flex-col h-full">
          {selectedCampus && !selectedFaculty ? (
            <CampusDetailPanel
              campus={selectedCampus}
              onUpdateCampus={updateCampus}
              onAddFaculty={handleOpenAddFacultyDialog}
            />
          ) : (
            <DetailPanel
              selectedCampus={selectedCampus}
              selectedProgrammeType={selectedProgrammeType}
              selectedFaculty={selectedFaculty}
              onUpdateCourse={updateCourse}
              onDeleteCourse={deleteCourse}
              onAddCourse={handleAddCourse}
              onOpenEditCourseModal={handleOpenEditCourseModal}
            />
          )}
        </div>
      </div>

      {/* Add Campus Dialog */}
      <DottedModal
        isOpen={isAddCampusDialogOpen}
        onClose={() => setIsAddCampusDialogOpen(false)}
        title="new Campus"
      >
        <DottedModalContent>
          <AddCampusForm
            onSubmit={handleSubmitNewCampus}
            onCancel={() => setIsAddCampusDialogOpen(false)}
          />
        </DottedModalContent>
      </DottedModal>

      {/* Add Faculty Dialog */}
      {addFacultyTargetCampusId && (
        <DottedModal
          isOpen={isAddFacultyDialogOpen}
          onClose={handleCancelAddFaculty}
          title="new Faculty"
        >
          <DottedModalContent>
            <AddFacultyForm
              onSubmit={handleSubmitNewFaculty}
              onCancel={handleCancelAddFaculty}
            />
          </DottedModalContent>
        </DottedModal>
      )}

      {/* Add Course Dialog */}
      {addCourseTarget && (
        <DottedModal
          isOpen={isAddCourseDialogOpen}
          onClose={handleCancelAddCourse}
          title="new Course"
        >
          <DottedModalContent>
            <AddCourseForm
              onSubmit={handleSubmitNewCourse}
              onCancel={handleCancelAddCourse}
            />
          </DottedModalContent>
        </DottedModal>
      )}

      {/* Edit Course Modal */}
      <EditCourseModal
        isOpen={isEditCourseModalOpen}
        onClose={handleCloseEditCourseModal}
        course={editCourseTarget ? {
          id: `${editCourseTarget.campusId}-${editCourseTarget.facultyCode}-${editCourseTarget.course.code}`,
          name: editCourseTarget.course.name,
          code: editCourseTarget.course.code,
          level: editCourseTarget.course.level,
          description: editCourseTarget.course.description,
          durationYears: editCourseTarget.course.durationYears,
          requirements: editCourseTarget.course.requirements,
          status: editCourseTarget.course.status,
        } : null}
        onSave={handleSaveEditedCourse}
        useApi={false}
      />
    </div>
  )
}

export default SetupEditorMasterDetail
