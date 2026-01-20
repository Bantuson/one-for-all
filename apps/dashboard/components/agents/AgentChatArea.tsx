'use client'

import * as React from 'react'
import {
  Send,
  Loader2,
  Bot,
  User,
  HelpCircle,
  BarChart3,
  MessageSquare,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type {
  ChatMessage,
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
  hideInput?: boolean
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

        {/* Regular text content */}
        {!message.progressUpdate && message.content && (
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
  hideInput = false,
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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

      {/* Input Area - conditionally rendered */}
      {!hideInput && (
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
      )}
    </div>
  )
}
