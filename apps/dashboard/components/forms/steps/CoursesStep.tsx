'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { BookOpen, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { Faculty } from './FacultiesStep'
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
  status: z.enum(['draft', 'active', 'inactive']).default('active'),
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
    setValue,
  } = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
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
      <div className="flex items-center gap-2 mb-6">
        <BookOpen className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-semibold">Add Courses</h2>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Add courses for each faculty. You can add multiple courses per faculty.
        Total courses added: <span className="font-semibold">{getTotalCourses()}</span>
      </p>

      {/* Faculties with Courses */}
      <div className="space-y-4">
        {faculties.map((faculty) => {
          const facultyCourses = coursesByFaculty[faculty.id] || []
          const isExpanded = expandedFaculties.has(faculty.id)
          const isAdding = addingToFaculty === faculty.id

          return (
            <div key={faculty.id} className="border rounded-lg overflow-hidden">
              {/* Faculty Header */}
              <div
                className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleFaculty(faculty.id)}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                  <div>
                    <h3 className="font-semibold">{faculty.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {facultyCourses.length} course{facultyCourses.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
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
                      className="flex items-start justify-between p-3 border rounded-lg bg-background"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{course.name}</h4>
                          <span className="text-xs bg-secondary px-2 py-1 rounded">
                            {course.code}
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              course.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : course.status === 'draft'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {course.status}
                          </span>
                        </div>
                        {course.requirements && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Requirements: {course.requirements}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCourse(faculty.id, course.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {/* Add Course Form */}
                  {isAdding ? (
                    <form
                      onSubmit={handleSubmit((data) => handleAddCourse(faculty.id, data))}
                      className="space-y-4 p-4 border rounded-lg bg-muted/10"
                    >
                      <h4 className="font-medium">New Course for {faculty.name}</h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor={`name-${faculty.id}`}>
                            Course Name <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id={`name-${faculty.id}`}
                            placeholder="e.g., Computer Science, Mathematics"
                            {...register('name')}
                          />
                          {errors.name && (
                            <p className="text-sm text-red-500">{errors.name.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`code-${faculty.id}`}>
                            Course Code <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id={`code-${faculty.id}`}
                            placeholder="e.g., CS101, MATH201"
                            {...register('code')}
                          />
                          {errors.code && (
                            <p className="text-sm text-red-500">{errors.code.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`requirements-${faculty.id}`}>
                          Requirements (Optional)
                        </Label>
                        <Input
                          id={`requirements-${faculty.id}`}
                          placeholder="e.g., Matric with Math and Science"
                          {...register('requirements')}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`status-${faculty.id}`}>Status</Label>
                        <select
                          id={`status-${faculty.id}`}
                          {...register('status')}
                          className="w-full px-3 py-2 border rounded-lg bg-background"
                        >
                          <option value="active">Active</option>
                          <option value="draft">Draft</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <Button type="submit" size="sm">
                          Add Course
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAddingToFaculty(null)
                            reset()
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAddingToFaculty(faculty.id)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Course to {faculty.name}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-6 border-t">
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
        <Button
          type="button"
          onClick={handleNext}
          disabled={getTotalCourses() === 0}
        >
          Next: Invite Team Members
        </Button>
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
