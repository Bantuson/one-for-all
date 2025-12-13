'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

export type CommandButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline' | 'purple'
export type CommandButtonSize = 'sm' | 'md' | 'lg'

export interface CommandButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** The command text (without $), e.g., "add --course" */
  command: string
  /** Button variant */
  variant?: CommandButtonVariant
  /** Button size */
  size?: CommandButtonSize
  /** Optional icon to show before the $ */
  icon?: React.ReactNode
  /** Show loading spinner */
  loading?: boolean
  /** Show arrow indicator */
  arrow?: boolean
}

const variantClasses: Record<CommandButtonVariant, string> = {
  primary: cn(
    'bg-gradient-to-r from-amber-500 to-amber-600',
    'text-white',
    'border-transparent',
    'hover:from-amber-600 hover:to-amber-700',
    'shadow-sm hover:shadow-md',
  ),
  purple: cn(
    'bg-purple-600',
    'text-white',
    'border-transparent',
    'hover:bg-purple-700',
    'shadow-sm hover:shadow-md',
  ),
  secondary: cn(
    'bg-transparent',
    'text-primary',
    'border-primary',
    'hover:bg-primary hover:text-primary-foreground',
  ),
  outline: cn(
    'bg-transparent',
    'text-foreground',
    'border-border',
    'hover:bg-muted hover:border-muted-foreground/50',
  ),
  ghost: cn(
    'bg-transparent',
    'text-muted-foreground',
    'border-transparent',
    'hover:bg-muted hover:text-foreground',
  ),
  destructive: cn(
    'bg-destructive',
    'text-destructive-foreground',
    'border-transparent',
    'hover:bg-destructive/90',
  ),
}

const sizeClasses: Record<CommandButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export const CommandButton = React.forwardRef<HTMLButtonElement, CommandButtonProps>(
  (
    {
      command,
      variant = 'primary',
      size = 'md',
      icon,
      loading = false,
      arrow = false,
      className,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center gap-2',
          'font-mono font-medium',
          'rounded-md border',
          'transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          // Variant styles
          variantClasses[variant],
          // Size styles
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            {icon && <span className="shrink-0">{icon}</span>}
            <span className="text-traffic-green">$</span>
            <span>{command}</span>
            {arrow && <span className="ml-1">&rarr;</span>}
          </>
        )}
      </button>
    )
  }
)

CommandButton.displayName = 'CommandButton'

// Quick command button variants for common actions
interface QuickCommandProps extends Omit<CommandButtonProps, 'command'> {
  children?: React.ReactNode
}

export function AddCommand({ children, ...props }: QuickCommandProps) {
  return <CommandButton command={`add ${children || ''}`} {...props} />
}

export function ViewCommand({ children, ...props }: QuickCommandProps) {
  return <CommandButton command={`view ${children || ''}`} variant="secondary" {...props} />
}

export function CdCommand({ path, ...props }: QuickCommandProps & { path: string }) {
  return <CommandButton command={`cd ${path}`} variant="ghost" {...props} />
}

export function CancelCommand(props: QuickCommandProps) {
  return <CommandButton command="cancel" variant="ghost" {...props} />
}

export function DeleteCommand({ children, ...props }: QuickCommandProps) {
  return <CommandButton command={`rm ${children || '--force'}`} variant="destructive" {...props} />
}

// Navigation command with back arrow
export function BackCommand(props: QuickCommandProps) {
  return (
    <CommandButton
      command="cd .."
      variant="ghost"
      icon={<span>&larr;</span>}
      {...props}
    />
  )
}

// Download command with icon
export function DownloadCommand({ filename, ...props }: QuickCommandProps & { filename: string }) {
  return (
    <CommandButton
      command={`wget ${filename}`}
      variant="secondary"
      icon={<span>&darr;</span>}
      {...props}
    />
  )
}
