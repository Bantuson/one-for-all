'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Check, Loader2, AlertCircle } from 'lucide-react'
import { Stepper } from '@/components/ui/Stepper'
import { CodeCard, CodeCardHeader } from '@/components/ui/CodeCard'
import { CommandButton } from '@/components/ui/CommandButton'
import { Button } from '@/components/ui/Button'
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
import {
  useSetupStore,
  selectCanProceed,
  selectCampusCount,
} from '@/lib/stores/setupStore'

// ============================================================================
// Loading Skeletons
// ============================================================================

function StepLoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      <div className="h-4 bg-muted rounded w-3/4"></div>
      <div className="space-y-3">
        <div className="h-10 bg-muted rounded"></div>
        <div className="h-10 bg-muted rounded"></div>
        <div className="h-10 bg-muted rounded"></div>
      </div>
      <div className="h-4 bg-muted rounded w-1/2"></div>
    </div>
  )
}

function EditorLoadingSkeleton() {
  return (
    <div className="animate-pulse flex h-[500px]">
      <div className="w-1/3 border-r border-border p-4 space-y-3">
        <div className="h-6 bg-muted rounded w-1/2"></div>
        <div className="h-8 bg-muted rounded"></div>
        <div className="h-8 bg-muted rounded"></div>
        <div className="h-8 bg-muted rounded"></div>
      </div>
      <div className="flex-1 p-4 space-y-4">
        <div className="h-6 bg-muted rounded w-1/4"></div>
        <div className="h-32 bg-muted rounded"></div>
        <div className="h-24 bg-muted rounded"></div>
      </div>
    </div>
  )
}

// ============================================================================
// Dynamic Imports - Lazy-loaded components for code splitting
// ============================================================================

const InstitutionSelector = dynamic(
  () => import('./InstitutionSelector').then((mod) => ({ default: mod.InstitutionSelector })),
  {
    loading: () => <StepLoadingSkeleton />,
    ssr: false,
  }
)

const InstitutionPreview = dynamic(
  () => import('./InstitutionPreview').then((mod) => ({ default: mod.InstitutionPreview })),
  {
    loading: () => <StepLoadingSkeleton />,
    ssr: false,
  }
)

const SetupEditorMasterDetail = dynamic(
  () => import('./SetupEditorMasterDetail').then((mod) => ({ default: mod.SetupEditorMasterDetail })),
  {
    loading: () => <EditorLoadingSkeleton />,
    ssr: false,
  }
)

const TeamInviteStep = dynamic(
  () => import('./TeamInviteStep').then((mod) => ({ default: mod.TeamInviteStep })),
  {
    loading: () => <StepLoadingSkeleton />,
    ssr: false,
  }
)

// ============================================================================
// Types
// ============================================================================

interface InstitutionSetupPageProps {
  institutionId: string
  institutionSlug: string
}

// ============================================================================
// Constants
// ============================================================================

const STEP_DEFINITIONS = [
  { id: 0, name: 'Select' },
  { id: 1, name: 'Preview' },
  { id: 2, name: 'Customize' },
  { id: 3, name: 'Team' },
  { id: 4, name: 'Confirm' },
]

const MANUAL_STEP_DEFINITIONS = [
  { id: 0, name: 'Select' },
  { id: 1, name: 'Customize' },
  { id: 2, name: 'Team' },
  { id: 3, name: 'Confirm' },
]

// ============================================================================
// Component
// ============================================================================

