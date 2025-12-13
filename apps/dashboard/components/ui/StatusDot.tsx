'use client'

import { cn } from '@/lib/utils'

export type StatusDotColor = 'green' | 'yellow' | 'red' | 'blue' | 'gray'

interface StatusDotProps {
  color?: StatusDotColor
  size?: 'xs' | 'sm' | 'md' | 'lg'
  pulse?: boolean
  className?: string
}

const sizeMap = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
}

const colorMap = {
  green: 'bg-traffic-green',
  yellow: 'bg-traffic-yellow',
  red: 'bg-traffic-red',
  blue: 'bg-blue-500',
  gray: 'bg-gray-400 dark:bg-gray-500',
}

const glowMap = {
  green: 'shadow-[0_0_6px_rgba(34,197,94,0.5)]',
  yellow: 'shadow-[0_0_6px_rgba(250,204,21,0.5)]',
  red: 'shadow-[0_0_6px_rgba(239,68,68,0.5)]',
  blue: 'shadow-[0_0_6px_rgba(59,130,246,0.5)]',
  gray: '',
}

export function StatusDot({
  color = 'gray',
  size = 'sm',
  pulse = false,
  className,
}: StatusDotProps) {
  return (
    <span
      className={cn(
        'inline-block rounded-full',
        sizeMap[size],
        colorMap[color],
        color !== 'gray' && glowMap[color],
        pulse && 'animate-pulse-dot',
        className
      )}
      aria-hidden="true"
    />
  )
}

// Convenience component for status with label
interface StatusWithLabelProps {
  color?: StatusDotColor
  label: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  pulse?: boolean
  className?: string
}

export function StatusWithLabel({
  color = 'gray',
  label,
  size = 'sm',
  pulse = false,
  className,
}: StatusWithLabelProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <StatusDot color={color} size={size} pulse={pulse} />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  )
}
