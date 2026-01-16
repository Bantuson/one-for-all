'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TrafficLights } from './TrafficLights'

interface ModalHeaderProps {
  title: string
  onClose: () => void
  className?: string
  extra?: React.ReactNode
}

export function ModalHeader({ title, onClose, className, extra }: ModalHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between',
        'px-4 py-2.5 border-b border-border',
        'bg-card',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <TrafficLights status="active" size="sm" />
        <h2 className="font-mono text-sm">
          <span className="text-syntax-export">export</span>
          <span className="text-syntax-key ml-2">{title}</span>
        </h2>
      </div>
      <div className="flex items-center gap-3">
        {extra}
        <button
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
          aria-label="Close modal"
        >
          <X className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}
