'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DialogTitle } from './Dialog'
import { TrafficLights } from './TrafficLights'

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
        'px-6 py-4 border-b border-border',
        'bg-card',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <TrafficLights status="active" size="sm" />
        <DialogTitle className="font-mono text-lg">
          <span className="text-syntax-export">export</span>
          <span className="text-syntax-key ml-2">{title}</span>
        </DialogTitle>
      </div>
      <button
        onClick={onClose}
        className="p-1.5 rounded-md hover:bg-muted transition-colors"
        aria-label="Close modal"
      >
        <X className="h-5 w-5 text-muted-foreground" />
      </button>
    </div>
  )
}
