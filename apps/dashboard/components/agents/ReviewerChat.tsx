'use client'

import * as React from 'react'
import {
  Send,
  Loader2,
  Bot,
  User,
  AlertCircle,
  CheckCircle2,
  FileText,
  BookOpen,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { DottedModal, DottedModalContent, DottedModalFooter } from '@/components/ui/DottedModal'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  citations?: string[]
  recommendations?: string[]
  confidence?: 'High' | 'Medium' | 'Low'
  isLoading?: boolean
}

interface ReviewerChatProps {
  isOpen: boolean
  onClose: () => void
  institutionId: string
  applicationId?: string
  courseId?: string
}

// ============================================================================
// Quick Question Suggestions
// ============================================================================

const QUICK_QUESTIONS = [
  {
    label: 'Check Eligibility',
    question: 'Is this applicant eligible for conditional acceptance?',
    icon: CheckCircle2,
  },
  {
    label: 'Missing Documents',
    question: 'What documents are missing for this application?',
    icon: FileText,
  },
  {
    label: 'Course Requirements',
    question: 'What are the minimum requirements for this course?',
    icon: BookOpen,
  },
  {
    label: 'Compare Applicant',
    question: 'How does this applicant compare to accepted students?',
    icon: User,
  },
]

// ============================================================================
// Message Component
// ============================================================================

function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser
            ? 'bg-primary/10 text-primary'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {isUser ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'flex-1 max-w-[80%] rounded-lg px-4 py-3',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted/50 border border-border'
        )}
      >
        {message.isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        ) : (
          <>
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>

            {/* Citations */}
            {message.citations && message.citations.length > 0 && (
              <div className="mt-3 pt-2 border-t border-border/50">
                <p className="text-xs font-mono font-bold text-syntax-key mb-1">
                  Sources:
                </p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {message.citations.map((citation, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <span className="text-primary">&bull;</span>
                      <span>{citation}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {message.recommendations && message.recommendations.length > 0 && (
              <div className="mt-3 pt-2 border-t border-border/50">
                <p className="text-xs font-mono font-bold text-syntax-key mb-1">
                  Recommendations:
                </p>
                <ul className="text-xs space-y-1">
                  {message.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <CheckCircle2 className="h-3 w-3 text-traffic-green mt-0.5 flex-shrink-0" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Confidence indicator */}
            {message.confidence && !isUser && (
              <div className="mt-2 flex items-center gap-1">
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded font-mono',
                    message.confidence === 'High' && 'bg-traffic-green/10 text-traffic-green',
                    message.confidence === 'Medium' && 'bg-yellow-500/10 text-yellow-500',
                    message.confidence === 'Low' && 'bg-traffic-red/10 text-traffic-red'
                  )}
                >
                  {message.confidence} confidence
                </span>
              </div>
            )}
          </>
        )}

        {/* Timestamp */}
        <p
          className={cn(
            'text-[10px] mt-1',
            isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function ReviewerChat({
  isOpen,
  onClose,
  institutionId,
  applicationId,
  courseId,
}: ReviewerChatProps) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom when new messages arrive
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      // Keep message history but clear input
      setInputValue('')
    }
  }, [isOpen])

  const handleSendMessage = async (question?: string) => {
    const messageText = question || inputValue.trim()
    if (!messageText || isLoading) return

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    }

    // Add loading placeholder for assistant
    const loadingMessage: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    }

    setMessages((prev) => [...prev, userMessage, loadingMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/agents/reviewer-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: messageText,
          institution_id: institutionId,
          application_id: applicationId,
          course_id: courseId,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response from assistant')
      }

      const data = await response.json()

      // Update the loading message with the actual response
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingMessage.id
            ? {
                ...msg,
                content: data.answer || 'I could not process your question.',
                citations: data.citations,
                recommendations: data.recommendations,
                confidence: data.confidence,
                isLoading: false,
              }
            : msg
        )
      )
    } catch (error) {
      console.error('Reviewer chat error:', error)
      toast.error('Failed to get response from assistant')

      // Update loading message with error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingMessage.id
            ? {
                ...msg,
                content:
                  'Sorry, I encountered an error while processing your question. Please try again.',
                isLoading: false,
                confidence: 'Low',
              }
            : msg
        )
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleClearChat = () => {
    setMessages([])
    toast.success('Chat history cleared')
  }

  return (
    <DottedModal
      isOpen={isOpen}
      onClose={onClose}
      title="reviewerAssistant"
      className="max-w-2xl h-[80vh]"
      headerExtra={
        messages.length > 0 ? (
          <button
            type="button"
            onClick={handleClearChat}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Clear
          </button>
        ) : undefined
      }
    >
      <div className="flex flex-col h-full">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <Bot className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Reviewer Assistant
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                Ask me anything about applications, eligibility, policies, or
                documents. I will search our knowledge base to help you make
                informed decisions.
              </p>

              {/* Quick Questions */}
              <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                {QUICK_QUESTIONS.map(({ label, question, icon: Icon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleSendMessage(question)}
                    disabled={isLoading || !applicationId}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-lg border border-border',
                      'text-left text-sm transition-all',
                      'hover:border-primary/50 hover:bg-muted/30',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {!applicationId && (
                <p className="mt-4 text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Select an application to enable quick questions
                </p>
              )}
            </div>
          ) : (
            messages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <DottedModalFooter className="flex-col gap-2 p-4">
          {/* Context indicator */}
          {(applicationId || courseId) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground w-full">
              <span>Context:</span>
              {applicationId && (
                <span className="bg-muted px-1.5 py-0.5 rounded font-mono">
                  App: {applicationId.slice(0, 8)}...
                </span>
              )}
              {courseId && (
                <span className="bg-muted px-1.5 py-0.5 rounded font-mono">
                  Course: {courseId.slice(0, 8)}...
                </span>
              )}
            </div>
          )}

          {/* Input row */}
          <div className="flex items-end gap-2 w-full">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about eligibility, documents, requirements..."
              rows={1}
              disabled={isLoading}
              className={cn(
                'flex-1 px-3 py-2 rounded-lg resize-none',
                'bg-muted/30 border border-border',
                'text-sm font-mono text-foreground',
                'placeholder:text-muted-foreground/50',
                'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50',
                'disabled:opacity-50'
              )}
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
            <Button
              size="icon"
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isLoading}
              className="h-10 w-10"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </DottedModalFooter>
      </div>
    </DottedModal>
  )
}
