'use client'

import * as React from 'react'
import { Bot, FileSearch, Calculator, HelpCircle, BarChart3, Send, Loader2, Clock } from 'lucide-react'
import { DottedModal, DottedModalContent, DottedModalFooter } from '@/components/ui/DottedModal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export type AgentType =
  | 'document_reviewer'
  | 'aps_ranking'
  | 'reviewer_assistant'
  | 'analytics'
  | 'notification_sender'

export interface AgentSession {
  id: string
  agentType: AgentType
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  processedItems: number
  totalItems: number
  createdAt: string
}

interface AgentInstructionModalProps {
  isOpen: boolean
  onClose: () => void
  institutionId: string
  recentSessions?: AgentSession[]
  isLoadingSessions?: boolean
  onSubmit: (agentType: AgentType, instructions: string) => Promise<void>
}

// ============================================================================
// Agent Type Configuration
// ============================================================================

const AGENT_TYPES: Array<{
  type: AgentType
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}> = [
  {
    type: 'document_reviewer',
    label: 'Document Reviewer',
    description: 'Review and verify uploaded documents',
    icon: FileSearch,
    color: 'text-traffic-green',
  },
  {
    type: 'aps_ranking',
    label: 'APS Calculator',
    description: 'Calculate admission point scores',
    icon: Calculator,
    color: 'text-blue-500',
  },
  {
    type: 'reviewer_assistant',
    label: 'Review Assistant',
    description: 'Help with application review decisions',
    icon: HelpCircle,
    color: 'text-yellow-500',
  },
  {
    type: 'analytics',
    label: 'Analytics Agent',
    description: 'Generate insights and visualizations',
    icon: BarChart3,
    color: 'text-purple-500',
  },
]

// ============================================================================
// Session Status Badge
// ============================================================================

function SessionStatusBadge({ status }: { status: AgentSession['status'] }) {
  const config = {
    pending: { label: 'Pending', color: 'bg-muted text-muted-foreground' },
    running: { label: 'Running', color: 'bg-blue-500/10 text-blue-500' },
    completed: { label: 'Done', color: 'bg-traffic-green/10 text-traffic-green' },
    failed: { label: 'Failed', color: 'bg-traffic-red/10 text-traffic-red' },
    cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground' },
  }

  const { label, color } = config[status]

  return (
    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', color)}>
      {label}
    </span>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function AgentInstructionModal({
  isOpen,
  onClose,
  institutionId,
  recentSessions = [],
  isLoadingSessions = false,
  onSubmit,
}: AgentInstructionModalProps) {
  const [selectedAgent, setSelectedAgent] = React.useState<AgentType | null>(null)
  const [instructions, setInstructions] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedAgent(null)
      setInstructions('')
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!selectedAgent) return

    setIsSubmitting(true)
    try {
      await onSubmit(selectedAgent, instructions)
      onClose()
    } catch (error) {
      console.error('Failed to start agent:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter running sessions for badge display
  const runningSessions = recentSessions.filter((s) => s.status === 'running')

  return (
    <DottedModal
      isOpen={isOpen}
      onClose={onClose}
      title="agentSandbox"
      className="max-w-lg"
      headerExtra={
        runningSessions.length > 0 ? (
          <span className="text-xs font-mono text-traffic-green">
            {runningSessions.length} running
          </span>
        ) : undefined
      }
    >
      <DottedModalContent className="space-y-6">
        {/* Agent Type Selection */}
        <section>
          <h3 className="text-xs font-mono font-bold text-syntax-key uppercase tracking-wide mb-3">
            Select Agent
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {AGENT_TYPES.map(({ type, label, description, icon: Icon, color }) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedAgent(type)}
                className={cn(
                  'flex flex-col items-start p-3 rounded-lg border transition-all text-left',
                  selectedAgent === type
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={cn('h-4 w-4', color)} />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <span className="text-xs text-muted-foreground">{description}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Instructions Input */}
        {selectedAgent && (
          <section>
            <h3 className="text-xs font-mono font-bold text-syntax-key uppercase tracking-wide mb-3">
              Instructions
              <span className="font-normal text-muted-foreground ml-2">(optional)</span>
            </h3>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder={getPlaceholder(selectedAgent)}
              rows={3}
              className={cn(
                'w-full px-3 py-2 rounded-md',
                'bg-muted/30 border border-border',
                'text-sm font-mono text-foreground',
                'placeholder:text-muted-foreground/50',
                'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
                'resize-none'
              )}
            />
          </section>
        )}

        {/* Recent Sessions */}
        <section>
          <h3 className="text-xs font-mono font-bold text-syntax-key uppercase tracking-wide mb-3">
            Recent Sessions
          </h3>
          {isLoadingSessions ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : recentSessions.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-2">
              No recent agent sessions
            </p>
          ) : (
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {recentSessions.slice(0, 5).map((session) => {
                const agentConfig = AGENT_TYPES.find((a) => a.type === session.agentType)
                const Icon = agentConfig?.icon || Bot

                return (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/20 border border-border/50"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={cn('h-3.5 w-3.5', agentConfig?.color || 'text-muted-foreground')} />
                      <span className="text-xs font-mono">
                        {agentConfig?.label || session.agentType}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {session.status === 'running' && (
                        <span className="text-[10px] text-muted-foreground">
                          {session.processedItems}/{session.totalItems}
                        </span>
                      )}
                      <SessionStatusBadge status={session.status} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </DottedModalContent>

      <DottedModalFooter>
        <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!selectedAgent || isSubmitting}
          className="gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              Run Agent
            </>
          )}
        </Button>
      </DottedModalFooter>
    </DottedModal>
  )
}

// ============================================================================
// Helpers
// ============================================================================

function getPlaceholder(agentType: AgentType): string {
  switch (agentType) {
    case 'document_reviewer':
      return 'Review all pending documents for missing signatures...'
    case 'aps_ranking':
      return 'Calculate APS scores for all new applications...'
    case 'reviewer_assistant':
      return 'Help identify applications that need attention...'
    case 'analytics':
      return 'Generate acceptance rate breakdown by faculty...'
    default:
      return 'Enter specific instructions for the agent...'
  }
}
