import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'outline' | 'ghost' | 'destructive' | 'link'
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-semibold transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          {
            // Default - neutral gray/white
            'bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100':
              variant === 'default',
            // Primary - amber accent
            'bg-primary text-primary-foreground hover:bg-primary/90':
              variant === 'primary',
            // Outline - amber border
            'border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground':
              variant === 'outline',
            // Ghost - subtle hover
            'hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
            // Destructive - red
            'bg-destructive text-destructive-foreground hover:bg-destructive/90':
              variant === 'destructive',
            // Link - text only
            'text-primary underline-offset-4 hover:underline': variant === 'link',
          },
          {
            'h-9 px-4 text-sm': size === 'sm',
            'h-11 px-6 text-base': size === 'md',
            'h-14 px-8 text-lg': size === 'lg',
            'h-10 w-10 p-0': size === 'icon',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button }
