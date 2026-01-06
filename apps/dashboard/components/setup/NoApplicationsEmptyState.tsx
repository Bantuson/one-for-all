'use client'

import { FileText, MoveLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface NoApplicationsEmptyStateProps {
  courseName: string
  onBack: () => void
}

export function NoApplicationsEmptyState({ courseName, onBack }: NoApplicationsEmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        {/* Terminal-styled empty state with rich icon */}
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-lg border border-border bg-muted/30 -translate-y-[22px]">
            <div className="relative">
              <FileText className="h-10 w-10 text-muted-foreground/50" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center">
                <span className="text-[10px] text-muted-foreground font-mono">0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Terminal-style code comment */}
        <div className="font-mono text-sm space-y-2 mb-6">
          <p className="text-muted-foreground truncate px-4">
            <span className="text-traffic-green">//</span> No applications found for course: "{courseName}"
          </p>
          <p className="mt-[2px]">
            <span className="text-purple-500">const</span>
            <span className="text-foreground ml-1">applications</span>
            <span className="text-yellow-500 ml-1">=</span>
            <span className="text-syntax-string ml-1">[]</span>
            <span className="text-red-500">;</span>
          </p>
        </div>

        {/* Back button */}
        <div className="mt-6">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-traffic-red hover:text-traffic-red/80 -translate-y-4">
            <MoveLeft className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
