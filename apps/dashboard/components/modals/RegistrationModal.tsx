'use client'

import { Dialog, DialogContent } from '@/components/ui/Dialog'
import { ModalHeader } from '@/components/ui/ModalHeader'
import { Stepper, type Step } from '@/components/ui/Stepper'
import { useRegistrationStore } from '@/lib/stores/registrationStore'
import { ClerkSignUp } from '@/components/auth/RegistrationSteps/ClerkSignUp'
import { UserTypeSelection } from '@/components/auth/RegistrationSteps/UserTypeSelection'
import { InstitutionTypeSelection } from '@/components/auth/RegistrationSteps/InstitutionTypeSelection'
import { InstitutionDetails } from '@/components/auth/RegistrationSteps/InstitutionDetails'
import { ReviewSubmit } from '@/components/auth/RegistrationSteps/ReviewSubmit'
import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

interface RegistrationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RegistrationModal({ open, onOpenChange }: RegistrationModalProps) {
  const { currentStep, userType, reset } = useRegistrationStore()
  const { isSignedIn } = useUser()
  const [checkingInstitutions, setCheckingInstitutions] = useState(false)
  const router = useRouter()

  // Database-first check: If user is signed in when modal opens, check for existing institutions
  useEffect(() => {
    async function checkExistingInstitutions() {
      if (open && isSignedIn && !checkingInstitutions) {
        setCheckingInstitutions(true)
        try {
          const response = await fetch('/api/institutions')

          // Only proceed if request was successful
          if (!response.ok) {
            console.error('Failed to fetch institutions:', response.status)
            return
          }

          const data = await response.json()

          if (data.institutions && data.institutions.length > 0) {
            // User already has institutions, close modal and redirect
            onOpenChange(false)
            router.push(`/dashboard/${data.institutions[0].slug}`)
          }
        } catch (error) {
          console.error('Error checking institutions:', error)
          // Don't block the user from proceeding with registration
          // Just log the error and continue
        } finally {
          setCheckingInstitutions(false)
        }
      }
    }

    checkExistingInstitutions()
  }, [open, isSignedIn, onOpenChange, router, checkingInstitutions])

  // Reset store when modal closes
  useEffect(() => {
    if (!open) {
      reset()
    }
  }, [open, reset])

  const steps: Step[] =
    userType === 'institution'
      ? [
          { id: 2, name: 'User Type' },
          { id: 3, name: 'Institution Type' },
          { id: 4, name: 'Details' },
          { id: 5, name: 'Review' },
        ]
      : [
          { id: 2, name: 'User Type' },
          { id: 3, name: 'Personal Details' },
          { id: 4, name: 'Review' },
        ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" hideCloseButton>
        <ModalHeader title="Create Your Account" onClose={() => onOpenChange(false)} />

        <div className="px-8 py-4">
          {/* Show stepper only after authentication step (step 2+) */}
          {currentStep > 1 && userType && (
            <Stepper steps={steps} currentStep={currentStep} className="mb-6" />
          )}

          <div>
            {currentStep === 1 && <ClerkSignUp />}
            {currentStep === 2 && <UserTypeSelection />}
            {currentStep === 3 && userType === 'institution' && <InstitutionTypeSelection />}
            {currentStep === 4 && userType === 'institution' && <InstitutionDetails />}
            {currentStep === 5 && userType === 'institution' && <ReviewSubmit />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
