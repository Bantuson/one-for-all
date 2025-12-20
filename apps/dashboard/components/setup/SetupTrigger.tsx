'use client'

import { CommandButton } from '@/components/ui/CommandButton'
import {
  InstitutionSetupWizard,
  useInstitutionSetupWizard,
} from './InstitutionSetupWizard'

interface SetupTriggerProps {
  institutionId: string
}

export function SetupTrigger({ institutionId }: SetupTriggerProps) {
  const { open } = useInstitutionSetupWizard()

  return (
    <>
      <CommandButton
        command="setup --dashboard"
        variant="primary"
        size="md"
        onClick={open}
        className="w-full sm:w-auto justify-center"
      />
      <InstitutionSetupWizard institutionId={institutionId} />
    </>
  )
}

export default SetupTrigger
