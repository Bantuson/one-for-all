'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TrafficLights } from './TrafficLights'

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

// VisuallyHidden component for accessibility
const VisuallyHidden = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn(
      'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0',
      className
    )}
    style={{
      clip: 'rect(0, 0, 0, 0)',
      clipPath: 'inset(50%)',
    }}
    {...props}
  />
))
VisuallyHidden.displayName = 'VisuallyHidden'

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = 'DialogOverlay'

interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  hideCloseButton?: boolean
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, hideCloseButton = false, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%]',
        'border border-border shadow-lg duration-200',
        // Clean card background
        'bg-card',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
        'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
        'rounded-lg overflow-hidden',
        className
      )}
      {...props}
    >
      {children}
      {!hideCloseButton && (
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = 'DialogContent'

// Code editor style dialog content
interface CodeDialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  filename?: string
  status?: 'active' | 'warning' | 'error' | 'neutral'
  hideCloseButton?: boolean
}

const CodeDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  CodeDialogContentProps
>(({ className, children, filename, status = 'active', hideCloseButton = false, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%]',
        'border border-border shadow-lg duration-200',
        'bg-card',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
        'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
        'rounded-lg overflow-hidden',
        className
      )}
      {...props}
    >
      {/* Traffic Lights Header */}
      {filename && (
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrafficLights status={status} size="sm" />
            <span className="font-mono text-sm text-foreground">{filename}</span>
          </div>
          {!hideCloseButton && (
            <DialogPrimitive.Close className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors">
              $ close
            </DialogPrimitive.Close>
          )}
        </div>
      )}
      {children}
      {!filename && !hideCloseButton && (
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
))
CodeDialogContent.displayName = 'CodeDialogContent'

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
)
DialogHeader.displayName = 'DialogHeader'

// Code-style header with path display
interface CodeDialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  path?: string
  subtitle?: string
}

const CodeDialogHeader = ({ className, path, subtitle, children, ...props }: CodeDialogHeaderProps) => (
  <div className={cn('p-4 border-b border-border', className)} {...props}>
    {path && (
      <div className="font-mono text-sm text-muted-foreground mb-2">
        <span className="text-syntax-dollar">$</span>
        <span className="text-syntax-command"> pwd:</span>
        <span className="text-foreground"> {path}</span>
      </div>
    )}
    {children}
    {subtitle && (
      <p className="font-mono text-xs text-syntax-comment mt-1">// {subtitle}</p>
    )}
  </div>
)
CodeDialogHeader.displayName = 'CodeDialogHeader'

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
    {...props}
  />
)
DialogFooter.displayName = 'DialogFooter'

// Code-style footer with command buttons
const CodeDialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'px-4 py-3 border-t border-border bg-muted/20',
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      className
    )}
    {...props}
  />
)
CodeDialogFooter.displayName = 'CodeDialogFooter'

// Body content area
const CodeDialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-4', className)} {...props} />
)
CodeDialogBody.displayName = 'CodeDialogBody'

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
))
DialogTitle.displayName = 'DialogTitle'

// Code-style title with export keyword
interface CodeDialogTitleProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title> {
  showExport?: boolean
}

const CodeDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  CodeDialogTitleProps
>(({ className, showExport = true, children, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('font-mono text-lg leading-none', className)}
    {...props}
  >
    {showExport && <span className="text-syntax-export">export default </span>}
    <span className="text-syntax-string">"{children}"</span>
  </DialogPrimitive.Title>
))
CodeDialogTitle.displayName = 'CodeDialogTitle'

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-foreground/70', className)}
    {...props}
  />
))
DialogDescription.displayName = 'DialogDescription'

// Code-style description as comment
const CodeDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('font-mono text-sm text-syntax-comment', className)}
    {...props}
  >
    // {children}
  </DialogPrimitive.Description>
))
CodeDialogDescription.displayName = 'CodeDialogDescription'

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  VisuallyHidden,
  // Code-style variants
  CodeDialogContent,
  CodeDialogHeader,
  CodeDialogFooter,
  CodeDialogBody,
  CodeDialogTitle,
  CodeDialogDescription,
}
