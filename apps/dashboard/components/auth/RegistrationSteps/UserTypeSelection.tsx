'use client'

import { useRegistrationStore } from '@/lib/stores/registrationStore'
import { Building2 } from 'lucide-react'

export function UserTypeSelection() {
  const { setUserType, nextStep } = useRegistrationStore()

  const handleSelection = () => {
    setUserType('institution')
    nextStep()
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Register Your Institution</h3>
        <p className="text-sm text-foreground/60">
          This portal is for universities, colleges, and bursary providers only
        </p>
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleSelection}
          className="group relative flex flex-col items-center gap-4 rounded-lg border-2 border-border bg-background p-8 transition-all hover:border-foreground hover:shadow-lg max-w-md w-full"
        >
          <Building2 className="h-12 w-12 text-foreground/60 transition-colors group-hover:text-foreground" />
          <div className="text-center">
            <h4 className="font-semibold text-lg mb-1">Institution</h4>
            <p className="text-sm text-foreground/60">
              Register your university, college, or bursary program
            </p>
          </div>
        </button>
      </div>
    </div>
  )
}
