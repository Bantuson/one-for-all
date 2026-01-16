'use client'

import * as React from 'react'
import {
  Send,
  Loader2,
  Bot,
  User,
  CheckCircle2,
  AlertTriangle,
  FileSearch,
  Calculator,
  HelpCircle,
  BarChart3,
  MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type {
  ChatMessage,
  DocumentReviewResult,
  RankingResult,
} from '@/lib/stores/chatStore'
import type { AgentType } from './AgentInstructionModal'

// ============================================================================
// Types
// ============================================================================

interface AgentChatAreaProps {
  messages: ChatMessage[]
  isLoading: boolean
  onSendMessage: (message: string) => void
  agentType?: AgentType
  isAgentActive: boolean
  className?: string
}

// ============================================================================
// Agent Configuration
// ============================================================================

const AGENT_CONFIG: Record<
  AgentType,
  {
    icon: React.ComponentType<{ className?: string }>
    color: string
    name: string
    welcomeText: string
    placeholder: string
  }
> = {
  document_reviewer: {
    icon: FileSearch,
    color: 'text-traffic-green',
    name: 'Document Reviewer',
    welcomeText: 'I can review and verify uploaded documents for all applicants in this course.',
    placeholder: 'Ask about document review, or click Run Agent to start...',
  },
  aps_ranking: {
    icon: Calculator,
    color: 'text-blue-500',
    name: 'APS Ranking Agent',
    welcomeText: 'I can rank applications by APS score and apply intake thresholds.',
    placeholder: 'Enter the intake limit to start ranking...',
  },
  reviewer_assistant: {
    icon: HelpCircle,
    color: 'text-yellow-500',
    name: 'Review Assistant',
    welcomeText: 'Ask me anything about applications, eligibility, policies, or documents.',
    placeholder: 'Ask about eligibility, requirements, policies...',
  },
  analytics: {
    icon: BarChart3,
    color: 'text-purple-500',
    name: 'Analytics Agent',
    welcomeText: 'I can generate insights and visualizations from your application data.',
    placeholder: 'What insights would you like to see?',
  },
  notification_sender: {
    icon: MessageSquare,
    color: 'text-orange-500',
    name: 'Notification Sender',
    welcomeText: 'I can send bulk notifications to applicants via WhatsApp or email.',
    placeholder: 'Describe the notification you want to send...',
  },
}

// ============================================================================
// Progress Indicator Component
// ============================================================================

function ProgressIndicator({
  processed,
  total,
  currentItem,
}: {
  processed: number
  total: number
  currentItem?: string
}) {
  const percentage = total > 0 ? Math.round((processed / total) * 100) : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          Processing: {processed} / {total}
        </span>
        <span className="font-mono text-primary">{percentage}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {currentItem && (
        <p className="text-xs text-muted-foreground italic truncate">
          Current: {currentItem}
        </p>
      )}
    </div>
  )
}

// ============================================================================
// Document Review Result Card
// ============================================================================

