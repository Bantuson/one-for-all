'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DialogTitle } from './Dialog'

interface ModalHeaderProps {
  title: string
  onClose: () => void
  className?: string
}

export function ModalHeader({ title, onClose, className }: ModalHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between',
        'px-6 py-4 border-b',
        'bg-white dark:bg-black',
        'border-gray-200 dark:border-gray-800',
        className
      )}
    >
      <DialogTitle className="text-lg font-semibold tracking-tight">{title}</DialogTitle>
      <button
        onClick={onClose}
        className="rounded-sm opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-foreground focus:ring-offset-2"
        aria-label="Close modal"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  )
}
