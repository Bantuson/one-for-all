'use client'

import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Step {
  id: number
  name: string
}

export interface StepperProps {
  steps: Step[]
  currentStep: number
  className?: string
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <nav aria-label="Progress" className={cn('w-full', className)}>
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id
          const isCurrent = currentStep === step.id
          const isUpcoming = currentStep < step.id

          return (
            <li
              key={step.id}
              className="relative flex-1 flex justify-center"
            >
              <div className="flex flex-col items-center">
                {/* Step Circle - Terminal Style */}
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 font-mono text-sm transition-all duration-200',
                    isCompleted &&
                      'border-traffic-green bg-traffic-green/10 text-traffic-green',
                    isCurrent &&
                      'border-primary bg-primary/10 text-primary',
                    isUpcoming && 'border-border bg-muted/30 text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span>[{step.id}]</span>
                  )}
                </div>

                {/* Step Name - Terminal Style */}
                <span
                  className={cn(
                    'mt-2 text-xs font-mono transition-colors duration-200',
                    isCompleted && 'text-traffic-green',
                    isCurrent && 'text-foreground',
                    isUpcoming && 'text-muted-foreground'
                  )}
                >
                  {step.name}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

// Alternative compact stepper for tight spaces
export interface CompactStepperProps {
  steps: Step[]
  currentStep: number
  className?: string
}

export function CompactStepper({ steps, currentStep, className }: CompactStepperProps) {
  return (
    <nav aria-label="Progress" className={cn('w-full', className)}>
      <div className="flex items-center gap-2 font-mono text-xs">
        <span className="text-syntax-comment">// Step {currentStep + 1} of {steps.length}:</span>
        <span className="text-foreground">{steps[currentStep]?.name}</span>
      </div>
      <div className="flex items-center mt-2">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id
          const isCurrent = currentStep === step.id

          return (
            <React.Fragment key={step.id}>
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full transition-colors',
                  isCompleted && 'bg-traffic-green',
                  isCurrent && 'bg-primary',
                  !isCompleted && !isCurrent && 'bg-border'
                )}
              />
            </React.Fragment>
          )
        })}
      </div>
    </nav>
  )
}
