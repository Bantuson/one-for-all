'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Input } from '@/components/ui/Input'
import { CommandButton } from '@/components/ui/CommandButton'
import { BookOpen, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import type { Faculty } from './FacultiesStep'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog'

const courseSchema = z.object({
  name: z.string().min(2, 'Course name must be at least 2 characters'),
  code: z.string().min(2, 'Course code must be at least 2 characters'),
  requirements: z.string().optional(),
  status: z.enum(['draft', 'active', 'inactive']),
})

type CourseFormData = z.infer<typeof courseSchema>

export interface Course {
  id: string
  name: string
  code: string
  requirements: string
  status: 'draft' | 'active' | 'inactive'
}

interface CoursesStepProps {
  faculties: Faculty[]
  initialData?: Record<string, Course[]>
  onNext: (courses: Record<string, Course[]>) => void
  onBack: () => void
  onCancel: () => void
}

// JSON-style label component
function SyntaxLabel({ name, required }: { name: string; required?: boolean }) {
  return (
    <label className="block font-mono text-sm mb-1.5">
      <span className="text-syntax-key">"{name}"</span>
      <span className="text-foreground"> :</span>
      {required && <span className="text-destructive ml-1">*</span>}
    </label>
  )
}

export function CoursesStep({
  faculties,
  initialData = {},
  onNext,
  onBack,
  onCancel,
}: CoursesStepProps) {
  const [coursesByFaculty, setCoursesByFaculty] = useState<Record<string, Course[]>>(initialData)
  const [expandedFaculties, setExpandedFaculties] = useState<Set<string>>(new Set(faculties.map(f => f.id)))
  const [addingToFaculty, setAddingToFaculty] = useState<string | null>(null)
  const [showValidationDialog, setShowValidationDialog] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    
  } = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      name: '',
      code: '',
      requirements: '',
      status: 'active',
    },
  })

  const toggleFaculty = (facultyId: string) => {
    const newExpanded = new Set(expandedFaculties)
    if (newExpanded.has(facultyId)) {
      newExpanded.delete(facultyId)
    } else {
      newExpanded.add(facultyId)
    }
    setExpandedFaculties(newExpanded)
  }

  const handleAddCourse = (facultyId: string, data: CourseFormData) => {
    const newCourse: Course = {
      id: `course-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: data.name,
      code: data.code,
      requirements: data.requirements || '',
      status: data.status,
    }

    setCoursesByFaculty((prev) => ({
      ...prev,
      [facultyId]: [...(prev[facultyId] || []), newCourse],
    }))

    reset()
    setAddingToFaculty(null)
  }

  const handleRemoveCourse = (facultyId: string, courseId: string) => {
    setCoursesByFaculty((prev) => ({
      ...prev,
      [facultyId]: (prev[facultyId] || []).filter((c) => c.id !== courseId),
    }))
  }

  const getTotalCourses = () => {
    return Object.values(coursesByFaculty).reduce((sum, courses) => sum + courses.length, 0)
  }

  const handleNext = () => {
    if (getTotalCourses() === 0) {
      setShowValidationDialog(true)
      return
    }
    onNext(coursesByFaculty)
  }

  return (
    <div className="space-y-6">
      {/* Header - Code Style */}
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="h-5 w-5 text-syntax-key" />
        <h2 className="font-mono text-lg">
          <span className="text-syntax-export">export</span>
          <span className="text-syntax-key ml-2">Courses</span>
        </h2>
      </div>

      <p className="font-mono text-xs text-traffic-green mb-6">
        // Add courses for each faculty. Total: <span className="text-syntax-string">{getTotalCourses()}</span>
      </p>

      {/* Faculties with Courses */}
      <div className="space-y-4">
        {faculties.map((faculty) => {
          const facultyCourses = coursesByFaculty[faculty.id] || []
          const isExpanded = expandedFaculties.has(faculty.id)
          const isAdding = addingToFaculty === faculty.id

          return (
            <div key={faculty.id} className="border border-border rounded-lg overflow-hidden">
              {/* Faculty Header */}
              <div
                className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleFaculty(faculty.id)}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div className="font-mono">
                    <h3 className="text-syntax-key">"{faculty.name}"</h3>
                    <p className="text-xs text-traffic-green">
                      // {facultyCourses.length} course{facultyCourses.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <span className="text-xs bg-syntax-key/10 text-syntax-key px-2 py-1 rounded font-mono">
                  {faculty.code}
                </span>
              </div>

              {/* Faculty Content */}
              {isExpanded && (
                <div className="p-4 space-y-3">
                  {/* Existing Courses */}
                  {facultyCourses.map((course) => (
                    <div
                      key={course.id}
                      className="flex items-start justify-between p-3 border border-border rounded-lg bg-background"
                    >
                      <div className="flex-1 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="text-syntax-key">"{course.name}"</span>
                          <span className="text-xs bg-muted px-2 py-1 rounded">
                            {course.code}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              course.status === 'active'
                                ? 'bg-traffic-green/10 text-traffic-green'
                                : course.status === 'draft'
                                ? 'bg-traffic-yellow/10 text-traffic-yellow'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {course.status}
                          </span>
                        </div>
                        {course.requirements && (
                          <p className="text-xs text-traffic-green mt-1">
                            // Requirements: {course.requirements}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCourse(faculty.id, course.id)}
                        className="p-2 text-traffic-red hover:bg-traffic-red/10 rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  {/* Add Course Form */}
                  {isAdding ? (
                    <form
                      onSubmit={handleSubmit((data) => handleAddCourse(faculty.id, data))}
                      className="space-y-4 p-4 border border-border rounded-lg bg-muted/10"
                    >
                      <h4 className="font-mono text-sm text-traffic-green">// New Course for {faculty.name}</h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <SyntaxLabel name="Course Name" required />
                          <Input
                            id={`name-${faculty.id}`}
                            placeholder="Computer Science"
                            className="font-mono"
                            {...register('name')}
                          />
                          {errors.name && (
                            <p className="font-mono text-xs text-destructive">// Error: {errors.name.message}</p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <SyntaxLabel name="Course Code" required />
                          <Input
                            id={`code-${faculty.id}`}
                            placeholder="CS101"
                            className="font-mono uppercase"
                            {...register('code')}
                          />
                          {errors.code && (
                            <p className="font-mono text-xs text-destructive">// Error: {errors.code.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <SyntaxLabel name="Requirements" />
                        <Input
                          id={`requirements-${faculty.id}`}
                          placeholder="Matric with Math and Science"
                          className="font-mono"
                          {...register('requirements')}
                        />
                      </div>

                      <div className="space-y-1">
                        <SyntaxLabel name="Status" />
                        <select
                          id={`status-${faculty.id}`}
                          {...register('status')}
                          className="w-full px-3 py-2 border border-input rounded-lg bg-background font-mono text-sm"
                        >
                          <option value="active">active</option>
                          <option value="draft">draft</option>
                          <option value="inactive">inactive</option>
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <CommandButton type="submit" command="add" variant="primary" size="sm" />
                        <CommandButton
                          type="button"
                          command="cancel"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAddingToFaculty(null)
                            reset()
                          }}
                        />
                      </div>
                    </form>
                  ) : (
                    <CommandButton
                      type="button"
                      command={`add --course "${faculty.name}"`}
                      variant="outline"
                      size="sm"
                      onClick={() => setAddingToFaculty(faculty.id)}
                      className="w-full justify-center"
                    />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Action Buttons - Command Style */}
      <div className="flex justify-between pt-6 border-t border-border">
        <div className="flex gap-2">
          <CommandButton type="button" command="back" variant="outline" onClick={onBack} />
          <CommandButton type="button" command="cancel" variant="ghost" onClick={onCancel} />
        </div>
        <CommandButton
          type="button"
          command="next --team"
          variant="primary"
          arrow
          onClick={handleNext}
          disabled={getTotalCourses() === 0}
        />
      </div>

      {/* Validation Dialog */}
      <AlertDialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No Courses Added</AlertDialogTitle>
            <AlertDialogDescription>
              Please add at least one course before continuing to the next step.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowValidationDialog(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
