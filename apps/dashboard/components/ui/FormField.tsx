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

// JSON-style label: "fieldName" :
interface SyntaxLabelProps {
  name: string
  required?: boolean
  className?: string
}

export function SyntaxLabel({ name, required, className }: SyntaxLabelProps) {
  return (
    <label className={cn('block font-mono text-sm', className)}>
      <span className="text-syntax-key">"{name}"</span>
      <span className="text-foreground"> :</span>
      {required && <span className="text-destructive ml-1">*</span>}
    </label>
  )
}

// Syntax-styled form field with JSON label
export interface SyntaxFormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string
  label: string
  description?: string
  error?: string
  showQuotesInInput?: boolean
}

export function SyntaxFormField({
  name,
  label,
  description,
  error,
  className,
  showQuotesInInput = false,
  required,
  ...props
}: SyntaxFormFieldProps) {
  const { control } = useFormContext()

  return (
    <div className="space-y-2">
      <SyntaxLabel name={label} required={required} />
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <div className="relative">
            {showQuotesInInput && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-syntax-string font-mono">
                "
              </span>
            )}
            <Input
              id={name}
              className={cn(
                'font-mono',
                showQuotesInInput && 'pl-6 pr-6',
                error && 'border-destructive focus-visible:ring-destructive',
                className
              )}
              {...field}
              {...props}
            />
            {showQuotesInInput && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-syntax-string font-mono">
                "
              </span>
            )}
          </div>
        )}
      />
      {description && !error && (
        <p className="text-xs text-syntax-comment font-mono">// {description}</p>
      )}
      {error && (
        <p className="text-xs text-destructive font-mono">// Error: {error}</p>
      )}
    </div>
  )
}

// Standalone syntax input (no form context required)
export interface SyntaxInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  description?: string
  error?: string
  showQuotes?: boolean
}

export function SyntaxInput({
  label,
  description,
  error,
  className,
  showQuotes = false,
  required,
  ...props
}: SyntaxInputProps) {
  return (
    <div className="space-y-2">
      <SyntaxLabel name={label} required={required} />
      <div className="relative">
        {showQuotes && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-syntax-string font-mono">
            "
          </span>
        )}
        <Input
          className={cn(
            'font-mono',
            showQuotes && 'pl-6 pr-6',
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          {...props}
        />
        {showQuotes && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-syntax-string font-mono">
            "
          </span>
        )}
      </div>
      {description && !error && (
        <p className="text-xs text-syntax-comment font-mono">// {description}</p>
      )}
      {error && (
        <p className="text-xs text-destructive font-mono">// Error: {error}</p>
      )}
    </div>
  )
}

// Syntax textarea for longer text
export interface SyntaxTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  description?: string
  error?: string
}

export function SyntaxTextarea({
  label,
  description,
  error,
  className,
  placeholder,
  required,
  ...props
}: SyntaxTextareaProps) {
  return (
    <div className="space-y-2">
      <SyntaxLabel name={label} required={required} />
      <textarea
        className={cn(
          'flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2',
          'font-mono text-sm',
          'placeholder:text-syntax-comment',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive focus-visible:ring-destructive',
          className
        )}
        placeholder={placeholder || `// Enter ${label}...`}
        {...props}
      />
      {description && !error && (
        <p className="text-xs text-syntax-comment font-mono">// {description}</p>
      )}
      {error && (
        <p className="text-xs text-destructive font-mono">// Error: {error}</p>
      )}
    </div>
  )
}
