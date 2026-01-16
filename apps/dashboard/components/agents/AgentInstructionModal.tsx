'use client'

import * as React from 'react'
import {
  FileSearch,
  Calculator,
  HelpCircle,
  BarChart3,
  Loader2,
  AlertTriangle,
  Send,
} from 'lucide-react'
import { DottedModal, DottedModalFooter } from '@/components/ui/DottedModal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { AgentSidebar } from './AgentSidebar'
import { AgentChatArea } from './AgentChatArea'
import {
  useChatStore,
  AGENT_TAGLINES,
} from '@/lib/stores/chatStore'

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
  courseId?: string
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
    description: 'Review and verify documents',
    icon: FileSearch,
    color: 'text-traffic-green',
  },
  {
    type: 'aps_ranking',
    label: 'APS Ranking',
    description: 'Rank by admission points',
    icon: Calculator,
    color: 'text-blue-500',
  },
  {
    type: 'reviewer_assistant',
    label: 'Review Assistant',
    description: 'Answer policy questions',
    icon: HelpCircle,
    color: 'text-yellow-500',
  },
  {
    type: 'analytics',
    label: 'Analytics',
    description: 'Generate insights',
    icon: BarChart3,
    color: 'text-purple-500',
  },
]

// ============================================================================
// Agent Switch Warning Dialog
// ============================================================================

