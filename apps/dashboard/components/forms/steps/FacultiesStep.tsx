'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Input } from '@/components/ui/Input'
import { CommandButton } from '@/components/ui/CommandButton'
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
      {/* Header - Code Style */}
      <div className="flex items-center gap-3 mb-6">
        <GraduationCap className="h-5 w-5 text-syntax-key" />
        <h2 className="font-mono text-lg">
          <span className="text-syntax-export">export</span>
          <span className="text-syntax-key ml-2">Faculties</span>
        </h2>
      </div>

      <p className="font-mono text-xs text-traffic-green mb-6">
        // Add the faculties or departments within this campus
      </p>

      {/* List of Added Faculties */}
      {faculties.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-mono text-xs text-traffic-green">
            // Added Faculties ({faculties.length})
          </h3>
          {faculties.map((faculty) => (
            <div
              key={faculty.id}
              className="flex items-start justify-between p-4 border border-border rounded-lg bg-muted/30"
            >
              <div className="flex-1 font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-syntax-key">"{faculty.name}"</span>
                  <span className="text-xs bg-syntax-key/10 text-syntax-key px-2 py-1 rounded">
                    {faculty.code}
                  </span>
                </div>
                {faculty.description && (
                  <p className="text-xs text-traffic-green mt-1">
                    // {faculty.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemoveFaculty(faculty.id)}
                className="p-2 text-traffic-red hover:bg-traffic-red/10 rounded transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Faculty Form */}
      {isAddingFaculty ? (
        <form onSubmit={handleSubmit(handleAddFaculty)} className="space-y-4 p-6 border border-border rounded-lg bg-muted/10">
          <h3 className="font-mono text-sm text-traffic-green">// New Faculty</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <SyntaxLabel name="Faculty Name" required />
              <Input
                id="name"
                placeholder="Engineering"
                className="font-mono"
                {...register('name')}
              />
              {errors.name && (
                <p className="font-mono text-xs text-destructive">// Error: {errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <SyntaxLabel name="Faculty Code" required />
              <Input
                id="code"
                placeholder="ENG"
                className="font-mono uppercase"
                {...register('code')}
              />
              {errors.code && (
                <p className="font-mono text-xs text-destructive">// Error: {errors.code.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <SyntaxLabel name="Description" />
            <Input
              id="description"
              placeholder="Brief description of this faculty"
              className="font-mono"
              {...register('description')}
            />
          </div>

          <div className="flex gap-2">
            <CommandButton type="submit" command="add" variant="primary" size="sm" />
            <CommandButton
              type="button"
              command="cancel"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAddingFaculty(false)
                reset()
              }}
            />
          </div>
        </form>
      ) : (
        <CommandButton
          type="button"
          command="add --faculty"
          variant="outline"
          onClick={() => setIsAddingFaculty(true)}
          className="w-full justify-center"
        />
      )}

      {/* Action Buttons - Command Style */}
      <div className="flex justify-between pt-6 border-t border-border">
        <div className="flex gap-2">
          <CommandButton type="button" command="back" variant="outline" onClick={onBack} />
          <CommandButton type="button" command="cancel" variant="ghost" onClick={onCancel} />
        </div>
        <CommandButton
          type="button"
          command="next --courses"
          variant="primary"
          arrow
          onClick={handleNext}
          disabled={faculties.length === 0}
        />
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
