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
              className={cn(
                'relative flex items-center',
                index !== steps.length - 1 && 'flex-1'
              )}
            >
              <div className="flex flex-col items-center">
                {/* Step Circle */}
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-200',
                    isCompleted &&
                      'border-foreground bg-foreground text-background',
                    isCurrent &&
                      'border-foreground bg-background text-foreground',
                    isUpcoming && 'border-border bg-background text-foreground/40'
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>

                {/* Step Name */}
                <span
                  className={cn(
                    'mt-2 text-xs font-medium transition-colors duration-200',
                    (isCompleted || isCurrent) && 'text-foreground',
                    isUpcoming && 'text-foreground/40'
                  )}
                >
                  {step.name}
                </span>
              </div>

              {/* Connector Line */}
              {index !== steps.length - 1 && (
                <div
                  className={cn(
                    'absolute left-[calc(50%+1.25rem)] right-[calc(-50%+1.25rem)] top-5 h-0.5 transition-colors duration-200',
                    isCompleted ? 'bg-foreground' : 'bg-border'
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
