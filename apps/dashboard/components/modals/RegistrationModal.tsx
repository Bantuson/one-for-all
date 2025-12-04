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
import { useEffect } from 'react'

interface RegistrationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RegistrationModal({ open, onOpenChange }: RegistrationModalProps) {
  const { currentStep, userType, reset } = useRegistrationStore()

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
