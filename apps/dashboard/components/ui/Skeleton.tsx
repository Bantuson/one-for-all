'use client'

import { cn } from '@/lib/utils'

// ============================================================================
// Base Skeleton Component
// ============================================================================

interface SkeletonProps {
  className?: string
  style?: React.CSSProperties
}

/**
 * Base skeleton component with animated pulse effect.
 * Used as the building block for all skeleton UI elements.
 */
export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-muted/40 rounded',
        className
      )}
      style={style}
      aria-hidden="true"
    />
  )
}

// ============================================================================
// Traffic Lights Skeleton
// ============================================================================

/**
 * Skeleton for the traffic light dots in CodeCard headers.
 */
function TrafficLightsSkeleton() {
  return (
    <div className="flex items-center gap-1.5">
      <Skeleton className="w-3 h-3 rounded-full" />
      <Skeleton className="w-3 h-3 rounded-full" />
      <Skeleton className="w-3 h-3 rounded-full" />
    </div>
  )
}

// ============================================================================
// CodeCard Skeleton
// ============================================================================

interface CodeCardSkeletonProps {
  className?: string
  /** Show footer section */
  showFooter?: boolean
  /** Number of permission lines to show */
  permissionLines?: number
}

/**
 * CodeCardSkeleton - Matches the exact structure of CodeCard/RoleCard.
 *
 * Structure:
 * - Header: Traffic lights + filename placeholder
 * - Body: Role name, description, permissions section
 * - Footer: Member count + action buttons
 */
export function CodeCardSkeleton({
  className,
  showFooter = true,
  permissionLines = 3,
}: CodeCardSkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card overflow-hidden',
        'h-full flex flex-col',
        className
      )}
      role="status"
      aria-label="Loading content"
    >
      {/* Header: Traffic lights + filename */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrafficLightsSkeleton />
            <Skeleton className="h-4 w-32" />
          </div>
          {/* Right content placeholder (badges) */}
          <Skeleton className="h-5 w-16" />
        </div>
      </div>

      {/* Body: Code-style content */}
      <div className="font-mono text-sm space-y-3 p-4 flex-1">
        {/* Role name line: "export role [Badge]" */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>

        {/* Description lines (comment style) */}
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>

        {/* Permissions section */}
        <div className="space-y-2 pt-1">
          {/* Permissions header */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-3.5 rounded" />
            <Skeleton className="h-3 w-24" />
          </div>
          {/* Permission lines (indented) */}
          <div className="ml-5 space-y-1.5">
            {Array.from({ length: permissionLines }).map((_, index) => (
              <div key={index} className="flex items-center gap-2">
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton
                  className="h-3"
                  style={{ width: `${60 + Math.random() * 30}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer: Member count + action buttons */}
      {showFooter && (
        <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-between gap-4">
          {/* Member count */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Roles Tab Skeleton
// ============================================================================

interface RolesTabSkeletonProps {
  /** Number of cards to show */
  count?: number
  className?: string
}

/**
 * RolesTabSkeleton - 2x2 grid of CodeCardSkeletons for the roles tab.
 */
export function RolesTabSkeleton({ count = 4, className }: RolesTabSkeletonProps) {
  return (
    <div
      className={cn('grid gap-4 md:grid-cols-2', className)}
      role="status"
      aria-label="Loading roles"
    >
      {Array.from({ length: count }).map((_, index) => (
        <CodeCardSkeleton key={index} permissionLines={2 + (index % 2)} />
      ))}
    </div>
  )
}

// ============================================================================
// Member Row Skeleton
// ============================================================================

/**
 * Single member row skeleton for the members list.
 */
function MemberRowSkeleton() {
  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-border last:border-b-0">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <Skeleton className="w-10 h-10 rounded-full" />
        {/* Name and email */}
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        {/* Role badge */}
        <Skeleton className="h-6 w-16 rounded-full" />
        {/* Action button */}
        <Skeleton className="h-8 w-8 rounded" />
      </div>
    </div>
  )
}

// ============================================================================
// Members Tab Skeleton
// ============================================================================

interface MembersTabSkeletonProps {
  /** Number of member rows to show */
  memberCount?: number
  className?: string
}

/**
 * MembersTabSkeleton - CodeCard-style container with member row skeletons.
 */
export function MembersTabSkeleton({
  memberCount = 3,
  className,
}: MembersTabSkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card overflow-hidden',
        className
      )}
      role="status"
      aria-label="Loading team members"
    >
      {/* Header: Traffic lights + filename */}
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrafficLightsSkeleton />
            <Skeleton className="h-4 w-28" />
          </div>
          {/* Count badge */}
          <Skeleton className="h-5 w-12" />
        </div>
      </div>

      {/* Member rows */}
      <div>
        {Array.from({ length: memberCount }).map((_, index) => (
          <MemberRowSkeleton key={index} />
        ))}
      </div>

      {/* Footer with invite button placeholder */}
      <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center justify-end">
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
    </div>
  )
}

// ============================================================================
// Team Page Skeleton
// ============================================================================

interface TeamPageSkeletonProps {
  className?: string
}

/**
 * TeamPageSkeleton - Full page skeleton for the team management page.
 * Wraps MembersTabSkeleton with proper page layout constraints.
 */
export function TeamPageSkeleton({ className }: TeamPageSkeletonProps) {
  return (
    <div className={cn('relative', className)}>
      {/* Back arrow placeholder */}
      <div className="absolute left-5 top-[8px]">
        <Skeleton className="h-6 w-6 rounded" />
      </div>

      {/* Tab navigation */}
      <div className="max-w-[70%] mx-auto mt-[20px] flex items-center">
        {/* Members tab (active) */}
        <div className="flex items-center gap-2 px-4 py-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-6 rounded bg-traffic-green/20" />
        </div>
        {/* Roles tab (inactive) */}
        <div className="flex items-center gap-2 px-4 py-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-5 w-6 rounded" />
        </div>
      </div>

      {/* Members CodeCard */}
      <div className="max-w-[70%] mx-auto mt-[34px]">
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrafficLightsSkeleton />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-6 w-16 rounded" />
          </div>

          {/* Member rows (no footer) */}
          <div className="divide-y divide-border">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Additional Utility Skeletons
// ============================================================================

/**
 * Text skeleton with predefined sizes.
 */
interface TextSkeletonProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  width?: string
  className?: string
}

export function TextSkeleton({ size = 'md', width, className }: TextSkeletonProps) {
  const sizeClasses = {
    sm: 'h-3',
    md: 'h-4',
    lg: 'h-5',
    xl: 'h-6',
  }

  return (
    <Skeleton
      className={cn(sizeClasses[size], className)}
      style={width ? { width } : undefined}
    />
  )
}

/**
 * Avatar skeleton component.
 */
interface AvatarSkeletonProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function AvatarSkeleton({ size = 'md', className }: AvatarSkeletonProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }

  return (
    <Skeleton className={cn(sizeClasses[size], 'rounded-full', className)} />
  )
}

/**
 * Button skeleton component.
 */
interface ButtonSkeletonProps {
  size?: 'sm' | 'md' | 'lg' | 'icon'
  className?: string
}

export function ButtonSkeleton({ size = 'md', className }: ButtonSkeletonProps) {
  const sizeClasses = {
    sm: 'h-8 w-16',
    md: 'h-9 w-24',
    lg: 'h-10 w-32',
    icon: 'h-9 w-9',
  }

  return (
    <Skeleton className={cn(sizeClasses[size], 'rounded-md', className)} />
  )
}
