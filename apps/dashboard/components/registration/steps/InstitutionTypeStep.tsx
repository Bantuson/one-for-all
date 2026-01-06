'use client'

import { useUnifiedRegistrationStore, type InstitutionType } from '@/lib/stores/unifiedRegistrationStore'
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

export function InstitutionTypeStep() {
  const { setInstitutionType, setUserType, nextStep, prevStep } = useUnifiedRegistrationStore()

  const handleSelection = (type: InstitutionType) => {
    setInstitutionType(type)
    setUserType('institution') // Mark user as institution registrant
    nextStep()
  }

  return (
    <div className="space-y-6 py-8">
      <div className="text-center font-mono">
        <h3 className="text-lg font-semibold mb-2">
          <span className="text-syntax-export">const</span>
          <span className="text-syntax-key ml-2">institutionType</span>
          <span className="text-foreground"> =</span>
        </h3>
        <p className="text-sm text-muted-foreground">
          <span className="text-traffic-green">//</span> Select the type of institution you represent
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {institutionTypes.map(({ type, icon: Icon, title, description }) => (
          <button
            key={type}
            onClick={() => handleSelection(type)}
            className="group relative flex flex-col items-center gap-4 rounded-lg border-2 border-border bg-card p-6 transition-all hover:border-foreground hover:shadow-lg font-mono"
          >
            <Icon className="h-10 w-10 text-foreground/60 transition-colors group-hover:text-foreground" />
            <div className="text-center">
              <h4 className="font-semibold mb-1">
                <span className="text-syntax-string">"{type}"</span>
              </h4>
              <p className="text-sm text-muted-foreground">
                <span className="text-traffic-green">//</span> {description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
