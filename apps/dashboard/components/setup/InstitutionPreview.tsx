'use client'

import * as React from 'react'
import {
  Building2,
  GraduationCap,
  MapPin,
  Globe,
  Mail,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Users,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CodeCard, CodeCardHeader } from '@/components/ui/CodeCard'
import { useSetupStore, selectCampusCount, selectFacultyCount, selectCourseCount } from '@/lib/stores/setupStore'
import type {
  PreConfiguredCampus,
  PreConfiguredFaculty,
  PreConfiguredCourse,
  CourseLevel,
} from '@/lib/institutions/types'

// ============================================================================
// Types
// ============================================================================

interface InstitutionPreviewProps {
  className?: string
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

const LEVEL_LABELS: Record<CourseLevel, string> = {
  undergraduate: 'Undergraduate',
  honours: 'Honours',
  postgraduate: 'Postgraduate',
  masters: 'Masters',
  doctoral: 'Doctoral',
  diploma: 'Diploma',
  'advanced-diploma': 'Advanced Diploma',
  btech: 'BTech',
  mtech: 'MTech',
  dtech: 'DTech',
  certificate: 'Certificate',
  'short-course': 'Short Course',
}

// ============================================================================
// Component
// ============================================================================

export function InstitutionPreview({ className }: InstitutionPreviewProps) {
  const {
    institutionData,
    editedCampuses,
    expandedCampuses,
    expandedFaculties,
    toggleCampusExpanded,
    toggleFacultyExpanded,
  } = useSetupStore()

  const campusCount = useSetupStore(selectCampusCount)
  const facultyCount = useSetupStore(selectFacultyCount)
  const courseCount = useSetupStore(selectCourseCount)

  if (!institutionData) {
    return (
      <div className={cn('flex items-center justify-center p-8 font-mono', className)}>
        <p className="text-syntax-comment">// No institution selected</p>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* Terminal-style header comment */}
      <p className="font-mono text-sm">
        <span className="text-traffic-green">//</span>
        <span className="text-muted-foreground"> Preview the data that will be added to your dashboard</span>
      </p>

      {/* Institution Header - Terminal Style */}
      <CodeCard>
        <CodeCardHeader
          filename={`${institutionData.name.toLowerCase().replace(/\s+/g, '-')}.institution`}
          status="active"
          badge={
            <span className="font-mono text-xs capitalize text-syntax-comment">
              {institutionData.type}
            </span>
          }
        />
        <div className="p-4 font-mono">
          {/* JSON-style display */}
          <div className="space-y-1 text-sm">
            <div>
              <span className="text-syntax-key">"name"</span>
              <span className="text-foreground"> : </span>
              <span className="text-syntax-string">"{institutionData.name}"</span>
            </div>
            <div>
              <span className="text-syntax-key">"location"</span>
              <span className="text-foreground"> : </span>
              <span className="text-syntax-string">
                "{institutionData.city}, {institutionData.province}"
              </span>
            </div>
            <div>
              <span className="text-syntax-key">"website"</span>
              <span className="text-foreground"> : </span>
              <a
                href={institutionData.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-syntax-string hover:underline"
              >
                "{institutionData.website}"
              </a>
            </div>
            {institutionData.contactEmail && (
              <div>
                <span className="text-syntax-key">"contact"</span>
                <span className="text-foreground"> : </span>
                <span className="text-syntax-string">"{institutionData.contactEmail}"</span>
              </div>
            )}
          </div>

          {/* Stats Summary */}
          <div className="mt-6 pt-4 border-t border-border grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-syntax-number">{campusCount}</p>
              <p className="text-xs text-syntax-comment">campuses</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-syntax-export">{facultyCount}</p>
              <p className="text-xs text-syntax-comment">faculties</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-syntax-string">{courseCount}</p>
              <p className="text-xs text-syntax-comment">courses</p>
            </div>
          </div>
        </div>
      </CodeCard>

      {/* Campus Tree View - Terminal Style */}
      <CodeCard>
        <CodeCardHeader
          filename="structure.tree"
          status="active"
          badge={
            <span className="font-mono text-xs text-syntax-comment">
              preview
            </span>
          }
        />
        <div className="divide-y divide-border">
          {editedCampuses
            .filter((c) => !c._isDeleted)
            .map((campus) => (
              <CampusNode
                key={campus._id}
                campus={campus}
                isExpanded={expandedCampuses.has(campus._id)}
                expandedFaculties={expandedFaculties}
                onToggle={() => toggleCampusExpanded(campus._id)}
                onToggleFaculty={(facultyCode) =>
                  toggleFacultyExpanded(`${campus._id}-${facultyCode}`)
                }
              />
            ))}
        </div>
      </CodeCard>

    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

interface CampusNodeProps {
  campus: PreConfiguredCampus & { _id: string }
  isExpanded: boolean
  expandedFaculties: Set<string>
  onToggle: () => void
  onToggleFaculty: (facultyCode: string) => void
}

function CampusNode({
  campus,
  isExpanded,
  expandedFaculties,
  onToggle,
  onToggleFaculty,
}: CampusNodeProps) {
  const allFaculties = campus.programmeTypes.flatMap(pt => pt.faculties)
  const totalCourses = allFaculties.reduce(
    (sum, f) => sum + f.courses.length,
    0
  )

  return (
    <div>
      {/* Campus Header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors font-mono"
      >
        <span className="text-muted-foreground">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>
        <Building2 className="h-5 w-5 text-syntax-key" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-syntax-string">"{campus.name}"</span>
            {campus.isMain && (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                main
              </span>
            )}
            <span className="text-xs text-syntax-comment">({campus.code})</span>
          </div>
          <p className="text-sm text-syntax-comment">{campus.location}</p>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-xs">
          <span>
            <span className="text-syntax-number">{allFaculties.length}</span>
            <span className="text-syntax-comment"> faculties</span>
          </span>
          <span>
            <span className="text-syntax-number">{totalCourses}</span>
            <span className="text-syntax-comment"> courses</span>
          </span>
        </div>
      </button>

      {/* Faculty List */}
      {isExpanded && allFaculties.length > 0 && (
        <div className="border-t border-border/50 bg-muted/30">
          {allFaculties.map((faculty, index) => (
            <FacultyNode
              key={`${campus._id}-faculty-${index}`}
              faculty={faculty}
              campusId={campus._id}
              isExpanded={expandedFaculties.has(`${campus._id}-${faculty.code}`)}
              onToggle={() => onToggleFaculty(faculty.code)}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {isExpanded && allFaculties.length === 0 && (
        <div className="border-t border-border/50 bg-muted/30 p-4 pl-12 font-mono">
          <p className="text-sm">
            <span className="text-traffic-green">//</span>
            <span className="text-muted-foreground"> No faculties configured. Same programmes as main campus.</span>
          </p>
        </div>
      )}
    </div>
  )
}

interface FacultyNodeProps {
  faculty: PreConfiguredFaculty
  campusId: string
  isExpanded: boolean
  onToggle: () => void
}

function FacultyNode({
  faculty,
  campusId,
  isExpanded,
  onToggle,
}: FacultyNodeProps) {
  return (
    <div>
      {/* Faculty Header */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-3 pl-12 text-left hover:bg-muted/50 transition-colors font-mono"
      >
        <span className="text-muted-foreground">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>
        <Users className="h-4 w-4 text-syntax-export" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-syntax-string">"{faculty.name}"</span>
            <span className="text-xs text-syntax-comment">({faculty.code})</span>
          </div>
          {faculty.description && (
            <p className="text-xs">
              <span className="text-traffic-green">//</span>
              <span className="text-muted-foreground"> {faculty.description}</span>
            </p>
          )}
        </div>
        <span className="text-xs">
          <span className="text-syntax-number">{faculty.courses.length}</span>
          <span className="text-syntax-comment"> courses</span>
        </span>
      </button>

      {/* Course List */}
      {isExpanded && (
        <div className="border-t border-border/30 bg-muted/50">
          {faculty.courses.map((course) => (
            <CourseNode key={course.code} course={course} />
          ))}
        </div>
      )}
    </div>
  )
}

interface CourseNodeProps {
  course: PreConfiguredCourse
}

function CourseNode({ course }: CourseNodeProps) {
  return (
    <div className="flex items-center gap-3 p-3 pl-20 text-sm font-mono">
      <BookOpen className="h-4 w-4 text-syntax-string" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-foreground truncate">{course.name}</span>
          <span className="text-xs text-syntax-comment">({course.code})</span>
        </div>
        {course.requirements && (
          <div className="flex items-center gap-2 mt-0.5 text-xs text-syntax-comment">
            {course.requirements.minimumAps && (
              <span>
                APS: <span className="text-syntax-number">{course.requirements.minimumAps}</span>
              </span>
            )}
            {course.requirements.requiredSubjects && (
              <span>
                Required: {course.requirements.requiredSubjects.join(', ')}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-xs font-medium',
            LEVEL_COLORS[course.level]
          )}
        >
          {LEVEL_LABELS[course.level]}
        </span>
        <span className="flex items-center gap-1 text-xs text-syntax-comment">
          <Clock className="h-3 w-3" />
          <span className="text-syntax-number">{course.durationYears}</span>y
        </span>
      </div>
    </div>
  )
}

export default InstitutionPreview
