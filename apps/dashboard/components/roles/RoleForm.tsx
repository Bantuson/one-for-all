'use client'

import * as React from 'react'
import { Loader2, AlertCircle, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Button } from '@/components/ui/Button'
import {
  CodeCard,
  CodeCardHeader,
  CodeCardBody,
  CodeCardFooter,
} from '@/components/ui/CodeCard'
import { Permission } from '@/lib/constants/permissions'
import { RolePermissionGrid } from './RolePermissionGrid'
import { RoleBadge } from './RoleBadge'
import { useCreateRole, useUpdateRole } from './hooks/useRoleMutations'
import type { Role } from './RoleSelector'

// ============================================================================
// Types
// ============================================================================

interface RoleFormProps {
  /** Institution ID for the role */
  institutionId: string
  /** Existing role to edit (if editing) */
  role?: Role
  /** Callback on successful save */
  onSuccess?: (role: Role) => void
  /** Callback when cancel is clicked */
  onCancel?: () => void
  /** Additional class names */
  className?: string
}

interface FormState {
  name: string
  description: string
  permissions: Permission[]
  color: string
  isDefault: boolean
}

interface FormErrors {
  name?: string
  permissions?: string
  general?: string
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#6b7280', // gray
  '#1f2937', // dark gray
]

const INITIAL_FORM_STATE: FormState = {
  name: '',
  description: '',
  permissions: [],
  color: DEFAULT_COLORS[5] ?? '#3b82f6', // Default to blue
  isDefault: false,
}

// ============================================================================
// Component
// ============================================================================

/**
 * RoleForm - Create/Edit role form
 *
 * Handles both create and edit modes.
 * Includes name, description, permissions grid, color picker, and isDefault toggle.
 */
