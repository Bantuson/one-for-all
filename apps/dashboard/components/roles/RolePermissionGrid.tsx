'use client'

import * as React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Permission,
  PERMISSIONS,
  PERMISSION_DETAILS,
  PERMISSION_GROUPS,
  PERMISSION_CATEGORY_LABELS,
  type PermissionCategory,
} from '@/lib/constants/permissions'

// ============================================================================
// Constants
// ============================================================================

/**
 * Permissions that should NOT appear in the selection grid.
 * view_dashboard is granted by default to all team members.
 */
const NON_SELECTABLE_PERMISSIONS: Permission[] = [PERMISSIONS.VIEW_DASHBOARD]

/**
 * Creates a filtered permission groups object excluding non-selectable permissions.
 * Categories with no remaining permissions will have empty arrays.
 */
const SELECTABLE_PERMISSION_GROUPS: Record<PermissionCategory, Permission[]> = Object.fromEntries(
  Object.entries(PERMISSION_GROUPS).map(([category, permissions]) => [
    category,
    permissions.filter((p) => !NON_SELECTABLE_PERMISSIONS.includes(p)),
  ])
) as Record<PermissionCategory, Permission[]>

// ============================================================================
// Types
// ============================================================================

interface RolePermissionGridProps {
  /** Current selected permissions */
  value: Permission[]
  /** Callback when permissions change */
  onChange: (permissions: Permission[]) => void
  /** Whether the grid is disabled */
  disabled?: boolean
  /** Whether the grid is read-only (display only) */
  readOnly?: boolean
  /** Additional class names */
  className?: string
}

// ============================================================================
// Component
// ============================================================================

/**
 * RolePermissionGrid - Checkbox grid for permissions by category
 *
 * Groups permissions using PERMISSION_GROUPS from constants.
 * Shows checkboxes with labels and descriptions using terminal/code aesthetic.
 */
export function RolePermissionGrid({
  value,
  onChange,
  disabled = false,
  readOnly = false,
  className,
}: RolePermissionGridProps) {
  const handlePermissionToggle = React.useCallback(
    (permission: Permission) => {
      if (disabled || readOnly) return

      if (value.includes(permission)) {
        onChange(value.filter((p) => p !== permission))
      } else {
        onChange([...value, permission])
      }
    },
    [value, onChange, disabled, readOnly]
  )

  const handleCategoryToggle = React.useCallback(
    (category: PermissionCategory) => {
      if (disabled || readOnly) return

      // Use selectable permissions for toggle logic
      const categoryPermissions = SELECTABLE_PERMISSION_GROUPS[category]
      const allSelected = categoryPermissions.every((p) => value.includes(p))

      if (allSelected) {
        // Remove all permissions from this category
        onChange(value.filter((p) => !categoryPermissions.includes(p)))
      } else {
        // Add all permissions from this category
        const newPermissions = new Set([...value, ...categoryPermissions])
        onChange(Array.from(newPermissions))
      }
    },
    [value, onChange, disabled, readOnly]
  )

  // Filter to only categories that have selectable permissions
  const categories = (Object.keys(SELECTABLE_PERMISSION_GROUPS) as PermissionCategory[]).filter(
    (category) => SELECTABLE_PERMISSION_GROUPS[category].length > 0
  )

  return (
    <div className={cn('space-y-4 font-mono text-sm', className)}>
      {categories.map((category) => {
        // Use selectable permissions only (excludes view_dashboard)
        const permissions = SELECTABLE_PERMISSION_GROUPS[category]
        const selectedCount = permissions.filter((p) => value.includes(p)).length
        const allSelected = selectedCount === permissions.length
        const someSelected = selectedCount > 0 && !allSelected

        return (
          <fieldset key={category} className="space-y-2">
            {/* Category header */}
            <div className="flex items-center justify-between">
              <legend className="flex items-center gap-2">
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => handleCategoryToggle(category)}
                    disabled={disabled}
                    className={cn(
                      'h-4 w-4 rounded border-2 flex items-center justify-center transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      disabled && 'cursor-not-allowed opacity-50',
                      allSelected
                        ? 'bg-traffic-green border-traffic-green'
                        : someSelected
                        ? 'bg-traffic-yellow/30 border-traffic-yellow'
                        : 'border-muted-foreground hover:border-foreground'
                    )}
                    aria-label={`Toggle all ${PERMISSION_CATEGORY_LABELS[category]} permissions`}
                  >
                    {allSelected && <Check className="h-3 w-3 text-black" />}
                    {someSelected && !allSelected && (
                      <div className="h-2 w-2 bg-traffic-yellow rounded-sm" />
                    )}
                  </button>
                )}
                <span className="text-syntax-export font-semibold">
                  {PERMISSION_CATEGORY_LABELS[category]}
                </span>
                <span className="text-syntax-comment text-xs">
                  ({selectedCount}/{permissions.length})
                </span>
              </legend>
            </div>

            {/* Permission checkboxes */}
            <div className="ml-6 space-y-1.5">
              {permissions.map((permission) => {
                const detail = PERMISSION_DETAILS[permission]
                const isChecked = value.includes(permission)

                return (
                  <label
                    key={permission}
                    className={cn(
                      'flex items-start gap-3 p-2 rounded cursor-pointer transition-colors',
                      !readOnly && !disabled && 'hover:bg-muted/30',
                      isChecked && 'bg-muted/20',
                      (disabled || readOnly) && 'cursor-default'
                    )}
                  >
                    {readOnly ? (
                      <div
                        className={cn(
                          'mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center',
                          isChecked
                            ? 'bg-traffic-green border-traffic-green'
                            : 'border-muted-foreground'
                        )}
                      >
                        {isChecked && <Check className="h-3 w-3 text-black" />}
                      </div>
                    ) : (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handlePermissionToggle(permission)}
                        disabled={disabled}
                        className={cn(
                          'mt-0.5 h-4 w-4 rounded border-2 border-muted-foreground',
                          'text-traffic-green focus:ring-traffic-green focus:ring-offset-0',
                          'accent-traffic-green cursor-pointer',
                          disabled && 'cursor-not-allowed opacity-50'
                        )}
                        aria-describedby={`permission-desc-${permission}`}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <span
                        className={cn(
                          'block',
                          isChecked ? 'text-traffic-green' : 'text-foreground'
                        )}
                      >
                        {detail.label}
                      </span>
                      <span
                        id={`permission-desc-${permission}`}
                        className="block text-xs text-syntax-comment"
                      >
                        {detail.description}
                      </span>
                    </div>
                  </label>
                )
              })}
            </div>
          </fieldset>
        )
      })}

      {/* Summary */}
      <div className="pt-2">
        <p className="text-center font-mono">
          <span className="font-semibold text-traffic-green text-sm">{value.length}</span>
        </p>
      </div>
    </div>
  )
}

export default RolePermissionGrid
