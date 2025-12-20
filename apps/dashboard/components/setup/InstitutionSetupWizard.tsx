'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Check, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  VisuallyHidden,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import {
  useSetupStore,
  selectCanProceed,
  selectStepTitle,
  selectCampusCount,
} from '@/lib/stores/setupStore'
import { InstitutionSelector } from './InstitutionSelector'
import { InstitutionPreview } from './InstitutionPreview'
import { SetupEditor } from './SetupEditor'

// ============================================================================
// Types
// ============================================================================

interface InstitutionSetupWizardProps {
  institutionId: string
  onComplete?: () => void
}

// ============================================================================
// Constants
// ============================================================================

const STEP_LABELS = {
  select: 'Select Institution',
  preview: 'Review Data',
  edit: 'Customize',
  confirm: 'Confirm',
}

// ============================================================================
// Component
// ============================================================================

export function InstitutionSetupWizard({
  institutionId,
  onComplete,
}: InstitutionSetupWizardProps) {
  const router = useRouter()
  const {
    isOpen,
    currentStep,
    mode,
    closeWizard,
    nextStep,
    prevStep,
    submitSetup,
    isSubmitting,
    error,
    institutionData,
    manualInstitutionName,
  } = useSetupStore()

  const canProceed = useSetupStore(selectCanProceed)
  const stepTitle = useSetupStore(selectStepTitle)
  const campusCount = useSetupStore(selectCampusCount)

  const handleSubmit = async () => {
    const success = await submitSetup(institutionId)
    if (success) {
      closeWizard()
      onComplete?.()
      router.refresh()
    }
  }

  const steps: readonly string[] = mode === 'manual'
    ? ['select', 'edit', 'confirm']
    : ['select', 'preview', 'edit', 'confirm']

  const currentStepIndex = steps.indexOf(currentStep)
  const totalSteps = steps.length

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeWizard()}>
      <DialogContent
        className={cn(
          'p-0 gap-0',
          currentStep === 'edit' ? 'max-w-6xl h-[80vh]' : 'max-w-2xl max-h-[80vh]'
        )}
        hideCloseButton
      >
        {/* Accessibility */}
        <VisuallyHidden>
          <DialogTitle>{stepTitle}</DialogTitle>
          <DialogDescription>
            Step {currentStepIndex + 1} of {totalSteps}: {stepTitle}
          </DialogDescription>
        </VisuallyHidden>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold text-lg text-foreground">{stepTitle}</h2>
            {mode === 'preconfigured' && institutionData && (
              <span className="text-sm text-muted-foreground">
                — {institutionData.name}
              </span>
            )}
            {mode === 'manual' && manualInstitutionName && (
              <span className="text-sm text-muted-foreground">
                — {manualInstitutionName}
              </span>
            )}
          </div>
          <StepIndicator
            steps={steps as unknown as string[]}
            currentStep={currentStep}
          />
        </div>

        {/* Content */}
        <div className={cn(
          'overflow-y-auto',
          currentStep === 'edit' ? 'flex-1' : 'p-6'
        )}>
          {currentStep === 'select' && <InstitutionSelector />}
          {currentStep === 'preview' && <InstitutionPreview />}
          {currentStep === 'edit' && <SetupEditor className="h-full" />}
          {currentStep === 'confirm' && (
            <ConfirmStep
              institutionName={
                mode === 'manual'
                  ? manualInstitutionName
                  : institutionData?.name || ''
              }
              campusCount={campusCount}
              error={error}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/20">
          <div>
            {currentStepIndex > 0 && (
              <Button variant="ghost" onClick={prevStep} disabled={isSubmitting}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={closeWizard} disabled={isSubmitting}>
              Cancel
            </Button>

            {currentStep === 'confirm' ? (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Complete Setup
                  </>
                )}
              </Button>
            ) : (
              <Button onClick={nextStep} disabled={!canProceed}>
                {currentStep === 'edit' ? 'Review & Confirm' : 'Continue'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

interface StepIndicatorProps {
  steps: string[]
  currentStep: string
}

function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  const currentIndex = steps.indexOf(currentStep)

  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex

        return (
          <React.Fragment key={step}>
            <div
              className={cn(
                'flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium transition-colors',
                isCompleted && 'bg-primary text-primary-foreground',
                isCurrent && 'bg-primary text-primary-foreground ring-2 ring-primary/30',
                !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
              )}
            >
              {isCompleted ? (
                <Check className="h-3 w-3" />
              ) : (
                index + 1
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'w-8 h-0.5 transition-colors',
                  index < currentIndex ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

interface ConfirmStepProps {
  institutionName: string
  campusCount: number
  error: string | null
}

function ConfirmStep({ institutionName, campusCount, error }: ConfirmStepProps) {
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

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="font-semibold text-lg text-foreground mb-4">
          Setup Summary
        </h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Institution</span>
            <span className="font-medium text-foreground">{institutionName}</span>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold text-primary">{campusCount}</p>
              <p className="text-sm text-muted-foreground">Campuses</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold text-primary">{facultyCount}</p>
              <p className="text-sm text-muted-foreground">Faculties</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold text-primary">{courseCount}</p>
              <p className="text-sm text-muted-foreground">Courses</p>
            </div>
          </div>
        </div>
      </div>

      {/* What happens next */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
        <h4 className="font-medium text-primary mb-3">What happens next?</h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span>Your dashboard will be populated with the configured data</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span>You can continue to edit campuses, faculties, and courses anytime</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span>Invite team members and set up roles & permissions</span>
          </li>
        </ul>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Hook for opening the wizard
// ============================================================================

export function useInstitutionSetupWizard() {
  const { openWizard, reset } = useSetupStore()

  const open = React.useCallback(() => {
    reset()
    openWizard()
  }, [reset, openWizard])

  return { open }
}

export default InstitutionSetupWizard
