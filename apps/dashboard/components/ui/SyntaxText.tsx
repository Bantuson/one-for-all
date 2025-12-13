'use client'

import { cn } from '@/lib/utils'

// Syntax token types for code-style UI
type SyntaxType =
  | 'key'       // "name": - JSON keys (amber)
  | 'key-alt'   // "name": - Alternative pink keys
  | 'string'    // "value" - String values (green)
  | 'number'    // 123 - Numbers (yellow)
  | 'comment'   // // comment - Comments (gray)
  | 'command'   // command - Command text (light gray)
  | 'export'    // export - Export keyword (pink)
  | 'from'      // from - From keyword (green)
  | 'dollar'    // $ - Dollar prefix (amber)
  | 'default'   // Default text color

interface SyntaxSpanProps {
  type: SyntaxType
  children: React.ReactNode
  className?: string
  mono?: boolean
}

// Single syntax-colored span
export function SyntaxSpan({ type, children, className, mono = true }: SyntaxSpanProps) {
  const colorClasses: Record<SyntaxType, string> = {
    'key': 'text-syntax-key',
    'key-alt': 'text-syntax-key-alt',
    'string': 'text-syntax-string',
    'number': 'text-syntax-number',
    'comment': 'text-syntax-comment',
    'command': 'text-syntax-command',
    'export': 'text-syntax-export',
    'from': 'text-syntax-from',
    'dollar': 'text-syntax-dollar',
    'default': 'text-foreground',
  }

  return (
    <span className={cn(colorClasses[type], mono && 'font-mono', className)}>
      {children}
    </span>
  )
}

// JSON-style key: "keyName":
interface SyntaxKeyProps {
  name: string
  className?: string
  variant?: 'amber' | 'pink'
}

export function SyntaxKey({ name, className, variant = 'amber' }: SyntaxKeyProps) {
  return (
    <span className={cn('font-mono', className)}>
      <span className={variant === 'amber' ? 'text-syntax-key' : 'text-syntax-key-alt'}>
        "{name}"
      </span>
      <span className="text-foreground"> :</span>
    </span>
  )
}

// JSON-style string value: "value"
interface SyntaxStringProps {
  value: string
  className?: string
  withQuotes?: boolean
}

export function SyntaxString({ value, className, withQuotes = true }: SyntaxStringProps) {
  return (
    <span className={cn('font-mono text-syntax-string', className)}>
      {withQuotes ? `"${value}"` : value}
    </span>
  )
}

// Number value with syntax highlighting
interface SyntaxNumberProps {
  value: number | string
  className?: string
}

export function SyntaxNumber({ value, className }: SyntaxNumberProps) {
  return (
    <span className={cn('font-mono text-syntax-number', className)}>
      {typeof value === 'number' ? value.toLocaleString() : value}
    </span>
  )
}

// Comment text: // comment
interface SyntaxCommentProps {
  children: React.ReactNode
  className?: string
}

export function SyntaxComment({ children, className }: SyntaxCommentProps) {
  return (
    <span className={cn('font-mono text-syntax-comment', className)}>
      // {children}
    </span>
  )
}

// Export statement: export "Name"
interface SyntaxExportProps {
  name: string
  keyword?: string
  className?: string
}

export function SyntaxExport({ name, keyword = 'export', className }: SyntaxExportProps) {
  return (
    <span className={cn('font-mono', className)}>
      <span className="text-syntax-export">{keyword}</span>
      <span className="text-syntax-string"> "{name}"</span>
    </span>
  )
}

// From statement: from "source"
interface SyntaxFromProps {
  source: string
  icon?: React.ReactNode
  className?: string
}

export function SyntaxFrom({ source, icon, className }: SyntaxFromProps) {
  return (
    <span className={cn('font-mono inline-flex items-center gap-1', className)}>
      {icon}
      <span className="text-syntax-from">from</span>
      <span className="text-syntax-string">"{source}"</span>
    </span>
  )
}

// Command prefix: $
interface SyntaxDollarProps {
  className?: string
}

export function SyntaxDollar({ className }: SyntaxDollarProps) {
  return (
    <span className={cn('font-mono text-syntax-dollar', className)}>$</span>
  )
}

// Full command: $ command --flag
interface SyntaxCommandProps {
  command: string
  className?: string
}

export function SyntaxCommand({ command, className }: SyntaxCommandProps) {
  return (
    <span className={cn('font-mono inline-flex items-center gap-1', className)}>
      <SyntaxDollar />
      <span className="text-syntax-command">{command}</span>
    </span>
  )
}

// Key-value pair: "key": "value" or "key": 123
interface SyntaxKeyValueProps {
  keyName: string
  value: string | number
  comment?: string
  keyVariant?: 'amber' | 'pink'
  className?: string
}

export function SyntaxKeyValue({
  keyName,
  value,
  comment,
  keyVariant = 'amber',
  className
}: SyntaxKeyValueProps) {
  const isNumber = typeof value === 'number'

  return (
    <div className={cn('font-mono', className)}>
      <SyntaxKey name={keyName} variant={keyVariant} />
      <span> </span>
      {isNumber ? (
        <SyntaxNumber value={value} />
      ) : (
        <SyntaxString value={value} />
      )}
      {comment && (
        <>
          <span> </span>
          <SyntaxComment>{comment}</SyntaxComment>
        </>
      )}
    </div>
  )
}

// Multi-line code block with syntax
interface SyntaxBlockProps {
  children: React.ReactNode
  className?: string
}

export function SyntaxBlock({ children, className }: SyntaxBlockProps) {
  return (
    <div className={cn('font-mono text-sm space-y-1', className)}>
      {children}
    </div>
  )
}
