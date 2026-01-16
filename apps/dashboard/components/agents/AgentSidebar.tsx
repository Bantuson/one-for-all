'use client'

import * as React from 'react'
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  BarChart3,
  Clock,
  Trash2,
  FileSearch,
  Calculator,
  HelpCircle,
  Bot,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatSession, SavedChart } from '@/lib/stores/chatStore'
import type { AgentType } from './AgentInstructionModal'

// ============================================================================
// Types
// ============================================================================

interface AgentSidebarProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
  sessions: ChatSession[]
  savedCharts: SavedChart[]
  onSelectSession: (sessionId: string) => void
  onSelectChart: (chartId: string) => void
  onDeleteChart?: (chartId: string) => void
  activeSessionId?: string
  className?: string
}

// ============================================================================
// Agent Icon Mapping
// ============================================================================

const AGENT_ICONS: Record<AgentType, React.ComponentType<{ className?: string }>> = {
  document_reviewer: FileSearch,
  aps_ranking: Calculator,
  reviewer_assistant: HelpCircle,
  analytics: BarChart3,
  notification_sender: MessageSquare,
}

const AGENT_COLORS: Record<AgentType, string> = {
  document_reviewer: 'text-traffic-green',
  aps_ranking: 'text-blue-500',
  reviewer_assistant: 'text-yellow-500',
  analytics: 'text-purple-500',
  notification_sender: 'text-orange-500',
}

const AGENT_LABELS: Record<AgentType, string> = {
  document_reviewer: 'Doc Review',
  aps_ranking: 'APS Rank',
  reviewer_assistant: 'Assistant',
  analytics: 'Analytics',
  notification_sender: 'Notify',
}

// ============================================================================
// Session Item Component
// ============================================================================

function SessionItem({
  session,
  isActive,
  isCollapsed,
  onClick,
}: {
  session: ChatSession
  isActive: boolean
  isCollapsed: boolean
  onClick: () => void
}) {
  const Icon = AGENT_ICONS[session.agentType] || Bot
  const color = AGENT_COLORS[session.agentType] || 'text-muted-foreground'
  const label = AGENT_LABELS[session.agentType] || session.agentType

  const formattedDate = new Date(session.createdAt).toLocaleDateString('en-ZA', {
    month: 'short',
    day: 'numeric',
  })

  const messageCount = session.messages.length

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-2 rounded-md transition-all',
        'text-left text-sm',
        isActive
          ? 'bg-primary/10 border border-primary/30 text-foreground'
          : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground',
        isCollapsed && 'justify-center px-1'
      )}
      title={isCollapsed ? `${label} - ${formattedDate}` : undefined}
      aria-current={isActive ? 'true' : undefined}
    >
      <Icon className={cn('h-4 w-4 flex-shrink-0', color)} />

      {!isCollapsed && (
        <>
          <div className="flex-1 min-w-0">
            <p className="font-mono text-xs truncate">{label}</p>
            <p className="text-[10px] text-muted-foreground">
              {formattedDate} - {messageCount} msgs
            </p>
          </div>

          {/* Status indicator */}
          <div
            className={cn(
              'w-2 h-2 rounded-full flex-shrink-0',
              session.status === 'active' && 'bg-traffic-green animate-pulse',
              session.status === 'completed' && 'bg-muted-foreground',
              session.status === 'idle' && 'bg-yellow-500'
            )}
            aria-hidden="true"
          />
        </>
      )}
    </button>
  )
}

// ============================================================================
// Chart Item Component
// ============================================================================

function ChartItem({
  chart,
  isCollapsed,
  onClick,
  onDelete,
}: {
  chart: SavedChart
  isCollapsed: boolean
  onClick: () => void
  onDelete?: () => void
}) {
  const formattedDate = new Date(chart.createdAt).toLocaleDateString('en-ZA', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <div
      className={cn(
        'group w-full flex items-center gap-2 px-2 py-2 rounded-md transition-all',
        'text-left text-sm',
        'hover:bg-muted/50 text-muted-foreground hover:text-foreground',
        isCollapsed && 'justify-center px-1'
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-2 flex-1 min-w-0"
        title={isCollapsed ? chart.title : undefined}
      >
        <BarChart3 className="h-4 w-4 flex-shrink-0 text-purple-500" />

        {!isCollapsed && (
          <div className="flex-1 min-w-0">
            <p className="font-mono text-xs truncate">{chart.title}</p>
            <p className="text-[10px] text-muted-foreground">{formattedDate}</p>
          </div>
        )}
      </button>

      {!isCollapsed && onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-traffic-red/10 rounded transition-all"
          aria-label={`Delete chart: ${chart.title}`}
        >
          <Trash2 className="h-3 w-3 text-traffic-red" />
        </button>
      )}
    </div>
  )
}

// ============================================================================
// Section Header Component
// ============================================================================

function SectionHeader({
  icon: Icon,
  label,
  count,
  isCollapsed,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  count: number
  isCollapsed: boolean
}) {
  if (isCollapsed) {
    return (
      <div className="flex justify-center py-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between px-2 py-1.5">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-mono font-bold text-syntax-key uppercase tracking-wide">
          {label}
        </span>
      </div>
      {count > 0 && (
        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {count}
        </span>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function AgentSidebar({
  isCollapsed,
  onToggleCollapse,
  sessions,
  savedCharts,
  onSelectSession,
  onSelectChart,
  onDeleteChart,
  activeSessionId,
  className,
}: AgentSidebarProps) {
  // Sort sessions by date (newest first) and limit to recent ones
  const recentSessions = React.useMemo(() => {
    return [...sessions]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
  }, [sessions])

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-border bg-card/50 transition-all duration-300',
        isCollapsed ? 'w-12' : 'w-56',
        className
      )}
      aria-label="Chat sessions sidebar"
    >
      {/* Collapse toggle button */}
      <div className="flex items-center justify-end p-2 border-b border-border">
        <button
          type="button"
          onClick={onToggleCollapse}
          className={cn(
            'p-1.5 rounded-md transition-colors',
            'text-muted-foreground hover:text-foreground',
            'hover:bg-muted/50',
            'focus:outline-none focus:ring-2 focus:ring-primary/50'
          )}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Sessions section */}
        <section className="mb-4">
          <SectionHeader
            icon={Clock}
            label="Sessions"
            count={recentSessions.length}
            isCollapsed={isCollapsed}
          />
          <div className="px-1 space-y-1">
            {recentSessions.length === 0 ? (
              !isCollapsed && (
                <p className="text-xs text-muted-foreground italic px-2 py-2">
                  No recent sessions
                </p>
              )
            ) : (
              recentSessions.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  isActive={session.id === activeSessionId}
                  isCollapsed={isCollapsed}
                  onClick={() => onSelectSession(session.id)}
                />
              ))
            )}
          </div>
        </section>

        {/* Saved Charts section */}
        <section>
          <SectionHeader
            icon={BarChart3}
            label="Saved Charts"
            count={savedCharts.length}
            isCollapsed={isCollapsed}
          />
          <div className="px-1 space-y-1">
            {savedCharts.length === 0 ? (
              !isCollapsed && (
                <p className="text-xs text-muted-foreground italic px-2 py-2">
                  No saved charts
                </p>
              )
            ) : (
              savedCharts.map((chart) => (
                <ChartItem
                  key={chart.id}
                  chart={chart}
                  isCollapsed={isCollapsed}
                  onClick={() => onSelectChart(chart.id)}
                  onDelete={onDeleteChart ? () => onDeleteChart(chart.id) : undefined}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </aside>
  )
}
