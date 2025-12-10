'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Button } from '@/components/ui/Button'
import { GraduationCap, Plus, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog'

const facultySchema = z.object({
  name: z.string().min(2, 'Faculty name must be at least 2 characters'),
  code: z.string().min(2, 'Faculty code must be at least 2 characters'),
  description: z.string().optional(),
})

type FacultyFormData = z.infer<typeof facultySchema>

export interface Faculty {
  id: string
  name: string
  code: string
  description: string
}

interface FacultiesStepProps {
  initialData?: Faculty[]
  onNext: (faculties: Faculty[]) => void
  onBack: () => void
  onCancel: () => void
}

export function FacultiesStep({
  initialData = [],
  onNext,
  onBack,
  onCancel,
}: FacultiesStepProps) {
  const [faculties, setFaculties] = useState<Faculty[]>(initialData)
  const [isAddingFaculty, setIsAddingFaculty] = useState(false)
  const [showValidationDialog, setShowValidationDialog] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FacultyFormData>({
    resolver: zodResolver(facultySchema),
  })

  const handleAddFaculty = (data: FacultyFormData) => {
    const newFaculty: Faculty = {
      id: `faculty-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: data.name,
      code: data.code,
      description: data.description || '',
    }
    setFaculties((prev) => [...prev, newFaculty])
    reset()
    setIsAddingFaculty(false)
  }

  const handleRemoveFaculty = (id: string) => {
    setFaculties(faculties.filter((f) => f.id !== id))
  }

  const handleNext = () => {
    if (faculties.length === 0) {
      setShowValidationDialog(true)
      return
    }
    onNext(faculties)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <GraduationCap className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-semibold">Add Faculties</h2>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Add the faculties or departments within this campus. You'll be able to add
        courses for each faculty in the next step.
      </p>

      {/* List of Added Faculties */}
      {faculties.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Added Faculties ({faculties.length})
          </h3>
          {faculties.map((faculty) => (
            <div
              key={faculty.id}
              className="flex items-start justify-between p-4 border rounded-lg bg-muted/30"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold">{faculty.name}</h4>
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                    {faculty.code}
                  </span>
                </div>
                {faculty.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {faculty.description}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveFaculty(faculty.id)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add Faculty Form */}
      {isAddingFaculty ? (
        <form onSubmit={handleSubmit(handleAddFaculty)} className="space-y-4 p-6 border rounded-lg bg-muted/10">
          <h3 className="text-lg font-medium">New Faculty</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Faculty Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g., Engineering, Arts, Science"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">
                Faculty Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="code"
                placeholder="e.g., ENG, ART, SCI"
                {...register('code')}
              />
              {errors.code && (
                <p className="text-sm text-red-500">{errors.code.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              placeholder="Brief description of this faculty"
              {...register('description')}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" size="sm">
              Add Faculty
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAddingFaculty(false)
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
          onClick={() => setIsAddingFaculty(true)}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Faculty
        </Button>
      )}

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
          disabled={faculties.length === 0}
        >
          Next: Add Courses
        </Button>
      </div>

      {/* Validation Dialog */}
      <AlertDialog open={showValidationDialog} onOpenChange={setShowValidationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>No Faculties Added</AlertDialogTitle>
            <AlertDialogDescription>
              Please add at least one faculty before continuing to the next step.
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
