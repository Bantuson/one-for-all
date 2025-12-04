'use client'

import * as React from 'react'
import { useFormContext, Controller } from 'react-hook-form'
import { Label } from './Label'
import { Input } from './Input'
import { cn } from '@/lib/utils'

export interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string
  label: string
  description?: string
  error?: string
}

export function FormField({
  name,
  label,
  description,
  error,
  className,
  ...props
}: FormFieldProps) {
  const { control } = useFormContext()

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Input
            id={name}
            className={cn(error && 'border-red-500 focus-visible:ring-red-500', className)}
            {...field}
            {...props}
          />
        )}
      />
      {description && !error && (
        <p className="text-xs text-foreground/60">{description}</p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
