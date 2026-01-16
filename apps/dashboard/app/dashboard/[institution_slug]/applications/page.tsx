'use client'

import * as React from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  MoveLeft,
  FileText,
  ChevronDown,
  AlertCircle,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/Skeleton'
import { ApplicationCard } from '@/components/applications/ApplicationCard'
import { ApplicationDetailModal } from '@/components/modals/ApplicationDetailModal'
import { AgentActivityButton, AgentInstructionModal } from '@/components/agents'
import { useAgentStore } from '@/lib/stores/agentStore'
import {
  type Application,
  type ApplicationRow,
  type ApplicationChoiceApiResponse,
  type ChoiceStatus,
  transformApiResponseToApplicationRow,
} from '@/lib/types/applications'
import { cn } from '@/lib/utils'
import type { AgentType } from '@/components/agents/AgentInstructionModal'

// ============================================================================
// Types
// ============================================================================

type StatusFilter = 'all' | 'documents_flagged' | ChoiceStatus

// ============================================================================
// Status Filter Options
// ============================================================================

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'conditionally_accepted', label: 'Conditional' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'waitlisted', label: 'Waitlisted' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'documents_flagged', label: 'Documents Flagged' },
]

// ============================================================================
// Applications Page Skeleton
// ============================================================================

function ApplicationsPageSkeleton() {
  return (
    <div className="relative">
      {/* Back arrow placeholder */}
      <div className="absolute left-5 top-[8px]">
        <Skeleton className="h-6 w-6 rounded" />
      </div>

      {/* Header - badge and dropdown on the right */}
      <div className="max-w-[85%] mx-auto mt-[20px] flex items-center justify-end gap-3">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-5 w-24" />
      </div>

      {/* Card Grid - 8 card placeholders for 4-column grid */}
      <div className="max-w-[85%] mx-auto mt-[34px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="h-[260px] rounded-lg border border-border bg-card overflow-hidden flex flex-col"
            >
              {/* Card header skeleton */}
              <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-5 w-16 rounded" />
              </div>

              {/* Card body skeleton */}
              <div className="p-4 flex-1 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-40" />
                <div className="mt-auto pt-4">
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>

              {/* Card footer skeleton */}
              <div className="px-3 py-1.5 border-t border-border bg-muted/30 flex justify-end">
                <Skeleton className="h-7 w-7 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export default function ApplicationsPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const institutionSlug = params.institution_slug as string
  const courseFilter = searchParams.get('course')

  // Debug: Log the slug and course filter from params
  console.log('[Applications] institutionSlug:', institutionSlug, 'courseFilter:', courseFilter)

  // State
  const [applications, setApplications] = React.useState<ApplicationRow[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [institutionId, setInstitutionId] = React.useState<string | null>(null)

  // Filter state
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>('all')
  const [showStatusDropdown, setShowStatusDropdown] = React.useState(false)

  // Modal state
  const [selectedApplication, setSelectedApplication] = React.useState<Application | null>(null)

  // Agent modal state
  const [isAgentModalOpen, setIsAgentModalOpen] = React.useState(false)

  // Agent store
  const { sessions, isLoadingSessions, fetchSessions, createSession } = useAgentStore()
  const activeCount = sessions.filter((s) => s.status === 'running').length

  // Refs
  const statusDropdownRef = React.useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node)
      ) {
        setShowStatusDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch institution ID first
  React.useEffect(() => {
    async function fetchInstitution() {
      try {
        console.log('[Applications] Fetching institution for slug:', institutionSlug)
        const response = await fetch(`/api/institutions/by-slug/${institutionSlug}`)
        if (!response.ok) throw new Error('Failed to fetch institution')
        const data = await response.json()
        console.log('[Applications] Institution data:', data)
        setInstitutionId(data.id)
      } catch (err) {
        console.error('Failed to fetch institution:', err)
        setError('Failed to load institution')
        setIsLoading(false)
      }
    }

    if (institutionSlug) {
      fetchInstitution()
    } else {
      console.warn('[Applications] No institutionSlug available, skipping fetch')
      setError('Invalid institution URL')
      setIsLoading(false)
    }
  }, [institutionSlug])

  // Fetch agent sessions when institution is loaded
  React.useEffect(() => {
    if (institutionId) {
      fetchSessions(institutionId)
    }
  }, [institutionId, fetchSessions])

  // Fetch applications
  const fetchApplications = React.useCallback(async () => {
    if (!institutionId) return

    try {
      setIsLoading(true)
      setError(null)

      // Build URL with optional course filter
      const url = courseFilter
        ? `/api/institutions/${institutionId}/applications?course=${courseFilter}`
        : `/api/institutions/${institutionId}/applications`

      console.log('[Applications] Fetching applications for institution:', institutionId, 'course:', courseFilter)
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch applications')

      const data = await response.json()
      console.log('[Applications] Applications API response:', data)

      // Transform API response (camelCase nested) to ApplicationRow format (snake_case flat)
      const transformedApplications = (data.applications || []).map(
        (item: ApplicationChoiceApiResponse) => transformApiResponseToApplicationRow(item)
      )
      console.log('[Applications] Transformed applications:', transformedApplications.length, transformedApplications)

      setApplications(transformedApplications)
    } catch (err) {
      console.error('Failed to fetch applications:', err)
      setError('Failed to load applications')
    } finally {
      setIsLoading(false)
    }
  }, [institutionId, courseFilter])

  React.useEffect(() => {
    console.log('[Applications] useEffect triggered - institutionId:', institutionId)
    if (institutionId) {
      fetchApplications()
    }
  }, [institutionId, fetchApplications])

  // Filter applications
  const filteredApplications = React.useMemo(() => {
    return applications.filter((app) => {
      // Documents flagged filter - check if any document has review_status = 'flagged'
      if (statusFilter === 'documents_flagged') {
        const hasFlaggedDocuments = app.documents?.some(doc => doc.review_status === 'flagged')
        if (!hasFlaggedDocuments) return false
      }
      // Status filter
      else if (statusFilter !== 'all') {
        const appStatus = (app.choice_status || app.status) as ChoiceStatus
        if (appStatus !== statusFilter) return false
      }
      return true
    })
  }, [applications, statusFilter])

  // Get current status filter label
  const currentStatusLabel =
    STATUS_OPTIONS.find((opt) => opt.value === statusFilter)?.label || 'All Statuses'

  // Handler for agent modal submit
  const handleAgentSubmit = React.useCallback(
    async (agentType: AgentType, instructions: string) => {
      if (institutionId) {
        await createSession(institutionId, agentType, instructions)
      }
    },
    [institutionId, createSession]
  )

  // Loading state
  if (isLoading) {
    return <ApplicationsPageSkeleton />
  }

  return (
    <div className="relative pb-8">
      {/* Back arrow */}
      <Link
        href={`/dashboard/${institutionSlug}`}
        className="absolute left-5 top-[8px] text-traffic-red hover:text-traffic-red/80 transition-colors"
        title="Back to dashboard"
        aria-label="Back to dashboard"
      >
        <MoveLeft className="h-[22px] w-[22px]" />
      </Link>

      {/* Header - Agent button, count, and status filter on the right */}
      <div className="max-w-[85%] mx-auto mt-[20px] flex items-center justify-end gap-2 translate-y-[4px]">
        {/* Agent Sandbox Button */}
        <AgentActivityButton
          activeCount={activeCount}
          isLoading={isLoadingSessions}
          onClick={() => setIsAgentModalOpen(true)}
        />

        {/* Application count */}
        <span className="text-sm font-mono text-traffic-green">
          {filteredApplications.length}
        </span>

        {/* Status filter dropdown */}
        <div className="relative" ref={statusDropdownRef}>
          <button
            type="button"
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className="flex items-center gap-1 font-mono text-sm text-muted-foreground hover:text-foreground transition-colors"
            aria-expanded={showStatusDropdown}
            aria-haspopup="listbox"
            aria-label="Filter by status"
          >
            <span>{currentStatusLabel}</span>
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                showStatusDropdown && 'rotate-180'
              )}
            />
          </button>

          {showStatusDropdown && (
            <ul
              role="listbox"
              className="absolute right-0 top-full mt-1 w-48 py-1 border border-border rounded-md bg-card shadow-lg z-10"
            >
              {STATUS_OPTIONS.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={statusFilter === option.value}
                    onClick={() => {
                      setStatusFilter(option.value)
                      setShowStatusDropdown(false)
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 font-mono text-sm hover:bg-muted/50 transition-colors',
                      statusFilter === option.value && 'bg-muted text-traffic-green'
                    )}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="max-w-[85%] mx-auto mt-4 p-4 border border-traffic-red/50 bg-traffic-red/5 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-traffic-red flex-shrink-0 mt-0.5" />
            <p className="text-sm font-mono text-foreground">{error}</p>
          </div>
        </div>
      )}

      {/* Applications Card Grid */}
      <div className="max-w-[85%] mx-auto mt-[34px]">
        {filteredApplications.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-mono">
              <span className="text-traffic-green">//</span>{' '}
              {statusFilter !== 'all'
                ? 'No applications match your filter'
                : 'No applications yet'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredApplications.map((app) => (
              <ApplicationCard
                key={app.id}
                application={app}
                onClick={() => setSelectedApplication(app as unknown as Application)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Application Detail Modal */}
      <ApplicationDetailModal
        application={selectedApplication}
        isOpen={!!selectedApplication}
        onClose={() => setSelectedApplication(null)}
      />

      {/* Agent Instruction Modal */}
      {institutionId && (
        <AgentInstructionModal
          isOpen={isAgentModalOpen}
          onClose={() => setIsAgentModalOpen(false)}
          institutionId={institutionId}
          courseId={courseFilter || undefined}
          recentSessions={sessions.slice(0, 5)}
          isLoadingSessions={isLoadingSessions}
          onSubmit={handleAgentSubmit}
        />
      )}
    </div>
  )
}
