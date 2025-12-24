'use client'

import * as React from 'react'
import { Search, Building2, GraduationCap, MapPin, ChevronRight, Terminal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/Input'
import {
  getInstitutionList,
  getInstitutionsGroupedByType,
  searchInstitutions,
  type InstitutionListItem,
  type InstitutionType,
} from '@/lib/institutions'
import { useSetupStore } from '@/lib/stores/setupStore'

// ============================================================================
// Types
// ============================================================================

interface InstitutionSelectorProps {
  onSelect?: (institutionId: string | null) => void
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

const TYPE_LABELS: Record<InstitutionType, string> = {
  university: 'Universities',
  college: 'Colleges & Private Institutions',
  nsfas: 'NSFAS',
  bursary_provider: 'Bursary Providers',
}

const TYPE_ICONS: Record<InstitutionType, typeof Building2> = {
  university: GraduationCap,
  college: Building2,
  nsfas: Building2,
  bursary_provider: Building2,
}

// ============================================================================
// Component
// ============================================================================

export function InstitutionSelector({
  onSelect,
  className,
}: InstitutionSelectorProps) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [hoveredId, setHoveredId] = React.useState<string | null>(null)

  const {
    selectedInstitutionId,
    selectInstitution,
    mode,
    setMode,
    manualInstitutionName,
    setManualInstitutionName,
  } = useSetupStore()

  // Get filtered results based on search
  const filteredResults = React.useMemo(() => {
    if (searchQuery.trim()) {
      return searchInstitutions(searchQuery)
    }
    return null // null means show grouped view
  }, [searchQuery])

  // Grouped institutions for default view
  const groupedInstitutions = React.useMemo(() => {
    return getInstitutionsGroupedByType()
  }, [])

  const handleSelect = React.useCallback(
    (id: string | null) => {
      selectInstitution(id)
      onSelect?.(id)
    },
    [selectInstitution, onSelect]
  )

  const handleManualMode = React.useCallback(() => {
    setMode('manual')
    handleSelect(null)
  }, [setMode, handleSelect])

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Terminal-style header comment */}
      <p className="font-mono text-sm">
        <span className="text-traffic-green">//</span>
        <span className="text-muted-foreground"> Choose from 27 pre-configured South African institutions</span>
      </p>

      {/* Search Input - Terminal Style */}
      <div className="relative">
        <Terminal className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-syntax-export" />
        <Input
          type="text"
          placeholder="$ search --institution"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 font-mono"
        />
      </div>

      {/* Institution List */}
      <div className="max-h-[400px] overflow-y-auto rounded-lg border border-border bg-card">
        {filteredResults ? (
          // Search Results View
          <div className="divide-y divide-border">
            {filteredResults.length === 0 ? (
              <div className="p-6 text-center font-mono">
                <Building2 className="mx-auto mb-2 h-8 w-8 text-muted-foreground opacity-50" />
                <p className="text-sm">
                  <span className="text-traffic-green">//</span>
                  <span className="text-muted-foreground"> No institutions found for "{searchQuery}"</span>
                </p>
                <button
                  onClick={handleManualMode}
                  className="mt-3 text-sm text-primary hover:underline font-mono"
                >
                  $ setup --manual
                </button>
              </div>
            ) : (
              filteredResults.map((institution) => (
                <InstitutionItem
                  key={institution.id}
                  institution={institution}
                  isSelected={selectedInstitutionId === institution.id}
                  isHovered={hoveredId === institution.id}
                  onSelect={() => handleSelect(institution.id)}
                  onHover={(hovered) =>
                    setHoveredId(hovered ? institution.id : null)
                  }
                />
              ))
            )}
          </div>
        ) : (
          // Grouped View
          <div className="divide-y divide-border">
            {/* Manual Entry Option */}
            <button
              onClick={handleManualMode}
              className={cn(
                'flex w-full items-center gap-3 p-4 text-left transition-colors',
                'hover:bg-muted/50',
                mode === 'manual' && 'bg-primary/5 border-l-2 border-l-primary'
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Terminal className="h-5 w-5 text-syntax-export" />
              </div>
              <div className="flex-1 font-mono">
                <p className="font-medium text-foreground">
                  <span className="text-syntax-key">Other</span>
                  <span className="text-traffic-green"> //</span>
                  <span className="text-muted-foreground"> Not listed</span>
                </p>
                <p className="text-sm text-syntax-comment">
                  $ setup --manual --institution
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            {/* Manual Institution Name Input (shown when manual mode selected) */}
            {mode === 'manual' && (
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4 mx-4 mb-2 font-mono">
                <label className="text-sm text-syntax-key">
                  "institutionName"
                </label>
                <Input
                  type="text"
                  placeholder="Enter your institution's name"
                  value={manualInstitutionName}
                  onChange={(e) => setManualInstitutionName(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs">
                  <span className="text-traffic-green">//</span>
                  <span className="text-muted-foreground"> You'll add campuses, faculties, and courses in the next step</span>
                </p>
              </div>
            )}

            {/* Institution Groups */}
            {(Object.entries(groupedInstitutions) as [InstitutionType, InstitutionListItem[]][])
              .filter(([, institutions]) => institutions.length > 0)
              .map(([type, institutions]) => {
                const Icon = TYPE_ICONS[type]
                return (
                  <div key={type}>
                    {/* Group Header */}
                    <div className="sticky top-0 z-10 flex items-center gap-2 bg-muted/80 backdrop-blur-sm px-4 py-2 font-mono">
                      <Icon className="h-4 w-4 text-syntax-export" />
                      <span className="text-sm text-syntax-key">
                        {TYPE_LABELS[type]}
                      </span>
                      <span className="text-xs">
                        <span className="text-traffic-green">//</span>
                        <span className="text-muted-foreground"> {institutions.length} available</span>
                      </span>
                    </div>

                    {/* Group Items */}
                    <div className="divide-y divide-border/50">
                      {institutions.map((institution) => (
                        <InstitutionItem
                          key={institution.id}
                          institution={institution}
                          isSelected={selectedInstitutionId === institution.id}
                          isHovered={hoveredId === institution.id}
                          onSelect={() => handleSelect(institution.id)}
                          onHover={(hovered) =>
                            setHoveredId(hovered ? institution.id : null)
                          }
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>

    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

interface InstitutionItemProps {
  institution: InstitutionListItem
  isSelected: boolean
  isHovered: boolean
  onSelect: () => void
  onHover: (hovered: boolean) => void
}

function InstitutionItem({
  institution,
  isSelected,
  isHovered,
  onSelect,
  onHover,
}: InstitutionItemProps) {
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={cn(
        'flex w-full items-center gap-3 p-4 text-left transition-colors',
        'hover:bg-muted/50',
        isSelected && 'bg-primary/5 border-l-2 border-l-primary',
        isHovered && !isSelected && 'bg-muted/30'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg',
          isSelected ? 'bg-primary/10' : 'bg-muted'
        )}
      >
        <GraduationCap
          className={cn(
            'h-5 w-5',
            isSelected ? 'text-primary' : 'text-muted-foreground'
          )}
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 font-mono">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              'font-medium truncate',
              isSelected ? 'text-primary' : 'text-foreground'
            )}
          >
            {institution.name}
          </p>
          {institution.shortName !== institution.name && (
            <span className="text-xs text-syntax-comment">
              ({institution.shortName})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-syntax-comment">
          <MapPin className="h-3 w-3" />
          <span className="truncate">
            {institution.city}, {institution.province}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-4 text-xs font-mono">
        <span>
          <span className="text-syntax-number">{institution.stats.totalCampuses}</span>
          <span className="text-syntax-comment"> campuses</span>
        </span>
        <span>
          <span className="text-syntax-number">{institution.stats.totalCourses}</span>
          <span className="text-syntax-comment"> courses</span>
        </span>
      </div>

      {/* Selection Indicator */}
      <ChevronRight
        className={cn(
          'h-4 w-4 transition-transform',
          isSelected ? 'text-primary' : 'text-muted-foreground',
          (isSelected || isHovered) && 'translate-x-1'
        )}
      />
    </button>
  )
}

export default InstitutionSelector
