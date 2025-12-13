'use client'

import { Folder } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { CommandButton } from '@/components/ui/CommandButton'

interface EmptyStateAction {
  command: string
  href?: string
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
}

interface EmptyStatePromptProps {
  title: string
  description: string
  codeComment?: string
  helpCommand?: string
  helpText?: string
  icon?: React.ReactNode
  actions: EmptyStateAction[]
  className?: string
}

export function EmptyStatePrompt({
  title,
  description,
  codeComment,
  helpCommand = 'man setup-guide',
  helpText = 'View documentation',
  icon,
  actions,
  className,
}: EmptyStatePromptProps) {
  return (
    <div className={cn('flex flex-1 items-center justify-center p-8', className)}>
      <div className="max-w-md text-center">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="rounded-lg border border-border bg-muted/30 p-6">
            {icon || <Folder className="h-12 w-12 text-muted-foreground" />}
          </div>
        </div>

        {/* Title as comment */}
        <div className="font-mono text-sm space-y-2 mb-6">
          <p className="text-muted-foreground"><span className="text-traffic-green">//</span> {title}</p>
          <p>
            <span className="text-purple-500">def</span>
            <span className="text-foreground ml-1">dashboard_setup</span>
            <span className="text-yellow-500">()</span>
            <span className="text-red-500">;</span>
          </p>
          <p className="text-muted-foreground"><span className="text-traffic-green">//</span> {description}</p>
        </div>

        {/* Code Comment Block (optional) */}
        {codeComment && (
          <div className="font-mono text-xs text-syntax-comment mb-6 p-3 rounded-md bg-muted/30 border border-border text-left">
            <p>/*</p>
            <p className="pl-2">{codeComment}</p>
            <p>*/</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          {actions.map((action, index) => {
            const button = (
              <CommandButton
                key={index}
                command={action.command}
                variant={action.variant || 'primary'}
                size="md"
                onClick={action.onClick}
                className="w-full sm:w-auto justify-center"
              />
            )

            if (action.href) {
              return (
                <Link key={index} href={action.href}>
                  {button}
                </Link>
              )
            }

            return button
          })}
        </div>

        {/* Help Text */}
        <p className="font-mono text-xs text-muted-foreground">
          <span className="text-traffic-green">$</span> {helpCommand}  <span className="text-traffic-green">//</span> <span className="text-syntax-key">{helpText}</span>
        </p>
      </div>
    </div>
  )
}

// Variant for no data found
interface NoDataPromptProps {
  entity: string
  addCommand: string
  onAdd?: () => void
  addHref?: string
}

export function NoDataPrompt({ entity, addCommand, onAdd, addHref }: NoDataPromptProps) {
  return (
    <EmptyStatePrompt
      title={`No ${entity} found`}
      description={`Add your first ${entity.toLowerCase()} to get started`}
      actions={[
        {
          command: addCommand,
          onClick: onAdd,
          href: addHref,
          variant: 'primary',
        },
      ]}
    />
  )
}

// Variant for search with no results
interface NoSearchResultsProps {
  query: string
  onClear?: () => void
}

export function NoSearchResults({ query, onClear }: NoSearchResultsProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-sm text-center font-mono">
        <p className="text-syntax-comment text-sm">// No results for</p>
        <p className="text-syntax-string text-lg my-2">"{query}"</p>
        <p className="text-syntax-comment text-sm">// Try a different search term</p>
        {onClear && (
          <div className="mt-4">
            <CommandButton
              command="clear --search"
              variant="ghost"
              size="sm"
              onClick={onClear}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// Variant for error state
interface ErrorPromptProps {
  error: string
  details?: string
  onRetry?: () => void
}

export function ErrorPrompt({ error, details, onRetry }: ErrorPromptProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-md text-center">
        {/* Error Icon */}
        <div className="flex justify-center mb-6">
          <div className="rounded-lg border border-traffic-red/30 bg-traffic-red/10 p-6">
            <span className="text-4xl">⚠️</span>
          </div>
        </div>

        {/* Error Message */}
        <div className="font-mono text-sm space-y-2 mb-6">
          <p className="text-traffic-red">// Error</p>
          <p className="text-foreground">{error}</p>
          {details && <p className="text-syntax-comment text-xs">// {details}</p>}
        </div>

        {/* Retry Button */}
        {onRetry && (
          <CommandButton
            command="retry --force"
            variant="outline"
            size="md"
            onClick={onRetry}
          />
        )}

        {/* Help Text */}
        <p className="font-mono text-xs text-syntax-comment mt-6">
          $ man error-codes  // View error documentation
        </p>
      </div>
    </div>
  )
}

// Variant for loading state (skeleton)
export function LoadingPrompt() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="max-w-sm text-center font-mono">
        <div className="animate-pulse space-y-2">
          <p className="text-syntax-comment">// Loading...</p>
          <p className="text-foreground">
            <span className="inline-block w-2 h-4 bg-primary animate-pulse" />
          </p>
          <p className="text-syntax-comment text-xs">$ fetch --data</p>
        </div>
      </div>
    </div>
  )
}

// Variant for select prompt (asking user to select something)
interface SelectPromptProps {
  entity: string
  instruction?: string
}

export function SelectPrompt({ entity, instruction }: SelectPromptProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="text-center font-mono">
        <p className="text-syntax-comment text-sm">// No {entity} selected</p>
        <p className="text-syntax-comment text-xs mt-1">
          $ select --{entity.toLowerCase()} {instruction || 'first'}
        </p>
      </div>
    </div>
  )
}