function DocumentReviewResultCard({ result }: { result: DocumentReviewResult }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center gap-2 font-mono font-bold">
        <FileSearch className="h-4 w-4 text-traffic-green" />
        Document Review Complete ({result.totalProcessed} applications)
      </div>

      {/* Approved section */}
      {result.approved.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-traffic-green">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">Approved ({result.approved.length} applicants)</span>
          </div>
          <ul className="ml-6 space-y-1 text-xs text-muted-foreground">
            {result.approved.slice(0, 5).map((item, idx) => (
              <li key={idx}>
                {item.applicantName} - All {item.documentCount} documents verified
              </li>
            ))}
            {result.approved.length > 5 && (
              <li className="italic">...and {result.approved.length - 5} more</li>
            )}
          </ul>
        </div>
      )}

      {/* Flagged section */}
      {result.flagged.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-traffic-yellow">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">Flagged ({result.flagged.length} applicants)</span>
          </div>
          <ul className="ml-6 space-y-2 text-xs">
            {result.flagged.slice(0, 5).map((item, idx) => (
              <li key={idx} className="border-l-2 border-traffic-yellow pl-2">
                <p className="font-medium">{item.applicantName}</p>
                <p className="text-muted-foreground">
                  {item.documentType}: {item.reason}
                </p>
                <p className="text-traffic-green text-[10px]">
                  Actions: {item.actionsTaken.join(', ')}
                </p>
              </li>
            ))}
            {result.flagged.length > 5 && (
              <li className="italic text-muted-foreground">
                ...and {result.flagged.length - 5} more
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Ranking Result Card
// ============================================================================

function RankingResultCard({ result }: { result: RankingResult }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-center gap-2 font-mono font-bold">
        <Calculator className="h-4 w-4 text-blue-500" />
        APS Rankings Generated ({result.totalRanked} applications)
      </div>

      <div className="text-xs text-muted-foreground">
        Intake Limit: {result.intakeLimit} | Cutoff APS: {result.cutoffAps}
      </div>

      {/* Auto Accept */}
      {result.autoAccept.length > 0 && (
        <div className="space-y-1">
          <p className="text-traffic-green font-medium flex items-center gap-1">
            <span className="text-lg">&#x1F7E2;</span>
            Auto Accept Recommended ({result.autoAccept.length})
          </p>
          <ul className="ml-6 text-xs text-muted-foreground space-y-0.5">
            {result.autoAccept.slice(0, 3).map((item) => (
              <li key={item.rank}>
                #{item.rank}. {item.applicantName} - APS: {item.apsScore}
              </li>
            ))}
            {result.autoAccept.length > 3 && (
              <li className="italic">...and {result.autoAccept.length - 3} more</li>
            )}
          </ul>
        </div>
      )}

      {/* Conditional */}
      {result.conditional.length > 0 && (
        <div className="space-y-1">
          <p className="text-yellow-500 font-medium flex items-center gap-1">
            <span className="text-lg">&#x1F7E1;</span>
            Conditional Accept ({result.conditional.length})
          </p>
          <ul className="ml-6 text-xs text-muted-foreground space-y-0.5">
            {result.conditional.slice(0, 3).map((item) => (
              <li key={item.rank}>
                #{item.rank}. {item.applicantName} - APS: {item.apsScore}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Waitlist */}
      {result.waitlist.length > 0 && (
        <div className="space-y-1">
          <p className="text-orange-500 font-medium flex items-center gap-1">
            <span className="text-lg">&#x1F7E0;</span>
            Waitlist Recommended ({result.waitlist.length})
          </p>
          <ul className="ml-6 text-xs text-muted-foreground space-y-0.5">
            {result.waitlist.slice(0, 3).map((item) => (
              <li key={item.rank}>
                #{item.rank}. {item.applicantName} - APS: {item.apsScore}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rejected */}
      {result.rejected.length > 0 && (
        <div className="space-y-1">
          <p className="text-traffic-red font-medium flex items-center gap-1">
            <span className="text-lg">&#x1F534;</span>
            Rejection Flagged ({result.rejected.length})
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Message Bubble Component
// ============================================================================

function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  // System messages (e.g., agent taglines)
  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <div className="px-4 py-2 bg-muted/30 rounded-full border border-border/50">
          <p className="text-xs text-muted-foreground italic">{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'flex-1 max-w-[85%] rounded-lg px-4 py-3',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted/50 border border-border'
        )}
      >
        {/* Progress update */}
        {message.progressUpdate && (
          <ProgressIndicator
            processed={message.progressUpdate.processed}
            total={message.progressUpdate.total}
            currentItem={message.progressUpdate.currentItem}
          />
        )}

        {/* Result cards */}
        {message.resultCard?.type === 'document_review' && (
          <DocumentReviewResultCard result={message.resultCard as DocumentReviewResult} />
        )}

        {message.resultCard?.type === 'aps_ranking' && (
          <RankingResultCard result={message.resultCard as RankingResult} />
        )}

        {/* Regular text content */}
        {!message.progressUpdate && !message.resultCard && message.content && (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        )}

        {/* Timestamp */}
        <p
          className={cn(
            'text-[10px] mt-2',
            isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}
        >
          {message.timestamp instanceof Date
            ? message.timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState({ agentType }: { agentType?: AgentType }) {
  const config = agentType ? AGENT_CONFIG[agentType] : null
  const Icon = config?.icon || Bot

  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-12 px-6">
      <div
        className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center mb-4',
          'bg-muted/50 border border-border'
        )}
      >
        <Icon className={cn('h-8 w-8', config?.color || 'text-muted-foreground')} />
      </div>

      <h3 className="text-lg font-semibold mb-2">{config?.name || 'Select an Agent'}</h3>

      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        {config?.welcomeText || 'Choose an agent from the cards above to get started.'}
      </p>

      {agentType && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <span className="text-traffic-green font-mono">//</span>
          Click "Run Agent" to begin
        </p>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function AgentChatArea({
  messages,
  isLoading,
  onSendMessage,
  agentType,
  isAgentActive,
  className,
}: AgentChatAreaProps) {
  const [inputValue, setInputValue] = React.useState('')
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLTextAreaElement>(null)

  const config = agentType ? AGENT_CONFIG[agentType] : null

  // Scroll to bottom when new messages arrive
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when agent becomes active
  React.useEffect(() => {
    if (isAgentActive) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isAgentActive])

  const handleSendMessage = () => {
    const trimmed = inputValue.trim()
    if (!trimmed || isLoading || !isAgentActive) return

    onSendMessage(trimmed)
    setInputValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <EmptyState agentType={agentType} />
        ) : (
          messages.map((message) => <ChatMessageBubble key={message.id} message={message} />)
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <Bot className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="bg-muted/50 border border-border rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Processing...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card/50 p-4">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              !isAgentActive
                ? 'Select an agent and click Run Agent to start...'
                : config?.placeholder || 'Type your message...'
            }
            disabled={isLoading || !isAgentActive}
            rows={1}
            className={cn(
              'flex-1 px-3 py-2 rounded-lg resize-none',
              'bg-muted/30 border border-border',
              'text-sm font-mono text-foreground',
              'placeholder:text-muted-foreground/50',
              'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
            style={{ minHeight: '40px', maxHeight: '120px' }}
            aria-label="Chat message input"
          />
          <Button
            size="icon"
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading || !isAgentActive}
            className="h-10 w-10 flex-shrink-0"
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
