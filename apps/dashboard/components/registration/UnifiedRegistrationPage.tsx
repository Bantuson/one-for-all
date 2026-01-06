'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useUser, useAuth } from '@clerk/nextjs'
import { ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react'
import { Stepper } from '@/components/ui/Stepper'
import { CodeCard, CodeCardHeader } from '@/components/ui/CodeCard'
import { CommandButton } from '@/components/ui/CommandButton'
import { Button } from '@/components/ui/Button'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import {
  useUnifiedRegistrationStore,
  selectCanProceed,
  type UnifiedStep,
} from '@/lib/stores/unifiedRegistrationStore'

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

const AuthStep = dynamic(
  () => import('./steps/AuthStep').then((mod) => ({ default: mod.AuthStep })),
  {
    loading: () => <StepLoadingSkeleton />,
    ssr: false,
  }
)

const InstitutionTypeStep = dynamic(
  () => import('./steps/InstitutionTypeStep').then((mod) => ({ default: mod.InstitutionTypeStep })),
  {
    loading: () => <StepLoadingSkeleton />,
    ssr: false,
  }
)

const InstitutionSetupStep = dynamic(
  () => import('./steps/InstitutionSetupStep').then((mod) => ({ default: mod.InstitutionSetupStep })),
  {
    loading: () => <StepLoadingSkeleton />,
    ssr: false,
  }
)

const CustomizeStep = dynamic(
  () => import('./steps/CustomizeStep').then((mod) => ({ default: mod.CustomizeStep })),
  {
    loading: () => <EditorLoadingSkeleton />,
    ssr: false,
  }
)

const TeamStep = dynamic(
  () => import('./steps/TeamStep').then((mod) => ({ default: mod.TeamStep })),
  {
    loading: () => <StepLoadingSkeleton />,
    ssr: false,
  }
)

const ConfirmStep = dynamic(
  () => import('./steps/ConfirmStep').then((mod) => ({ default: mod.ConfirmStep })),
  {
    loading: () => <StepLoadingSkeleton />,
    ssr: false,
  }
)

// ============================================================================
// Constants
// ============================================================================

const STEP_DEFINITIONS = [
  { id: 0, name: 'Auth' },
  { id: 1, name: 'Institution' },
  { id: 2, name: 'Setup' },
  { id: 3, name: 'Customize' },
  { id: 4, name: 'Team' },
  { id: 5, name: 'Confirm' },
]

const STEP_ORDER: UnifiedStep[] = [
  'auth',
  'institution-type',
  'institution-setup',
  'customize',
  'team',
  'confirm',
]

// ============================================================================
// Component
// ============================================================================

export function UnifiedRegistrationPage() {
  const router = useRouter()
  const { user, isLoaded: isClerkLoaded } = useUser()
  const { getToken } = useAuth()

  const {
    currentStep,
    nextStep,
    prevStep,
    isSubmitting,
    error,
    setupMode,
    submitRegistration,
    reset,
    setClerkUserId,
  } = useUnifiedRegistrationStore()

  const canProceed = useUnifiedRegistrationStore(selectCanProceed)

  // Sync fresh Clerk user ID on mount - prevents stale persisted user IDs
  React.useEffect(() => {
    if (isClerkLoaded && user?.id) {
      // Always sync the fresh Clerk user ID from the current session
      setClerkUserId(user.id)
    }
  }, [isClerkLoaded, user?.id, setClerkUserId])

  // Calculate current step index (excluding skipped steps)
  const currentStepIndex = STEP_ORDER.indexOf(currentStep)

  // Handle submission
  const handleSubmit = async () => {
    console.log('[Registration] Submit clicked', { canProceed, isSubmitting })
    if (!canProceed || isSubmitting) return

    const result = await submitRegistration(getToken)
    console.log('[Registration] Submit result:', result)

    if (result?.success) {
      // NOTE: Removed setActive() call - it triggers Clerk's org selection UI
      // The dashboard loads institution via URL slug, not Clerk org context
      // Clerk org is still created for future team features but not activated immediately

      // Redirect to dashboard
      const slug = result.slug || useUnifiedRegistrationStore.getState().institutionData.slug
      router.push(`/dashboard/${slug}?success=registration_complete`)
    }
  }

  // Determine if we should show the stepper (not on auth step)
  const showStepper = currentStep !== 'auth'

  // Determine navigation button labels
  const getContinueLabel = () => {
    switch (currentStep) {
      case 'institution-type':
        return setupMode === 'manual' ? 'Continue to Details' : 'Continue to Templates'
      case 'customize':
        return 'Continue to Team'
      case 'team':
        return 'Continue to Review'
      case 'confirm':
        return null // Submit button instead
      default:
        return 'Continue'
    }
  }

  const continueLabel = getContinueLabel()

  return (
    <div className="flex flex-col flex-1 min-h-screen">
      {/* Dashboard Header */}
      <DashboardHeader
        institution={{
          name: 'One For All',
          slug: 'registration',
        }}
      />

      <div className="container mx-auto pb-8 px-4 pt-8">
        <div className="max-w-5xl mx-auto">
          {/* Description - Comment Style */}
          <div className="mb-8">
            <p className="font-mono text-sm text-center">
              <span className="text-traffic-green">//</span>
              <span className="text-muted-foreground">
                {' '}
                Create your institution account and set up your dashboard
              </span>
            </p>
          </div>

          {/* Progress Stepper - Only show after auth step */}
          {showStepper && (
            <div className="mb-8">
              <Stepper steps={STEP_DEFINITIONS} currentStep={currentStepIndex} />
            </div>
          )}

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
              filename="registration.form"
              status="active"
              badge={
                showStepper ? (
                  <span className="font-mono text-xs text-muted-foreground">
                    step {currentStepIndex + 1}/{STEP_DEFINITIONS.length}
                  </span>
                ) : undefined
              }
            />
            <div className={currentStep === 'customize' ? '' : 'p-6'}>
              {currentStep === 'auth' && <AuthStep />}
              {currentStep === 'institution-type' && <InstitutionTypeStep />}
              {currentStep === 'institution-setup' && <InstitutionSetupStep />}
              {currentStep === 'customize' && <CustomizeStep className="min-h-[500px]" />}
              {currentStep === 'team' && <TeamStep />}
              {currentStep === 'confirm' && <ConfirmStep />}
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
              {/* Skip button for team step */}
              {currentStep === 'team' && (
                <Button variant="outline" onClick={nextStep} disabled={isSubmitting}>
                  Skip Team Invites
                </Button>
              )}

              {/* Continue or Submit button */}
              {currentStep === 'confirm' ? (
                <CommandButton
                  command="submit --registration"
                  variant="primary"
                  size="md"
                  onClick={handleSubmit}
                  disabled={!canProceed || isSubmitting}
                  loading={isSubmitting}
                  className="min-w-[200px]"
                />
              ) : (
                <Button onClick={nextStep} disabled={!canProceed || isSubmitting}>
                  {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {continueLabel}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UnifiedRegistrationPage
