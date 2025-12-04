'use client'

import { useRegistrationStore, type InstitutionType } from '@/lib/stores/registrationStore'
import { GraduationCap, School, Banknote, Award } from 'lucide-react'

const institutionTypes = [
  {
    type: 'university' as const,
    icon: GraduationCap,
    title: 'University',
    description: 'Public or private university institution',
  },
  {
    type: 'college' as const,
    icon: School,
    title: 'College',
    description: 'Private college or vocational institution',
  },
  {
    type: 'nsfas' as const,
    icon: Banknote,
    title: 'NSFAS',
    description: 'National Student Financial Aid Scheme',
  },
  {
    type: 'bursary_provider' as const,
    icon: Award,
    title: 'Bursary Provider',
    description: 'Corporate or private bursary program',
  },
]

// Note: Applicants use WhatsApp agents for applications, not this registration portal

export function InstitutionTypeSelection() {
  const { setInstitutionType, nextStep, prevStep } = useRegistrationStore()

  const handleSelection = (type: InstitutionType) => {
    setInstitutionType(type)
    nextStep()
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">Institution Type</h3>
        <p className="text-sm text-foreground/60">
          Select the type of institution you represent
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {institutionTypes.map(({ type, icon: Icon, title, description }) => (
          <button
            key={type}
            onClick={() => handleSelection(type)}
            className="group relative flex flex-col items-center gap-4 rounded-lg border-2 border-border bg-background p-6 transition-all hover:border-foreground hover:shadow-lg"
          >
            <Icon className="h-10 w-10 text-foreground/60 transition-colors group-hover:text-foreground" />
            <div className="text-center">
              <h4 className="font-semibold mb-1">{title}</h4>
              <p className="text-sm text-foreground/60">{description}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-start">
        <button
          onClick={prevStep}
          className="text-sm text-foreground/60 hover:text-foreground transition-colors"
        >
          ← Back
        </button>
      </div>
    </div>
  )
}
