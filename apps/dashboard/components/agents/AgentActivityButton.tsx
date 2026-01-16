'use client'

import * as React from 'react'
import { MessageSquare, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AgentActivityButtonProps {
  activeCount?: number
  isLoading?: boolean
  onClick: () => void
  className?: string
}

/**
 * Button to access the agent sandbox.
 * Shows active agent session count as a badge.
 */
export function AgentActivityButton({
  activeCount = 0,
  isLoading = false,
  onClick,
  className,
}: AgentActivityButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex items-center justify-center',
        'h-8 w-8',
        'text-muted-foreground hover:text-primary',
        'transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background',
        className
      )}
      title="Agent Sandbox"
      aria-label={`Agent Sandbox${activeCount > 0 ? ` - ${activeCount} active` : ''}`}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MessageSquare className="h-4 w-4" />
      )}

      {/* Active count badge */}
      {activeCount > 0 && !isLoading && (
        <span
          className={cn(
            'absolute -top-1 -right-1',
            'flex items-center justify-center',
            'min-w-[18px] h-[18px] px-1',
            'text-[10px] font-bold',
            'rounded-full',
            'bg-traffic-green text-background',
            'border-2 border-background'
          )}
          aria-hidden="true"
        >
          {activeCount > 9 ? '9+' : activeCount}
        </span>
      )}
    </button>
  )
}
