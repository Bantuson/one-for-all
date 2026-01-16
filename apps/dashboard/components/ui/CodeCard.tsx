'use client'

import * as React from 'react'
import { Pencil, Trash2, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  TrafficLightsFilename,
  type TrafficLightStatus,
  ModuleBadge,
  StarBadge,
  StatusBadge,
} from './TrafficLights'

// Main CodeCard component
interface CodeCardProps {
  children: React.ReactNode
  className?: string
  overflow?: 'hidden' | 'visible' | 'auto'
}

export function CodeCard({ children, className, overflow = 'hidden' }: CodeCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card',
        overflow === 'hidden' && 'overflow-hidden',
        overflow === 'visible' && 'overflow-visible',
        overflow === 'auto' && 'overflow-auto',
        'transition-all duration-200',
        'hover:border-border/80 hover:shadow-sm',
        className
      )}
    >
      {children}
    </div>
  )
}

// Card header with traffic lights and filename
interface CodeCardHeaderProps {
  filename: string
  filenameSize?: 'xs' | 'sm'
  status?: TrafficLightStatus
  badge?: 'module' | 'readonly' | React.ReactNode
  count?: number
  rightContent?: React.ReactNode
  className?: string
}

export function CodeCardHeader({
  filename,
  filenameSize,
  status = 'neutral',
  badge,
  count,
  rightContent,
  className,
}: CodeCardHeaderProps) {
  const badgeElement = badge === 'module' ? (
    <ModuleBadge />
  ) : badge === 'readonly' ? (
    <span className="text-xs text-muted-foreground">readonly</span>
  ) : badge

  const rightElement = rightContent || (count !== undefined ? (
    <StarBadge count={count} />
  ) : null)

  return (
    <div
      className={cn(
        'px-4 py-3 border-b border-border bg-muted/30',
        className
      )}
    >
      <TrafficLightsFilename
        status={status}
        filename={filename}
        filenameSize={filenameSize}
        badge={badgeElement}
        rightContent={rightElement}
      />
    </div>
  )
}

// Card content area
interface CodeCardContentProps {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg' | 'none'
}

const paddingMap = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export function CodeCardContent({
  children,
  className,
  padding = 'md'
}: CodeCardContentProps) {
  return (
    <div className={cn(paddingMap[padding], className)}>
      {children}
    </div>
  )
}

// Card footer with stats and actions
interface CodeCardFooterProps {
  children: React.ReactNode
  className?: string
}

export function CodeCardFooter({ children, className }: CodeCardFooterProps) {
  return (
    <div
      className={cn(
        'px-4 py-3 border-t border-border bg-muted/20',
        'flex items-center justify-between gap-4',
        className
      )}
    >
      {children}
    </div>
  )
}

// Syntax-highlighted content block
interface CodeCardBodyProps {
  children: React.ReactNode
  className?: string
}

export function CodeCardBody({ children, className }: CodeCardBodyProps) {
  return (
    <div className={cn('font-mono text-sm space-y-1 p-4', className)}>
      {children}
    </div>
  )
}

// Pre-built card variants

// Course card with full structure (unified design)
interface CourseCardProps {
  code: string
  name: string
  faculty: string
  description?: string
  status: 'active' | 'pending' | 'draft' | 'rejected'
  applications?: number
  deadline?: string
  minimumAps?: number
  durationYears?: number
  requiredSubjects?: string[]
  onClick?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onViewApplications?: () => void
  className?: string
}

export function CourseCard({
  code,
  name,
  faculty,
  description,
  status,
  applications = 0,
  minimumAps,
  durationYears,
  onClick,
  onEdit,
  onDelete,
  onViewApplications,
  className,
}: CourseCardProps) {
  // Map status to badge variant
  const statusBadgeVariant = status === 'active' ? 'active' : status === 'pending' ? 'warning' : status === 'rejected' ? 'error' : 'neutral'
  const statusLabel = status === 'active' ? 'open' : status

  return (
    <CodeCard className={cn(onClick && 'cursor-pointer', 'h-full flex flex-col min-h-[280px]', className)}>
      <CodeCardHeader
        filename={`${code.toLowerCase()}.course`}
        status={statusBadgeVariant}
        rightContent={
          <span className={cn(
            'text-xs px-1.5 py-0.5 rounded font-medium',
            status === 'active' && 'bg-traffic-green/10 text-traffic-green',
            status === 'pending' && 'bg-traffic-yellow/10 text-traffic-yellow',
            status === 'rejected' && 'bg-traffic-red/10 text-traffic-red',
            status === 'draft' && 'bg-muted text-muted-foreground'
          )}>
            {statusLabel}
          </span>
        }
      />

      <CodeCardBody className="flex-1">
        {/* export course [Name] */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-traffic-red">export</span>
          <span className="text-syntax-key">course</span>
          <span className="px-2 py-0.5 rounded bg-foreground text-background text-xs font-medium">
            {name}
          </span>
        </div>

        {/* // Faculty */}
        <div className="mb-3">
          <span className="text-syntax-comment">// {faculty}</span>
        </div>

        {/* ○ requirements : */}
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <span className="text-traffic-yellow">○</span>
            <span className="text-traffic-yellow">requirements</span>
            <span className="text-foreground">:</span>
          </div>
          <div className="ml-4 flex flex-wrap gap-1.5">
            {minimumAps && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-traffic-yellow/10 text-traffic-yellow">
                APS: {minimumAps}
              </span>
            )}
            {durationYears && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                {durationYears}yr
              </span>
            )}
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded',
              status === 'active' ? 'bg-traffic-green/10 text-traffic-green' : 'bg-muted text-muted-foreground'
            )}>
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Optional description */}
        {description && (
          <div className="mt-3 text-xs text-syntax-comment line-clamp-2">
            // {description}
          </div>
        )}
      </CodeCardBody>

      <CodeCardFooter>
        {/* 📊 applications: # */}
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 text-sm font-mono">
            <span>📊</span>
            <span className="text-muted-foreground">applications:</span>
            <span className="text-traffic-green">{applications}</span>
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 min-h-[32px]">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
              aria-label="Edit course"
            >
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
              aria-label="Delete course"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </button>
          )}
          {onViewApplications && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onViewApplications()
              }}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
              aria-label="View applications"
            >
              <Eye className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </CodeCardFooter>
    </CodeCard>
  )
}

