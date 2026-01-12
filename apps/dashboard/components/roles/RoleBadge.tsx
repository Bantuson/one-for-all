'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

interface RoleBadgeProps {
  /** The role name to display */
  name: string
  /** The background color for the badge (hex, rgb, or css color) */
  color: string
  /** Size variant of the badge */
  size?: 'sm' | 'md'
  /** Additional class names */
  className?: string
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Determines if a color is light or dark to set appropriate text color
 * Uses relative luminance calculation
 */
function isLightColor(color: string): boolean {
  // Handle hex colors
  let r = 0, g = 0, b = 0

  if (color.startsWith('#')) {
    const hex = color.replace('#', '')
    if (hex.length === 3) {
      const h0 = hex[0] ?? '0'
      const h1 = hex[1] ?? '0'
      const h2 = hex[2] ?? '0'
      r = parseInt(h0 + h0, 16)
      g = parseInt(h1 + h1, 16)
      b = parseInt(h2 + h2, 16)
    } else if (hex.length === 6) {
      r = parseInt(hex.slice(0, 2), 16)
      g = parseInt(hex.slice(2, 4), 16)
      b = parseInt(hex.slice(4, 6), 16)
    }
  } else if (color.startsWith('rgb')) {
    const match = color.match(/\d+/g)
    if (match && match.length >= 3) {
      r = parseInt(match[0] ?? '0', 10)
      g = parseInt(match[1] ?? '0', 10)
      b = parseInt(match[2] ?? '0', 10)
    }
  } else {
    // For named colors or other formats, default to assuming dark
    return false
  }

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5
}

// ============================================================================
// Component
// ============================================================================

/**
 * RoleBadge - A small colored badge for displaying role name
 *
 * Uses terminal/code aesthetic matching the project design system.
 * Automatically adjusts text color based on background luminance.
 */
export function RoleBadge({
  name,
  color,
  size = 'md',
  className,
}: RoleBadgeProps) {
  const textColor = isLightColor(color) ? '#000000' : '#ffffff'

  return (
    <span
      className={cn(
        'inline-flex items-center font-mono rounded-md transition-colors',
        'border border-transparent',
        size === 'sm' && 'px-1.5 py-0.5 text-[10px]',
        size === 'md' && 'px-2 py-1 text-xs',
        className
      )}
      style={{
        backgroundColor: color,
        color: textColor,
      }}
      role="status"
      aria-label={`Role: ${name}`}
    >
      {name}
    </span>
  )
}

export default RoleBadge