function AgentSwitchWarning({
  isOpen,
  currentAgent,
  newAgent,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean
  currentAgent: AgentType
  newAgent: AgentType
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!isOpen) return null

  const currentConfig = AGENT_TYPES.find((a) => a.type === currentAgent)
  const newConfig = AGENT_TYPES.find((a) => a.type === newAgent)

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 rounded-lg">
      <div className="bg-card border border-border rounded-lg p-6 max-w-sm mx-4 shadow-lg">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="h-5 w-5 text-traffic-yellow flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold mb-1">Switch Agent?</h3>
            <p className="text-sm text-muted-foreground">
              Switching from <span className="font-mono text-foreground">{currentConfig?.label}</span> to{' '}
              <span className="font-mono text-foreground">{newConfig?.label}</span> will end the current session.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Chat history will be preserved in the sidebar.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={onConfirm}>
            Switch Agent
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Agent Card Component
// ============================================================================

function AgentCard({
  agent,
  isSelected,
  onClick,
}: {
  agent: (typeof AGENT_TYPES)[number]
  isSelected: boolean
  onClick: () => void
}) {
  const { label, description, icon: Icon, color } = agent

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center p-3 rounded-lg border transition-all text-center min-w-0',
        isSelected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
          : 'border-border hover:border-primary/50 hover:bg-muted/30'
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center mb-2',
          isSelected ? 'bg-primary/10' : 'bg-muted/50'
        )}
      >
        <Icon className={cn('h-5 w-5', color)} />
      </div>
      <span className="text-sm font-medium truncate w-full">{label}</span>
      <span className="text-[10px] text-muted-foreground truncate w-full">{description}</span>
    </button>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function AgentInstructionModal({
  isOpen,
  onClose,
  institutionId,
  courseId,
  recentSessions = [],
  isLoadingSessions: _isLoadingSessions = false,
  onSubmit,
}: AgentInstructionModalProps) {
  // Local state
  const [selectedAgent, setSelectedAgent] = React.useState<AgentType | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [showSwitchWarning, setShowSwitchWarning] = React.useState(false)
  const [pendingAgentSwitch, setPendingAgentSwitch] = React.useState<AgentType | null>(null)

  // Chat store
  const {
    sessions,
    savedCharts,
    activeSessionId,
    isSidebarCollapsed,
    toggleSidebar,
    createSession,
    setActiveSession,
    addMessage,
    setSessionStatus,
    switchAgent,
    confirmAgentSwitch,
    setContext,
    getActiveSession,
    deleteChart,
  } = useChatStore()

  // Filter sessions for this institution
  const institutionSessions = React.useMemo(
    () => sessions.filter((s) => s.institutionId === institutionId),
    [sessions, institutionId]
  )

  // Get active session
  const activeSession = getActiveSession()

  // Determine if an agent is currently active
  const isAgentActive = activeSession?.status === 'active'

  // Get messages for active session
  const messages = activeSession?.messages || []

  // Set context when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setContext(institutionId, courseId)
    }
  }, [isOpen, institutionId, courseId, setContext])

  // Sync selected agent with active session
  React.useEffect(() => {
    if (activeSession && activeSession.status === 'active') {
      setSelectedAgent(activeSession.agentType)
    }
  }, [activeSession])

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setSelectedAgent(null)
      setShowSwitchWarning(false)
      setPendingAgentSwitch(null)
    }
  }, [isOpen])

  // Handle agent card selection
  const handleAgentSelect = (agentType: AgentType) => {
    // Check if we need to show switch warning
    const result = switchAgent(agentType)

    if (result.requiresConfirmation) {
      setPendingAgentSwitch(agentType)
      setShowSwitchWarning(true)
    } else {
      setSelectedAgent(agentType)
    }
  }

  // Handle switch confirmation
  const handleConfirmSwitch = () => {
    if (pendingAgentSwitch) {
      confirmAgentSwitch(pendingAgentSwitch)
      setSelectedAgent(pendingAgentSwitch)
    }
    setShowSwitchWarning(false)
    setPendingAgentSwitch(null)
  }

  // Handle switch cancel
  const handleCancelSwitch = () => {
    setShowSwitchWarning(false)
    setPendingAgentSwitch(null)
  }

  // Handle Run Agent button
  const handleRunAgent = async () => {
    if (!selectedAgent) return

    setIsSubmitting(true)
    try {
      // Create a new session
      const session = createSession(selectedAgent, institutionId, courseId)

      // Set session status to active
      setSessionStatus(session.id, 'active')

      // Add the agent tagline as a system message
      addMessage(session.id, {
        role: 'assistant',
        content: AGENT_TAGLINES[selectedAgent],
      })

      // Call the onSubmit callback (for backend integration)
      await onSubmit(selectedAgent, '')
    } catch (error) {
      console.error('Failed to start agent:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle sending a message
  const handleSendMessage = async (message: string) => {
    if (!activeSession) return

    // Add user message
    addMessage(activeSession.id, {
      role: 'user',
      content: message,
    })

    // Here you would typically call an API to process the message
    // For now, we'll just show a placeholder response
    // In a real implementation, this would be handled by the agent backend

    // Simulate API call
    setTimeout(() => {
      addMessage(activeSession.id, {
        role: 'assistant',
        content: 'Processing your request...',
      })
    }, 500)
  }

  // Handle session selection from sidebar
  const handleSelectSession = (sessionId: string) => {
    setActiveSession(sessionId)
    const session = sessions.find((s) => s.id === sessionId)
    if (session) {
      setSelectedAgent(session.agentType)
    }
  }

  // Handle chart selection
  const handleSelectChart = (chartId: string) => {
    // Find the chart and its session
    const chart = savedCharts.find((c) => c.id === chartId)
    if (chart) {
      setActiveSession(chart.sessionId)
    }
  }

  // Filter running sessions for badge display
  const runningSessions = recentSessions.filter((s) => s.status === 'running')

  return (
    <DottedModal
      isOpen={isOpen}
      onClose={onClose}
      title="agentSandbox"
      className="max-w-6xl h-[85vh]"
      headerExtra={
        runningSessions.length > 0 ? (
          <span className="text-xs font-mono text-traffic-green">
            {runningSessions.length} running
          </span>
        ) : undefined
      }
    >
      <div className="flex h-[calc(85vh-120px)] relative">
        {/* Agent Switch Warning Overlay */}
        <AgentSwitchWarning
          isOpen={showSwitchWarning}
          currentAgent={activeSession?.agentType || 'document_reviewer'}
          newAgent={pendingAgentSwitch || 'document_reviewer'}
          onConfirm={handleConfirmSwitch}
          onCancel={handleCancelSwitch}
        />

        {/* Sidebar */}
        <AgentSidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
          sessions={institutionSessions}
          savedCharts={savedCharts}
          onSelectSession={handleSelectSession}
          onSelectChart={handleSelectChart}
          onDeleteChart={deleteChart}
          activeSessionId={activeSessionId || undefined}
        />

        {/* Main Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Agent Cards Row */}
          <div className="p-4 border-b border-border bg-card/50">
            <div className="grid grid-cols-4 gap-3">
              {AGENT_TYPES.map((agent) => (
                <AgentCard
                  key={agent.type}
                  agent={agent}
                  isSelected={selectedAgent === agent.type}
                  onClick={() => handleAgentSelect(agent.type)}
                />
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <AgentChatArea
            messages={messages}
            isLoading={isSubmitting}
            onSendMessage={handleSendMessage}
            agentType={selectedAgent || undefined}
            isAgentActive={isAgentActive}
            className="flex-1"
          />
        </div>
      </div>

      <DottedModalFooter>
        <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleRunAgent}
          disabled={!selectedAgent || isSubmitting || isAgentActive}
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
