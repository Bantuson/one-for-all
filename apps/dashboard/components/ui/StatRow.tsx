'use client'

import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

// Single stat item with optional icon
interface StatItemProps {
  icon?: LucideIcon | React.ReactNode
  label: string
  value?: string | number
  valueColor?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'muted'
  className?: string
}

const valueColorMap: Record<NonNullable<StatItemProps['valueColor']>, string> = {
  default: 'text-foreground',
  primary: 'text-primary',
  success: 'text-traffic-green',
  warning: 'text-traffic-yellow',
  error: 'text-traffic-red',
  muted: 'text-muted-foreground',
}

export function StatItem({
  icon,
  label,
  value,
  valueColor = 'default',
  className
}: StatItemProps) {
  // Render icon content based on type
  const renderIcon = (): React.ReactNode => {
    if (!icon) return null
    if (typeof icon === 'function') {
      const IconComponent = icon as LucideIcon
      return <IconComponent className="h-3.5 w-3.5" />
    }
    return icon
  }

  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm', className)}>
      {icon && (
        <span className="text-muted-foreground shrink-0">
          {renderIcon()}
        </span>
      )}
      <span className="text-muted-foreground">{label}:</span>
      {value !== undefined && (
        <span className={cn('font-mono', valueColorMap[valueColor])}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
      )}
    </span>
  )
}

// Horizontal row of stats separated by spaces
interface StatRowProps {
  children: React.ReactNode
  className?: string
  separator?: 'space' | 'dot' | 'pipe'
}

const separatorMap: Record<NonNullable<StatRowProps['separator']>, string> = {
  space: 'gap-4',
  dot: 'gap-2',
  pipe: 'gap-3',
}

export function StatRow({ children, className, separator = 'space' }: StatRowProps) {
  return (
    <div className={cn(
      'flex flex-wrap items-center',
      separatorMap[separator],
      className
    )}>
      {children}
    </div>
  )
}

// Pre-built stat items for common use cases

interface ApplicationsStatProps {
  count: number
  className?: string
}

export function ApplicationsStat({ count, className }: ApplicationsStatProps) {
  return (
    <StatItem
      icon="📥"
      label="apps"
      value={count}
      valueColor="primary"
      className={className}
    />
  )
}

interface DocumentsStatProps {
  completed: number
  total: number
  className?: string
}

export function DocumentsStat({ completed, total, className }: DocumentsStatProps) {
  return (
    <StatItem
      icon="📋"
      label="docs"
      value={`${completed}/${total}`}
      valueColor={completed === total ? 'success' : 'warning'}
      className={className}
    />
  )
}

interface APSStatProps {
  score: number
  className?: string
}

export function APSStat({ score, className }: APSStatProps) {
  return (
    <StatItem
      icon="📊"
      label="aps"
      value={score}
      valueColor="success"
      className={className}
    />
  )
}

interface DateStatProps {
  label: string
  date: string | Date
  className?: string
}

export function DateStat({ label, date, className }: DateStatProps) {
  const formattedDate = date instanceof Date
    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : date

  return (
    <StatItem
      icon="📅"
      label={label}
      value={formattedDate}
      valueColor="muted"
      className={className}
    />
  )
}

interface DurationStatProps {
  years: number
  className?: string
}

export function DurationStat({ years, className }: DurationStatProps) {
  return (
    <StatItem
      icon="🎓"
      label="duration"
      value={`${years} years`}
      className={className}
    />
  )
}

interface CostStatProps {
  amount: number
  currency?: string
  period?: string
  className?: string
}

export function CostStat({
  amount,
  currency = 'R',
  period = '/yr',
  className
}: CostStatProps) {
  return (
    <StatItem
      icon="💰"
      label="cost"
      value={`${currency}${amount.toLocaleString()}${period}`}
      valueColor="primary"
      className={className}
    />
  )
}

// Compact stat row for card footers
interface CardStatsProps {
  status?: 'active' | 'pending' | 'draft' | 'rejected'
  applications?: number
  deadline?: string | Date
  className?: string
}

export function CardStats({
  status,
  applications,
  deadline,
  className
}: CardStatsProps) {
  return (
    <StatRow className={className}>
      {status && (
        <span className="inline-flex items-center gap-1.5 text-sm">
          <span className={cn(
            'h-1.5 w-1.5 rounded-full',
            status === 'active' && 'bg-traffic-green',
            status === 'pending' && 'bg-traffic-yellow',
            status === 'rejected' && 'bg-traffic-red',
            status === 'draft' && 'bg-gray-400 dark:bg-gray-500',
          )} />
          <span className="text-muted-foreground">{status}</span>
        </span>
      )}
      {applications !== undefined && (
        <ApplicationsStat count={applications} />
      )}
      {deadline && (
        <DateStat label="closes" date={deadline} />
      )}
    </StatRow>
  )
}