export function RoleForm({
  institutionId,
  role,
  onSuccess,
  onCancel,
  className,
}: RoleFormProps) {
  const isEditing = !!role
  const createRole = useCreateRole(institutionId)
  const updateRole = useUpdateRole(institutionId, role?.id ?? '')

  const [formState, setFormState] = React.useState<FormState>(() => {
    if (role) {
      return {
        name: role.name,
        description: role.description ?? '',
        permissions: role.permissions,
        color: role.color,
        isDefault: role.isDefault,
      }
    }
    return INITIAL_FORM_STATE
  })

  const [errors, setErrors] = React.useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleFieldChange = React.useCallback(
    <K extends keyof FormState>(field: K, value: FormState[K]) => {
      setFormState((prev) => ({ ...prev, [field]: value }))
      // Clear field error when value changes
      if (errors[field as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }))
      }
    },
    [errors]
  )

  const validateForm = React.useCallback((): boolean => {
    const newErrors: FormErrors = {}

    if (!formState.name.trim()) {
      newErrors.name = 'Role name is required'
    } else if (formState.name.length < 2) {
      newErrors.name = 'Role name must be at least 2 characters'
    } else if (formState.name.length > 50) {
      newErrors.name = 'Role name must be less than 50 characters'
    }

    if (formState.permissions.length === 0) {
      newErrors.permissions = 'At least one permission is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formState])

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()

      if (!validateForm()) return

      setIsSubmitting(true)
      setErrors({})

      try {
        const payload = {
          name: formState.name.trim(),
          description: formState.description.trim() || null,
          permissions: formState.permissions,
          color: formState.color,
          isDefault: formState.isDefault,
        }

        let result: Role

        if (isEditing) {
          result = await updateRole.mutateAsync(payload)
        } else {
          result = await createRole.mutateAsync(payload)
        }

        onSuccess?.(result)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'An unexpected error occurred'
        setErrors({ general: message })
      } finally {
        setIsSubmitting(false)
      }
    },
    [formState, validateForm, isEditing, createRole, updateRole, onSuccess]
  )

  return (
    <form onSubmit={handleSubmit} className={className}>
      <CodeCard>
        <CodeCardHeader
          filename={isEditing ? `edit-${role.name.toLowerCase()}.role` : 'new-role.config'}
          status={isSubmitting ? 'warning' : 'active'}
        />

        <CodeCardBody>
          <div className="space-y-6">
            {/* General error */}
            {errors.general && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-sm font-mono text-destructive">
                  {errors.general}
                </p>
              </div>
            )}

            {/* Name field */}
            <div className="space-y-2">
              <Label htmlFor="role-name" className="font-mono text-sm">
                <span className="text-syntax-key">name</span>
                <span className="text-foreground">:</span>
                <span className="text-destructive ml-1">*</span>
              </Label>
              <Input
                id="role-name"
                type="text"
                value={formState.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                placeholder="e.g., Faculty Admin"
                disabled={isSubmitting}
                className={cn(
                  'font-mono',
                  errors.name && 'border-destructive focus-visible:ring-destructive'
                )}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {errors.name && (
                <p id="name-error" className="text-sm font-mono text-destructive">
                  <span className="text-traffic-green">//</span> {errors.name}
                </p>
              )}
            </div>

            {/* Description field */}
            <div className="space-y-2">
              <Label htmlFor="role-description" className="font-mono text-sm">
                <span className="text-syntax-key">description</span>
                <span className="text-foreground">:</span>
              </Label>
              <Input
                id="role-description"
                type="text"
                value={formState.description}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Brief description of the role..."
                disabled={isSubmitting}
                className="font-mono"
              />
            </div>

            {/* Color picker */}
            <div className="space-y-2">
              <Label className="font-mono text-sm">
                <span className="text-syntax-key">color</span>
                <span className="text-foreground">:</span>
              </Label>
              <div className="flex items-center gap-3">
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleFieldChange('color', color)}
                      disabled={isSubmitting}
                      className={cn(
                        'h-7 w-7 rounded-md border-2 transition-all',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        formState.color === color
                          ? 'border-foreground scale-110'
                          : 'border-transparent hover:scale-105'
                      )}
                      style={{ backgroundColor: color }}
                      aria-label={`Select color ${color}`}
                      aria-pressed={formState.color === color}
                    >
                      {formState.color === color && (
                        <Check className="h-4 w-4 text-white mx-auto" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground font-mono text-sm">=</span>
                  <RoleBadge
                    name={formState.name || 'Preview'}
                    color={formState.color}
                    size="md"
                  />
                </div>
              </div>
            </div>

            {/* Default toggle */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formState.isDefault}
                  onChange={(e) => handleFieldChange('isDefault', e.target.checked)}
                  disabled={isSubmitting}
                  className={cn(
                    'h-4 w-4 rounded border-2 border-muted-foreground',
                    'text-traffic-green focus:ring-traffic-green focus:ring-offset-0',
                    'accent-traffic-green cursor-pointer'
                  )}
                />
                <span className="font-mono text-sm">
                  <span className="text-syntax-key">isDefault</span>
                  <span className="text-foreground">:</span>
                  <span className={formState.isDefault ? 'text-traffic-green' : 'text-syntax-comment'}>
                    {' '}
                    {formState.isDefault ? 'true' : 'false'}
                  </span>
                </span>
              </label>
              <span className="text-xs text-syntax-comment font-mono">
                // Assign to new team members by default
              </span>
            </div>

            {/* Permissions grid */}
            <div className="space-y-2 pt-4 border-t border-border">
              <Label className="font-mono text-sm">
                <span className="text-syntax-key">permissions</span>
                <span className="text-foreground">:</span>
                <span className="text-destructive ml-1">*</span>
              </Label>
              {errors.permissions && (
                <p className="text-sm font-mono text-destructive">
                  <span className="text-traffic-green">//</span> {errors.permissions}
                </p>
              )}
              <RolePermissionGrid
                value={formState.permissions}
                onChange={(permissions) => handleFieldChange('permissions', permissions)}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </CodeCardBody>

        <CodeCardFooter>
          <div className="flex items-center gap-2 text-sm font-mono text-syntax-comment">
            <span className="text-traffic-green">//</span>
            {isEditing ? 'Update role configuration' : 'Create new role'}
          </div>
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={isSubmitting}
                className="font-mono"
              >
                $ cancel
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="font-mono gap-2"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              $ {isEditing ? 'update' : 'create'} --save
            </Button>
          </div>
        </CodeCardFooter>
      </CodeCard>
    </form>
  )
}

export default RoleForm
