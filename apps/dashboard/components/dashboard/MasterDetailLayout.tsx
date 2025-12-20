'use client'

import { useState, useCallback, useMemo } from 'react'
import { ChevronRight, ChevronDown, Folder, BookOpen, GraduationCap } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { CommandButton } from '@/components/ui/CommandButton'
import { TrafficLightsFilename, StatusBadge, ModuleBadge } from '@/components/ui/TrafficLights'

// ============================================================================
// Type Definitions
// ============================================================================

interface Course {
  id: string
  name: string
  code: string
  status: string
  applications?: number
  description?: string
}

interface FacultyWithCourses {
  id: string
  name: string
  code: string
  courses: Course[]
}

interface ProgrammeType {
  type: string
  displayName: string
  faculties: FacultyWithCourses[]
}

interface CampusWithHierarchy {
  id: string
  name: string
  code: string
  programmeTypes: ProgrammeType[]
}

interface MasterDetailLayoutProps {
  campuses: CampusWithHierarchy[]
  institutionSlug: string
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

function getFacultyNodeId(campusId: string, programmeType: string, facultyId: string): string {
  return `faculty:${campusId}:${programmeType}:${facultyId}`
}

// ============================================================================
// Breadcrumb Component
// ============================================================================

interface BreadcrumbProps {
  institutionSlug: string
  selectedCampus: CampusWithHierarchy | null
  selectedProgrammeType: string | null
  selectedFaculty: FacultyWithCourses | null
  onNavigateToCampus: () => void
  onNavigateToProgrammeType: () => void
  onNavigateToFaculty: () => void
}

function Breadcrumb({
  institutionSlug,
  selectedCampus,
  selectedProgrammeType,
  selectedFaculty,
  onNavigateToCampus,
  onNavigateToProgrammeType,
  onNavigateToFaculty,
}: BreadcrumbProps) {
  const segments: { label: string; onClick?: () => void; isActive: boolean }[] = []

  if (selectedCampus) {
    segments.push({
      label: selectedCampus.name,
      onClick: onNavigateToProgrammeType,
      isActive: !selectedProgrammeType,
    })
  }

  if (selectedProgrammeType) {
    segments.push({
      label: selectedProgrammeType.toLowerCase(),
      onClick: onNavigateToFaculty,
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
        'flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer',
        'font-mono text-sm transition-all',
        'hover:bg-muted/50',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isSelected && 'ring-2 ring-primary bg-primary/10'
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
      <span className={cn('truncate', isSelected ? 'text-foreground' : 'text-muted-foreground')}>
        {label}
      </span>
      {badge && <span className="ml-auto shrink-0">{badge}</span>}
    </div>
  )
}

// ============================================================================
// Navigation Tree Component
// ============================================================================

interface NavigationTreeProps {
  campuses: CampusWithHierarchy[]
  expandedNodes: Set<string>
  selectedCampusId: string | null
  selectedProgrammeType: string | null
  selectedFacultyId: string | null
  onToggleNode: (nodeId: string) => void
  onSelectFaculty: (
    campus: CampusWithHierarchy,
    programmeType: string,
    faculty: FacultyWithCourses
  ) => void
}

function NavigationTree({
  campuses,
  expandedNodes,
  selectedCampusId,
  selectedProgrammeType,
  selectedFacultyId,
  onToggleNode,
  onSelectFaculty,
}: NavigationTreeProps) {
  const totalFaculties = useMemo(() => {
    return campuses.reduce(
      (total, campus) =>
        total +
        campus.programmeTypes.reduce((ptTotal, pt) => ptTotal + pt.faculties.length, 0),
      0
    )
  }, [campuses])

  return (
    <div className="flex flex-col h-full" role="tree" aria-label="Institution hierarchy">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
        <TrafficLightsFilename
          status="active"
          filename="structure/"
          rightContent={
            <span className="text-xs font-mono text-syntax-number">{totalFaculties}</span>
          }
        />
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-2" role="group">
        {campuses.map((campus) => {
          const campusNodeId = getCampusNodeId(campus.id)
          const isCampusExpanded = expandedNodes.has(campusNodeId)
          const hasProgrammeTypes = campus.programmeTypes.length > 0

          return (
            <div key={campus.id} role="group" aria-label={campus.name}>
              <TreeNode
                label={`${campus.name}/`}
                nodeId={campusNodeId}
                icon={<Folder className="h-3.5 w-3.5 text-syntax-key" />}
                isExpanded={isCampusExpanded}
                isSelected={false}
                hasChildren={hasProgrammeTypes}
                level={0}
                onToggle={() => onToggleNode(campusNodeId)}
                onSelect={() => onToggleNode(campusNodeId)}
              />

              {isCampusExpanded &&
                campus.programmeTypes.map((pt) => {
                  const ptNodeId = getProgrammeTypeNodeId(campus.id, pt.type)
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
                        onToggle={() => onToggleNode(ptNodeId)}
                        onSelect={() => onToggleNode(ptNodeId)}
                      />

                      {isPtExpanded &&
                        pt.faculties.map((faculty) => {
                          const facultyNodeId = getFacultyNodeId(campus.id, pt.type, faculty.id)
                          const isSelected =
                            selectedCampusId === campus.id &&
                            selectedProgrammeType === pt.type &&
                            selectedFacultyId === faculty.id

                          return (
                            <TreeNode
                              key={faculty.id}
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

        {campuses.length === 0 && (
          <div className="p-4 text-center font-mono">
            <p className="text-syntax-comment text-sm">// No campuses found</p>
            <p className="text-syntax-comment text-xs mt-1">$ add --campus to get started</p>
          </div>
        )}
      </div>

      {/* Add Campus Button */}
      <div className="p-3 border-t border-border bg-card">
        <CommandButton
          command="add --campus"
          variant="ghost"
          size="sm"
          className="w-full justify-center"
        />
      </div>
    </div>
  )
}

// ============================================================================
// Course Card Component
// ============================================================================

interface CourseCardProps {
  course: Course
  faculty: FacultyWithCourses
  institutionSlug: string
}

function CourseCard({ course, faculty, institutionSlug }: CourseCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50 transition-all focus-within:ring-2 focus-within:ring-ring">
      {/* Card Header with Traffic Lights */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <TrafficLightsFilename
          status={
            course.status === 'active'
              ? 'active'
              : course.status === 'rejected'
                ? 'error'
                : 'neutral'
          }
          filename={`${course.code.toLowerCase()}.course`}
          rightContent={
            <span className="inline-flex items-center gap-1 text-sm font-mono">
              <span className="text-syntax-key" aria-hidden="true">
                *
              </span>
              <span className="text-syntax-number">{course.applications || 0}</span>
              <span className="sr-only">applications</span>
            </span>
          }
        />
      </div>

      {/* Card Body - Syntax Highlighted */}
      <div className="p-4 font-mono text-sm space-y-1">
        <div>
          <span className="text-syntax-export">export</span>
          <span className="text-syntax-string"> "{course.name}"</span>
        </div>
        <div className="flex items-center gap-1">
          <span aria-hidden="true">:</span>
          <span className="text-syntax-from">from</span>
          <span className="text-syntax-string">"{faculty.name}"</span>
        </div>
        {course.description && (
          <>
            <div className="text-syntax-comment" aria-hidden="true">
              //
            </div>
            <div className="text-syntax-comment">// {course.description}</div>
          </>
        )}
      </div>

      {/* Card Footer */}
      <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <StatusBadge
            status={course.status as 'active' | 'pending' | 'draft' | 'rejected'}
          />
          {(course.applications || 0) > 0 && (
            <span className="inline-flex items-center gap-1.5 text-sm">
              <span aria-hidden="true">:</span>
              <span className="text-muted-foreground">apps:</span>
              <span className="font-mono text-primary">{course.applications}</span>
            </span>
          )}
        </div>
        <Link
          href={`/dashboard/${institutionSlug}/courses/${course.id}/applications`}
          className="text-sm font-mono text-primary hover:underline inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded"
        >
          <span className="opacity-70" aria-hidden="true">
            $
          </span>{' '}
          view --applications &rarr;
        </Link>
      </div>
    </div>
  )
}

// ============================================================================
// Detail Panel Component
// ============================================================================

interface DetailPanelProps {
  selectedCampus: CampusWithHierarchy | null
  selectedProgrammeType: string | null
  selectedFaculty: FacultyWithCourses | null
  institutionSlug: string
}

function DetailPanel({
  selectedCampus,
  selectedProgrammeType,
  selectedFaculty,
  institutionSlug,
}: DetailPanelProps) {
  if (!selectedFaculty) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-card">
        <div className="text-center font-mono max-w-sm">
          <div className="mb-4">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50" aria-hidden="true" />
          </div>
          <p className="text-syntax-comment text-sm">// No faculty selected</p>
          <p className="text-syntax-comment text-xs mt-1">
            $ select a faculty from the tree to view courses
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-card overflow-y-auto flex flex-col">
      {/* Panel Header */}
      <div className="px-4 py-3 border-b border-border sticky top-0 z-10 bg-card">
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
      </div>

      {/* Courses List */}
      {selectedFaculty.courses.length > 0 ? (
        <>
          <div className="flex-1 p-4 space-y-4">
            {selectedFaculty.courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                faculty={selectedFaculty}
                institutionSlug={institutionSlug}
              />
            ))}
          </div>

          {/* Add Course Button */}
          <div className="p-4 border-t border-border">
            <CommandButton
              command="add --course"
              variant="primary"
              size="md"
              className="w-full justify-center"
            />
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="mb-4">
              <span className="text-4xl" role="img" aria-label="Empty folder">
                :
              </span>
            </div>
            <div className="font-mono text-sm space-y-2 text-syntax-comment">
              <p>// No courses found in this faculty</p>
              <p className="text-foreground">const courses = [];</p>
              <p>// Add your first course to get started</p>
            </div>
            <div className="mt-6">
              <CommandButton command="add --course --interactive" variant="primary" size="md" />
            </div>
            <p className="mt-4 font-mono text-xs text-syntax-comment">
              $ man add-course // View documentation
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main Layout Component
// ============================================================================

export function MasterDetailLayout({ campuses, institutionSlug }: MasterDetailLayoutProps) {
  // State management
  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(null)
  const [selectedProgrammeType, setSelectedProgrammeType] = useState<string | null>(null)
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(() => {
    // Auto-expand first campus if available
    const initial = new Set<string>()
    const firstCampus = campuses[0]
    if (firstCampus) {
      initial.add(getCampusNodeId(firstCampus.id))
    }
    return initial
  })

  // Derived state
  const selectedCampus = useMemo(
    () => campuses.find((c) => c.id === selectedCampusId) || null,
    [campuses, selectedCampusId]
  )

  const selectedFaculty = useMemo(() => {
    if (!selectedCampus || !selectedProgrammeType || !selectedFacultyId) return null
    const pt = selectedCampus.programmeTypes.find((p) => p.type === selectedProgrammeType)
    return pt?.faculties.find((f) => f.id === selectedFacultyId) || null
  }, [selectedCampus, selectedProgrammeType, selectedFacultyId])

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
    (campus: CampusWithHierarchy, programmeType: string, faculty: FacultyWithCourses) => {
      setSelectedCampusId(campus.id)
      setSelectedProgrammeType(programmeType)
      setSelectedFacultyId(faculty.id)

      // Ensure parent nodes are expanded
      setExpandedNodes((prev) => {
        const next = new Set(prev)
        next.add(getCampusNodeId(campus.id))
        next.add(getProgrammeTypeNodeId(campus.id, programmeType))
        return next
      })
    },
    []
  )

  const handleNavigateToCampus = useCallback(() => {
    setSelectedCampusId(null)
    setSelectedProgrammeType(null)
    setSelectedFacultyId(null)
  }, [])

  const handleNavigateToProgrammeType = useCallback(() => {
    setSelectedProgrammeType(null)
    setSelectedFacultyId(null)
  }, [])

  const handleNavigateToFaculty = useCallback(() => {
    setSelectedFacultyId(null)
  }, [])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Terminal-style title bar */}
      <div className="px-4 py-2 border-b border-border bg-card flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-traffic-red" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-traffic-yellow" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-traffic-green" aria-hidden="true" />
        </div>
        <span className="font-mono text-sm text-muted-foreground ml-2">
          /dashboard/{institutionSlug}
        </span>
      </div>

      {/* Breadcrumb */}
      <Breadcrumb
        institutionSlug={institutionSlug}
        selectedCampus={selectedCampus}
        selectedProgrammeType={selectedProgrammeType}
        selectedFaculty={selectedFaculty}
        onNavigateToCampus={handleNavigateToCampus}
        onNavigateToProgrammeType={handleNavigateToProgrammeType}
        onNavigateToFaculty={handleNavigateToFaculty}
      />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Tree (Left Panel) */}
        <div className="w-72 border-r border-border bg-muted/20 overflow-hidden flex flex-col">
          <NavigationTree
            campuses={campuses}
            expandedNodes={expandedNodes}
            selectedCampusId={selectedCampusId}
            selectedProgrammeType={selectedProgrammeType}
            selectedFacultyId={selectedFacultyId}
            onToggleNode={handleToggleNode}
            onSelectFaculty={handleSelectFaculty}
          />
        </div>

        {/* Detail Panel (Right Panel) */}
        <DetailPanel
          selectedCampus={selectedCampus}
          selectedProgrammeType={selectedProgrammeType}
          selectedFaculty={selectedFaculty}
          institutionSlug={institutionSlug}
        />
      </div>

      {/* Bottom action bar */}
      <div className="px-4 py-2 border-t border-border bg-card">
        <CommandButton
          command="add --course"
          variant="ghost"
          size="sm"
          className="w-full justify-center"
        />
      </div>
    </div>
  )
}
