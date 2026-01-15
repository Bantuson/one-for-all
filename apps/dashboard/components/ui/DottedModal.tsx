'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { ModalHeader } from './ModalHeader'

interface DottedModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
  headerExtra?: React.ReactNode
}

export function DottedModal({
  isOpen,
  onClose,
  title,
  children,
  className,
  headerExtra,
}: DottedModalProps) {
  // Handle escape key
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={cn(
            'relative w-full max-w-md max-h-[90vh] overflow-y-auto',
            'rounded-lg border border-border',
            'bg-card',
            // Dotted background pattern
            'bg-[radial-gradient(rgba(255,255,255,0.08)_1.4px,transparent_1.4px)]',
            'dark:bg-[radial-gradient(rgba(255,255,255,0.15)_1.4px,transparent_1.4px)]',
            'bg-[length:32px_32px]',
            className
          )}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <ModalHeader title={title} onClose={onClose} extra={headerExtra} />
          {children}
        </div>
      </div>
    </div>
  )
}

// Modal content wrapper with consistent padding
interface DottedModalContentProps {
  children: React.ReactNode
  className?: string
}

export function DottedModalContent({ children, className }: DottedModalContentProps) {
  return (
    <div className={cn('p-6', className)}>
      {children}
    </div>
  )
}

// Modal footer with consistent styling
interface DottedModalFooterProps {
  children: React.ReactNode
  className?: string
}

export function DottedModalFooter({ children, className }: DottedModalFooterProps) {
  return (
    <div className={cn('px-6 py-4 border-t border-border bg-card flex justify-end gap-3', className)}>
      {children}
    </div>
  )
}