export function InstitutionSetupPage({
  institutionId,
  institutionSlug,
}: InstitutionSetupPageProps) {
  const router = useRouter()
  const [showCancelDialog, setShowCancelDialog] = React.useState(false)

  const {
    currentStep,
    mode,
    reset,
    nextStep,
    prevStep,
    submitSetup,
    isSubmitting,
    error,
    institutionData,
    manualInstitutionName,
  } = useSetupStore()

  const canProceed = useSetupStore(selectCanProceed)
  const campusCount = useSetupStore(selectCampusCount)

  // Initialize store on mount
  React.useEffect(() => {
    reset()
  }, [reset])

  const handleSubmit = async () => {
    const success = await submitSetup(institutionId)
    if (success) {
      // After successful submission, redirect to dashboard
      router.push(`/dashboard/${institutionSlug}?success=setup_complete`)
    }
  }

  const handleCancel = () => {
    setShowCancelDialog(true)
  }

  const confirmCancel = () => {
    setShowCancelDialog(false)
    reset()
    router.push(`/dashboard/${institutionSlug}`)
  }

  // Determine steps based on mode
  const steps = mode === 'manual' ? MANUAL_STEP_DEFINITIONS : STEP_DEFINITIONS
  const stepNames = mode === 'manual'
    ? ['select', 'edit', 'invite', 'confirm']
    : ['select', 'preview', 'edit', 'invite', 'confirm']
  const currentStepIndex = stepNames.indexOf(currentStep)

  return (
    <div className="flex flex-col flex-1">
      {/* Sub-header - Terminal Style */}
      <div className="p-4 border-b border-border bg-gradient-to-r from-card via-muted/30 to-card">
        <div className="container mx-auto max-w-5xl flex items-center gap-4">
          <Link href={`/dashboard/${institutionSlug}`}>
            <CommandButton command="cd .." variant="ghost" size="sm" />
          </Link>
          <div className="flex items-center gap-2 font-mono">
            <span className="text-syntax-export">export</span>
            <span className="text-syntax-key">institution-setup</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto pb-8 px-4 pt-6">
        <div className="max-w-5xl mx-auto">
          {/* Description - Comment Style */}
          <div className="mb-8">
            <p className="font-mono text-sm">
              <span className="text-traffic-green">//</span>
              <span className="text-muted-foreground"> Select your institution from 27 pre-configured South African universities,</span>
              <br />
              <span className="text-traffic-green">//</span>
              <span className="text-muted-foreground"> or set up manually. Your progress is automatically saved.</span>
            </p>
          </div>

          {/* Progress Stepper */}
          <div className="mb-8">
            <Stepper steps={steps} currentStep={currentStepIndex} />
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
              filename="institution-setup.form"
              status="active"
              badge={
                <span className="font-mono text-xs text-muted-foreground">
                  step {currentStepIndex + 1}/{steps.length}
                </span>
              }
            />
            <div className={currentStep === 'edit' ? '' : 'p-6'}>
              {currentStep === 'select' && <InstitutionSelector />}
              {currentStep === 'preview' && <InstitutionPreview />}
              {currentStep === 'edit' && <SetupEditorMasterDetail className="min-h-[500px]" />}
              {currentStep === 'confirm' && (
                <ConfirmStep
                  institutionName={
                    mode === 'manual'
                      ? manualInstitutionName
                      : institutionData?.name || ''
                  }
                  campusCount={campusCount}
                />
              )}
              {currentStep === 'invite' && <TeamInviteStep />}
            </div>
          </CodeCard>

          {/* Footer Navigation */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
            <div>
              {currentStepIndex > 0 && (
                <Button variant="ghost" onClick={prevStep} disabled={isSubmitting}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {currentStep !== 'confirm' && (
                <Button variant="outline" onClick={handleCancel} disabled={isSubmitting}>
                  Cancel
                </Button>
              )}

              {currentStep === 'invite' ? (
                <>
                  <Button variant="outline" onClick={nextStep}>
                    Skip Team Invites
                  </Button>
                  <Button onClick={nextStep} disabled={isSubmitting}>
                    Continue to Review
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </>
              ) : currentStep === 'confirm' ? (
                <CommandButton
                  command="submit --setup"
                  variant="primary"
                  size="md"
                  onClick={handleSubmit}
                  disabled={!canProceed || isSubmitting}
                  className="min-w-[180px]"
                />
              ) : (
                <Button onClick={nextStep} disabled={!canProceed}>
                  {currentStep === 'edit' ? 'Continue to Team' : 'Continue'}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Setup?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel? Your progress will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Setup</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel}>Yes, Cancel</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

interface ConfirmStepProps {
  institutionName: string
  campusCount: number
}

function ConfirmStep({ institutionName, campusCount }: ConfirmStepProps) {
  const facultyCount = useSetupStore((state) =>
    state.editedCampuses
      .filter((c) => !c._isDeleted)
      .reduce((sum, c) =>
        sum + c.programmeTypes.reduce((pt, programmeType) => pt + programmeType.faculties.length, 0),
        0
      )
  )
  const courseCount = useSetupStore((state) =>
    state.editedCampuses
      .filter((c) => !c._isDeleted)
      .reduce(
        (sum, c) => sum + c.programmeTypes.reduce(
          (pt, programmeType) =>
            pt + programmeType.faculties.reduce((fs, f) => fs + f.courses.length, 0),
          0
        ),
        0
      )
  )

  const pendingInvites = useSetupStore((state) => state.pendingInvites)
  const isSubmitting = useSetupStore((state) => state.isSubmitting)

  // Calculate permission breakdown for team invites
  const permissionBreakdown = React.useMemo(() => {
    const counts = { admin: 0, standard: 0 }
    pendingInvites.forEach((invite) => {
      if (invite.permissions.includes('admin_access')) {
        counts.admin++
      } else {
        counts.standard++
      }
    })
    return counts
  }, [pendingInvites])

  return (
    <div className="space-y-6">
      {/* Summary - Terminal Style */}
      <div className="font-mono">
        <p className="text-sm mb-4">
          <span className="text-traffic-green">//</span>
          <span className="text-muted-foreground"> Ready to populate your dashboard with the following data:</span>
        </p>

        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
          <div>
            <span className="text-syntax-key">"institution"</span>
            <span className="text-foreground"> : </span>
            <span className="text-syntax-string">"{institutionName}"</span>
          </div>
          <div>
            <span className="text-syntax-key">"campuses"</span>
            <span className="text-foreground"> : </span>
            <span className="text-syntax-number">{campusCount}</span>
          </div>
          <div>
            <span className="text-syntax-key">"faculties"</span>
            <span className="text-foreground"> : </span>
            <span className="text-syntax-number">{facultyCount}</span>
          </div>
          <div>
            <span className="text-syntax-key">"courses"</span>
            <span className="text-foreground"> : </span>
            <span className="text-syntax-number">{courseCount}</span>
          </div>
        </div>
      </div>

      {/* Team Summary Section */}
      <div className="font-mono">
        <p className="text-sm mb-4">
          <span className="text-traffic-green">//</span>
          <span className="text-muted-foreground"> Team invitations to send:</span>
        </p>
        <div className="bg-muted/30 rounded-lg p-4">
          {pendingInvites.length > 0 ? (
            <div className="space-y-2">
              <div>
                <span className="text-syntax-key">"team_invites"</span>
                <span className="text-foreground"> : </span>
                <span className="text-syntax-number">{pendingInvites.length}</span>
              </div>
              {permissionBreakdown.admin > 0 && (
                <div className="pl-4">
                  <span className="text-syntax-key">"full_admin"</span>
                  <span className="text-foreground"> : </span>
                  <span className="text-traffic-red">{permissionBreakdown.admin}</span>
                </div>
              )}
              {permissionBreakdown.standard > 0 && (
                <div className="pl-4">
                  <span className="text-syntax-key">"standard"</span>
                  <span className="text-foreground"> : </span>
                  <span className="text-traffic-green">{permissionBreakdown.standard}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-syntax-comment">
              // No team invites configured (you can add team members later)
            </div>
          )}
        </div>
      </div>

      {/* What happens next - Terminal Style */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
        <p className="font-mono text-sm mb-3">
          <span className="text-traffic-green">//</span>
          <span className="text-muted-foreground"> What happens next:</span>
        </p>
        <ul className="space-y-2 font-mono text-sm">
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span className="text-foreground">
              Your dashboard will be populated with the configured data
            </span>
          </li>
          {pendingInvites.length > 0 && (
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <span className="text-foreground">
                {pendingInvites.length} team invitation{pendingInvites.length !== 1 ? 's' : ''} will be sent
              </span>
            </li>
          )}
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span className="text-foreground">
              You can continue to edit campuses, faculties, and courses anytime
            </span>
          </li>
        </ul>
      </div>

      {/* Loading State */}
      {isSubmitting && (
        <div className="flex items-center justify-center gap-3 py-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="font-mono text-sm text-muted-foreground">
            // Setting up dashboard...
          </span>
        </div>
      )}
    </div>
  )
}

export default InstitutionSetupPage
