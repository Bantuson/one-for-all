'use client'

import { useState } from 'react'
import { ChevronRight, Folder, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { CommandButton } from '@/components/ui/CommandButton'
import { TrafficLightsFilename, StatusBadge, ModuleBadge } from '@/components/ui/TrafficLights'

interface Course {
  id: string
  name: string
  code: string
  status: string
  applications?: number
  description?: string
}

interface Faculty {
  id: string
  name: string
  code: string
  courses: Course[]
}

interface Campus {
  id: string
  name: string
  code: string
  faculties: Faculty[]
}

interface ThreeColumnLayoutProps {
  campuses: Campus[]
  institutionSlug: string
}

export function ThreeColumnLayout({
  campuses,
  institutionSlug,
}: ThreeColumnLayoutProps) {
  const [selectedCampus, setSelectedCampus] = useState<Campus | null>(
    campuses[0] || null
  )
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(
    campuses[0]?.faculties[0] || null
  )

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Column 1: Campuses */}
      <div className="w-72 border-r border-border bg-muted/20 overflow-y-auto flex flex-col">
        {/* Column Header */}
        <div className="px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
          <TrafficLightsFilename
            status="active"
            filename="campuses/"
            rightContent={
              <span className="text-xs font-mono text-syntax-number">{campuses.length}</span>
            }
          />
        </div>

        {/* Campus List */}
        <div className="flex-1 p-2 space-y-2">
          {campuses.map((campus) => (
            <button
              key={campus.id}
              onClick={() => {
                setSelectedCampus(campus)
                setSelectedFaculty(campus.faculties[0] || null)
              }}
              className={cn(
                'w-full rounded-md border border-border bg-card overflow-hidden',
                'hover:border-primary/50 transition-all',
                selectedCampus?.id === campus.id && 'ring-2 ring-primary border-primary'
              )}
            >
              {/* Card Header */}
              <div className="px-3 py-2 border-b border-border/50 bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Folder className="h-3.5 w-3.5 text-syntax-key" />
                  <span className="font-mono text-xs text-foreground">{campus.code.toLowerCase()}/</span>
                </div>
                {selectedCampus?.id === campus.id && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </div>
              {/* Card Body */}
              <div className="px-3 py-2 font-mono text-sm space-y-1">
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
              </div>
              {/* Card Footer */}
              <div className="px-3 py-1.5 border-t border-border/50 bg-muted/20">
                <span className="font-mono text-xs text-syntax-comment">
                  $ cd {campus.code.toLowerCase()} && ls
                </span>
              </div>
            </button>
          ))}
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

      {/* Column 2: Faculties */}
      <div className="w-72 border-r border-border bg-muted/20 overflow-y-auto flex flex-col">
        {/* Column Header */}
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
          <>
            {/* Faculty List */}
            <div className="flex-1 p-2 space-y-2">
              {selectedCampus.faculties.map((faculty) => (
                <button
                  key={faculty.id}
                  onClick={() => setSelectedFaculty(faculty)}
                  className={cn(
                    'w-full rounded-md border border-border bg-card overflow-hidden',
                    'hover:border-primary/50 transition-all',
                    selectedFaculty?.id === faculty.id && 'ring-2 ring-primary border-primary'
                  )}
                >
                  {/* Card Header */}
                  <div className="px-3 py-2 border-b border-border/50 bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5 text-syntax-export" />
                      <span className="font-mono text-xs text-foreground">{faculty.code.toLowerCase()}/</span>
                    </div>
                    <ModuleBadge />
                  </div>
                  {/* Card Body */}
                  <div className="px-3 py-2 font-mono text-sm space-y-1">
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
                  </div>
                  {/* Card Footer */}
                  <div className="px-3 py-1.5 border-t border-border/50 bg-muted/20">
                    <span className="font-mono text-xs text-syntax-comment">
                      $ cd {faculty.code.toLowerCase()} && ls
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {/* Add Faculty Button */}
            <div className="p-3 border-t border-border bg-card">
              <CommandButton
                command="add --faculty"
                variant="ghost"
                size="sm"
                className="w-full justify-center"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center font-mono">
              <p className="text-syntax-comment text-sm">// No campus selected</p>
              <p className="text-syntax-comment text-xs mt-1">$ select --campus first</p>
            </div>
          </div>
        )}
      </div>

      {/* Column 3: Courses */}
      <div className="flex-1 bg-card overflow-y-auto flex flex-col">
        {/* Column Header */}
        <div className="px-4 py-3 border-b border-border sticky top-0 z-10 bg-card">
          <TrafficLightsFilename
            status={selectedFaculty ? 'active' : 'neutral'}
            filename={selectedFaculty ? `${selectedFaculty.code.toLowerCase()}.courses` : 'courses/'}
            rightContent={
              selectedFaculty && (
                <span className="text-xs font-mono text-syntax-number">
                  {selectedFaculty.courses.length}
                </span>
              )
            }
          />
        </div>

        {selectedFaculty ? (
          selectedFaculty.courses.length > 0 ? (
            <>
              {/* Course List */}
              <div className="flex-1 p-4 space-y-4">
                {selectedFaculty.courses.map((course) => (
                  <div
                    key={course.id}
                    className="rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50 transition-all"
                  >
                    {/* Card Header with Traffic Lights */}
                    <div className="px-4 py-3 border-b border-border bg-muted/30">
                      <TrafficLightsFilename
                        status={course.status === 'active' ? 'active' : course.status === 'rejected' ? 'error' : 'neutral'}
                        filename={`${course.code.toLowerCase()}.course`}
                        rightContent={
                          <span className="inline-flex items-center gap-1 text-sm font-mono">
                            <span className="text-syntax-key">★</span>
                            <span className="text-syntax-number">{course.applications || 0}</span>
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
                        <span>🎓</span>
                        <span className="text-syntax-from">from</span>
                        <span className="text-syntax-string">"{selectedFaculty.name}"</span>
                      </div>
                      {course.description && (
                        <>
                          <div className="text-syntax-comment">//</div>
                          <div className="text-syntax-comment">// {course.description}</div>
                        </>
                      )}
                    </div>

                    {/* Card Footer */}
                    <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <StatusBadge status={course.status as 'active' | 'pending' | 'draft' | 'rejected'} />
                        {(course.applications || 0) > 0 && (
                          <span className="inline-flex items-center gap-1.5 text-sm">
                            <span>📥</span>
                            <span className="text-muted-foreground">apps:</span>
                            <span className="font-mono text-primary">{course.applications}</span>
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/dashboard/${institutionSlug}/courses/${course.id}/applications`}
                        className="text-sm font-mono text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <span className="opacity-70">$</span> view --applications &rarr;
                      </Link>
                    </div>
                  </div>
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
                  <span className="text-4xl">📁</span>
                </div>
                <div className="font-mono text-sm space-y-2 text-syntax-comment">
                  <p>// No courses found in this faculty</p>
                  <p className="text-foreground">const courses = [];</p>
                  <p>// Add your first course to get started</p>
                </div>
                <div className="mt-6">
                  <CommandButton
                    command="add --course --interactive"
                    variant="primary"
                    size="md"
                  />
                </div>
                <p className="mt-4 font-mono text-xs text-syntax-comment">
                  $ man add-course  // View documentation
                </p>
              </div>
            </div>
          )
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center font-mono">
              <p className="text-syntax-comment text-sm">// No faculty selected</p>
              <p className="text-syntax-comment text-xs mt-1">$ select --faculty first</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
