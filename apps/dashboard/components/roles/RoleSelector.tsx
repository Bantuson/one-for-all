'use client'

import * as React from 'react'
import { Loader2, AlertCircle, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import {
  Permission,
  PERMISSION_DETAILS,
  PERMISSION_GROUPS,
  PERMISSION_CATEGORY_LABELS,
  type PermissionCategory,
} from '@/lib/constants/permissions'
import { RoleBadge } from './RoleBadge'
import { useRoles } from './hooks/useRoles'

// ============================================================================
// Types
// ============================================================================

export interface Role {
  id: string
  name: string
  description: string | null
  color: string
  permissions: Permission[]
  isDefault: boolean
  isSystem: boolean
  createdAt: string
  updatedAt: string
}

interface RoleSelectorProps {
  /** Institution ID to fetch roles for */
  institutionId: string
  /** Currently selected role ID */
  value: string | null
  /** Callback when role changes */
  onChange: (roleId: string, role: Role) => void
  /** Whether the selector is disabled */
  disabled?: boolean
  /** Error message to display */
  error?: string
  /** Show permissions preview below when role selected */
  showPermissionsPreview?: boolean
  /** Additional class names */
  className?: string
  /** Placeholder text */
  placeholder?: string
  /** Callback when "Create New Role" is clicked */
  onCreateRole?: () => void
  /** Whether to show the create option (default: true when onCreateRole provided) */
  showCreateOption?: boolean
}

// ============================================================================
// Component
// ============================================================================

/**
 * RoleSelector - Dropdown to select a role with permissions preview
 *
 * Fetches roles from the API and displays them in a dropdown.
 * Optionally shows a permissions preview when a role is selected.
 */
export function RoleSelector({
  institutionId,
  value,
  onChange,
  disabled = false,
  error,
  showPermissionsPreview = false,
  className,
  placeholder = 'Select a role...',
  onCreateRole,
  showCreateOption,
}: RoleSelectorProps) {
  const { roles, isLoading, error: fetchError } = useRoles(institutionId)

  const selectedRole = React.useMemo(() => {
    if (!value || !roles) return null
    return roles.find((role) => role.id === value) ?? null
  }, [value, roles])

  // Determine if create option should be shown
  const shouldShowCreateOption = showCreateOption ?? !!onCreateRole

  const handleValueChange = React.useCallback(
    (roleId: string) => {
      if (roleId === '__create_new__' && onCreateRole) {
        onCreateRole()
        return // Don't update selection
      }
      const role = roles?.find((r) => r.id === roleId)
      if (role) {
        onChange(roleId, role)
      }
    },
    [roles, onChange, onCreateRole]
  )

  // Group permissions by category for preview
  const groupedPermissions = React.useMemo(() => {
    if (!selectedRole) return null

    const groups: Partial<Record<PermissionCategory, Permission[]>> = {}

    for (const [category, permissions] of Object.entries(PERMISSION_GROUPS)) {
      const matching = permissions.filter((p) =>
        selectedRole.permissions.includes(p)
      )
      if (matching.length > 0) {
        groups[category as PermissionCategory] = matching
      }
    }

    return groups
  }, [selectedRole])

  const displayError = error || fetchError?.message

  return (
    <div className={cn('space-y-3', className)}>
      <Select
        value={value ?? undefined}
        onValueChange={handleValueChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger
          className={cn(
            'text-sm',
            displayError && 'border-destructive focus:ring-destructive'
          )}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Loading roles...</span>
            </div>
          ) : selectedRole ? (
            <div className="flex items-center gap-2">
              <RoleBadge
                name={selectedRole.name}
                color={selectedRole.color}
                size="sm"
              />
              {selectedRole.description && (
                <span className="text-muted-foreground text-xs truncate">
                  - {selectedRole.description}
                </span>
              )}
            </div>
          ) : (
            <SelectValue placeholder={placeholder} />
          )}
        </SelectTrigger>
        <SelectContent>
          {roles && roles.length > 0 ? (
            roles.map((role) => (
              <SelectItem
                key={role.id}
                value={role.id}
                className="text-sm"
              >
                <div className="flex items-center gap-2">
                  <RoleBadge name={role.name} color={role.color} size="sm" />
                  {role.isSystem && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      system
                    </span>
                  )}
                </div>
              </SelectItem>
            ))
          ) : (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              <span className="text-traffic-green">//</span> No roles available
            </div>
          )}
          {shouldShowCreateOption && onCreateRole && (
            <>
              <SelectSeparator />
              <SelectItem value="__create_new__" className="text-sm text-traffic-green">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Create New Role...</span>
                </div>
              </SelectItem>
            </>
          )}
        </SelectContent>
      </Select>

      {/* Error display */}
      {displayError && (
        <p className="flex items-center gap-1.5 text-sm">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-traffic-green">//</span>
          <span className="text-destructive">Error: {displayError}</span>
        </p>
      )}

      {/* Permissions preview */}
      {showPermissionsPreview && selectedRole && groupedPermissions && (
        <div className="border border-border rounded-lg p-3 bg-muted/20 font-mono text-sm">
          <p className="text-muted-foreground mb-2">
            <span className="text-traffic-green">//</span> Permissions preview:
          </p>
          <div className="space-y-2">
            {(
              Object.entries(groupedPermissions) as [
                PermissionCategory,
                Permission[]
              ][]
            ).map(([category, permissions]) => (
              <div key={category}>
                <span className="text-syntax-key">
                  {PERMISSION_CATEGORY_LABELS[category]}:
                </span>{' '}
                <span className="text-syntax-string">
                  [
                  {permissions
                    .map((p) => PERMISSION_DETAILS[p].label)
                    .join(', ')}
                  ]
                </span>
              </div>
            ))}
          </div>
          <p className="text-syntax-comment text-xs mt-2">
            // {selectedRole.permissions.length} permission
            {selectedRole.permissions.length !== 1 ? 's' : ''} total
          </p>
        </div>
      )}
    </div>
  )
}

export default RoleSelector
