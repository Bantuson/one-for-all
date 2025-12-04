'use client'

import * as React from 'react'
import { Upload, X, FileIcon } from 'lucide-react'
import { Label } from './Label'
import { cn } from '@/lib/utils'

export interface FileUploadFieldProps {
  label: string
  name: string
  accept?: string
  maxSize?: number // in MB
  value?: File | null
  onChange: (file: File | null) => void
  error?: string
  description?: string
  preview?: boolean
  className?: string
}

export function FileUploadField({
  label,
  name,
  accept = 'image/*',
  maxSize = 5,
  value,
  onChange,
  error,
  description,
  preview = true,
  className,
}: FileUploadFieldProps) {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (value && preview && value.type.startsWith('image/')) {
      const url = URL.createObjectURL(value)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
    setPreviewUrl(null)
    return undefined
  }, [value, preview])

  const handleFileChange = (file: File | null) => {
    if (!file) {
      onChange(null)
      return
    }

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      onChange(null)
      return
    }

    onChange(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileChange(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleRemove = () => {
    onChange(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={name}>{label}</Label>

      {!value ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-background px-6 py-10 transition-colors',
            'hover:border-foreground/50 hover:bg-foreground/5',
            isDragging && 'border-foreground bg-foreground/10',
            error && 'border-red-500',
            className
          )}
        >
          <Upload className="mb-3 h-10 w-10 text-foreground/40" />
          <p className="mb-1 text-sm font-medium">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-foreground/60">
            {accept.includes('image') ? 'PNG, JPG, GIF' : 'Any file'} up to {maxSize}MB
          </p>
          <input
            ref={inputRef}
            id={name}
            name={name}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0] || null
              handleFileChange(file)
            }}
          />
        </div>
      ) : (
        <div className="relative flex items-center gap-3 rounded-lg border border-border bg-background p-4">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Preview"
              className="h-16 w-16 rounded object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded bg-foreground/5">
              <FileIcon className="h-8 w-8 text-foreground/40" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{value.name}</p>
            <p className="text-xs text-foreground/60">
              {(value.size / 1024).toFixed(2)} KB
            </p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="rounded-full p-1 hover:bg-foreground/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {description && !error && (
        <p className="text-xs text-foreground/60">{description}</p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