// Category card (grid style)
interface CategoryCardProps {
  icon?: React.ReactNode
  name: string
  slug: string
  itemCount: number
  itemLabel?: string
  onClick?: () => void
  className?: string
}

export function CategoryCard({
  icon = '📁',
  name,
  slug,
  itemCount,
  itemLabel = 'items',
  onClick,
  className,
}: CategoryCardProps) {
  return (
    <CodeCard
      className={cn(onClick && 'cursor-pointer hover:bg-muted/5', className)}
    >
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="font-mono text-sm">{slug}/</span>
        </div>
        <ModuleBadge />
      </div>
      <CodeCardBody>
        <div>
          <span className="text-syntax-key">"name"</span>
          <span className="text-foreground"> : </span>
          <span className="text-syntax-string">"{name}"</span>
        </div>
        <div>
          <span className="text-syntax-key">"{itemLabel}"</span>
          <span className="text-foreground"> : </span>
          <span className="text-syntax-number">{itemCount}</span>
          <span className="text-syntax-comment"> // active</span>
        </div>
      </CodeCardBody>
      <div className="px-4 py-2 border-t border-border">
        <span className="font-mono text-xs text-syntax-comment">
          $ cd {slug} && ls
        </span>
      </div>
    </CodeCard>
  )
}

// Application card
interface ApplicationCardProps {
  id: string
  applicantName: string
  email: string
  course: string
  campus?: string
  apsScore: number
  status: 'active' | 'pending' | 'rejected' | 'draft'
  documentsComplete: number
  documentsTotal: number
  appliedDate: string
  onClick?: () => void
  className?: string
}

export function ApplicationCard({
  id,
  applicantName,
  email,
  course,
  campus,
  apsScore,
  status,
  documentsComplete,
  documentsTotal,
  appliedDate,
  onClick,
  className,
}: ApplicationCardProps) {
  return (
    <CodeCard
      className={cn(onClick && 'cursor-pointer', className)}
    >
      <CodeCardHeader
        filename={`${id.toLowerCase()}.tsx`}
        status={status === 'pending' ? 'warning' : status === 'active' ? 'active' : 'error'}
        rightContent={
          <span className="inline-flex items-center gap-1 text-sm font-mono">
            <span className="text-muted-foreground">APS:</span>
            <span className="text-traffic-green">{apsScore}</span>
          </span>
        }
      />
      <CodeCardBody>
        <div>
          <span className="text-syntax-export">export applicant</span>
          <span className="text-syntax-string"> "{applicantName}"</span>
        </div>
        <div className="flex items-center gap-1">
          <span>📧</span>
          <span className="text-syntax-from">from</span>
          <span className="text-syntax-string">"{email}"</span>
        </div>
        <div className="text-syntax-comment">//</div>
        <div className="text-syntax-comment">// {course}{campus ? ` - ${campus}` : ''}</div>
        <div className="text-syntax-comment">// Applied: {appliedDate}</div>
      </CodeCardBody>
      <CodeCardFooter>
        <div className="flex items-center gap-4">
          <StatusBadge status={status} />
          <span className="inline-flex items-center gap-1.5 text-sm">
            <span>📋</span>
            <span className="text-muted-foreground">docs:</span>
            <span className={cn(
              'font-mono',
              documentsComplete === documentsTotal ? 'text-traffic-green' : 'text-traffic-yellow'
            )}>
              {documentsComplete}/{documentsTotal}
            </span>
          </span>
        </div>
      </CodeCardFooter>
    </CodeCard>
  )
}

// Stats/chart card
interface StatsCardProps {
  filename: string
  children: React.ReactNode
  comment?: string
  className?: string
}

export function StatsCard({
  filename,
  children,
  comment,
  className,
}: StatsCardProps) {
  return (
    <CodeCard className={className}>
      <CodeCardHeader filename={filename} status="active" />
      <CodeCardContent padding="md">
        {children}
      </CodeCardContent>
      {comment && (
        <div className="px-4 py-2 border-t border-border">
          <span className="font-mono text-xs text-syntax-comment">
            // {comment}
          </span>
        </div>
      )}
    </CodeCard>
  )
}
