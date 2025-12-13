'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Stepper } from '@/components/ui/Stepper'
import { CodeCard, CodeCardHeader } from '@/components/ui/CodeCard'
import { CampusInfoStep, CampusInfoFormData } from './steps/CampusInfoStep'
import { FacultiesStep, Faculty } from './steps/FacultiesStep'
import { CoursesStep, Course } from './steps/CoursesStep'
import { TeamMembersStep, TeamMember } from './steps/TeamMembersStep'
import {
  saveCampusWizardData,
  loadCampusWizardData,
  clearCampusWizardData,
  CampusWizardData,
} from '@/lib/localStorage'
import { CommandButton } from '@/components/ui/CommandButton'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog'

interface CampusWizardProps {
  institutionId: string
  institutionSlug: string
}

const steps = [
  { id: 0, name: 'Campus Info' },
  { id: 1, name: 'Faculties' },
  { id: 2, name: 'Courses' },
  { id: 3, name: 'Team Members' },
]

export function CampusWizard({ institutionId, institutionSlug }: CampusWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  // Form data state
  const [campusInfo, setCampusInfo] = useState<CampusInfoFormData | undefined>()
  const [faculties, setFaculties] = useState<Faculty[]>([])
  const [courses, setCourses] = useState<Record<string, Course[]>>({})
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

  // Load saved data on mount
  useEffect(() => {
    const savedData = loadCampusWizardData(institutionSlug)
    if (savedData) {
      setCurrentStep(savedData.currentStep || 0)
      if (savedData.campusInfo) setCampusInfo(savedData.campusInfo)
      if (savedData.faculties) setFaculties(savedData.faculties)
      if (savedData.courses) setCourses(savedData.courses)
      if (savedData.teamMembers) setTeamMembers(savedData.teamMembers)
    }
  }, [institutionSlug])

  // Auto-save on data change
  useEffect(() => {
    if (campusInfo || faculties.length > 0 || Object.keys(courses).length > 0) {
      const data: CampusWizardData = {
        currentStep,
        campusInfo,
        faculties,
        courses,
        teamMembers,
      }
      saveCampusWizardData(institutionSlug, data)
    }
  }, [currentStep, campusInfo, faculties, courses, teamMembers, institutionSlug])

  const handleCampusInfoNext = (data: CampusInfoFormData) => {
    setCampusInfo(data)
    setCurrentStep(1)
  }

  const handleFacultiesNext = (facultyData: Faculty[]) => {
    setFaculties(facultyData)
    setCurrentStep(2)
  }

  const handleCoursesNext = (courseData: Record<string, Course[]>) => {
    setCourses(courseData)
    setCurrentStep(3)
  }

  const handleFinalSubmit = async (teamMemberData: TeamMember[]) => {
    setTeamMembers(teamMemberData)
    setIsSubmitting(true)
    setError(null)

    try {
      // Create campus
      const campusData = {
        institution_id: institutionId,
        name: campusInfo!.name,
        code: campusInfo!.code,
        address: {
          street: campusInfo!.street,
          city: campusInfo!.city,
          province: campusInfo!.province,
          postal_code: campusInfo!.postalCode,
        },
      }

      const campusResponse = await fetch('/api/campuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campusData),
      })

      if (!campusResponse.ok) {
        const errorData = await campusResponse.json()
        throw new Error(errorData.error || 'Failed to create campus')
      }

      const { campus } = await campusResponse.json()

      // Create faculties
      for (const faculty of faculties) {
        const facultyData = {
          institution_id: institutionId,
          campus_id: campus.id,
          name: faculty.name,
          code: faculty.code,
          description: faculty.description,
        }

        const facultyResponse = await fetch('/api/faculties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(facultyData),
        })

        if (!facultyResponse.ok) {
          throw new Error(`Failed to create faculty: ${faculty.name}`)
        }

        const { faculty: createdFaculty } = await facultyResponse.json()

        // Create courses for this faculty
        const facultyCourses = courses[faculty.id] || []
        for (const course of facultyCourses) {
          const courseData = {
            institution_id: institutionId,
            faculty_id: createdFaculty.id,
            campus_id: campus.id,
            name: course.name,
            code: course.code,
            requirements: course.requirements ? { text: course.requirements } : {},
            status: course.status,
          }

          const courseResponse = await fetch('/api/courses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(courseData),
          })

          if (!courseResponse.ok) {
            throw new Error(`Failed to create course: ${course.name}`)
          }
        }
      }

      // Invite team members
      if (teamMemberData.length > 0) {
        const inviteData = {
          institution_id: institutionId,
          campus_slug: institutionSlug,
          members: teamMemberData.map((member) => ({
            email: member.email,
            role: member.role,
            permissions: member.permissions,
          })),
        }

        const inviteResponse = await fetch('/api/team/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inviteData),
        })

        // Don't fail the whole process if invites fail
        if (!inviteResponse.ok) {
          console.warn('Failed to send some team invitations')
        }
      }

      // Clear saved data and redirect
      clearCampusWizardData(institutionSlug)
      router.push(`/dashboard/${institutionSlug}?success=campus_created`)
    } catch (err) {
      console.error('Campus creation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create campus')
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setShowCancelDialog(true)
  }

  const confirmCancel = () => {
    setShowCancelDialog(false)
    router.push(`/dashboard/${institutionSlug}`)
  }

  return (
    <div className="flex flex-col flex-1">
      {/* Sub-header - Terminal Style */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-card via-muted/30 to-card">
        <div className="container mx-auto max-w-4xl flex items-center gap-4">
          <Link href={`/dashboard/${institutionSlug}`}>
            <CommandButton command="cd .." variant="ghost" size="sm" />
          </Link>
          <div className="flex items-center gap-2 font-mono">
            <span className="text-syntax-export">export</span>
            <span className="text-syntax-key">campus-wizard</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto pb-8 px-4 pt-6">
        <div className="max-w-4xl mx-auto">
          {/* Description - Comment Style */}
          <div className="mb-8">
            <p className="font-mono text-sm text-traffic-green">
              // Set up your campus structure with faculties, courses, and team members.
              <br />
              // Your progress is automatically saved.
            </p>
          </div>

        {/* Progress Stepper */}
        <div className="mb-8">
          <Stepper steps={steps} currentStep={currentStep} />
        </div>

        {/* Error Display - Terminal Style */}
        {error && (
          <div className="mb-6 p-4 border border-traffic-red/50 bg-traffic-red/5 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-traffic-red flex-shrink-0 mt-0.5" />
              <div className="font-mono">
                <h3 className="text-sm text-traffic-red">// Error</h3>
                <p className="text-sm text-foreground mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Step Content - CodeCard Style */}
        <CodeCard>
          <CodeCardHeader
            filename="campus-wizard.form"
            status="active"
            badge={<span className="font-mono text-xs text-muted-foreground">step {currentStep + 1}/4</span>}
          />
          <div className="p-6">
            {currentStep === 0 && (
              <CampusInfoStep
                initialData={campusInfo}
                onNext={handleCampusInfoNext}
                onCancel={handleCancel}
              />
            )}

            {currentStep === 1 && (
              <FacultiesStep
                initialData={faculties}
                onNext={handleFacultiesNext}
                onBack={() => setCurrentStep(0)}
                onCancel={handleCancel}
              />
            )}

            {currentStep === 2 && (
              <CoursesStep
                faculties={faculties}
                initialData={courses}
                onNext={handleCoursesNext}
                onBack={() => setCurrentStep(1)}
                onCancel={handleCancel}
              />
            )}

            {currentStep === 3 && (
              <TeamMembersStep
                initialData={teamMembers}
                onSubmit={handleFinalSubmit}
                onBack={() => setCurrentStep(2)}
                onCancel={handleCancel}
                isSubmitting={isSubmitting}
              />
            )}
          </div>
        </CodeCard>
        </div>
      </div>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Campus Creation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel? Your progress has been saved and you can continue later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel}>Yes, Cancel</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}
