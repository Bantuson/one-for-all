'use client'

import * as React from 'react'
import { Pencil, Trash2, Shield, Users, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import {
  CodeCard,
  CodeCardHeader,
  CodeCardBody,
  CodeCardFooter,
} from '@/components/ui/CodeCard'
import {
  Permission,
  PERMISSION_DETAILS,
  PERMISSION_GROUPS,
  PERMISSION_CATEGORY_LABELS,
  type PermissionCategory,
} from '@/lib/constants/permissions'
import { RoleBadge } from './RoleBadge'
import type { Role } from './RoleSelector'

// ============================================================================
// Types
// ============================================================================

interface RoleCardProps {
  /** The role to display */
  role: Role
  /** Callback when edit button is clicked */
  onEdit?: () => void
  /** Callback when delete button is clicked */
  onDelete?: () => void
  /** Number of members with this role */
  memberCount?: number
  /** Whether this is a system role (cannot be edited/deleted) */
  isSystem?: boolean
  /** Additional class names */
  className?: string
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Groups permissions by category and returns a compact display format
 */
function getPermissionsSummary(permissions: Permission[]): string[] {
  const summary: string[] = []

  for (const [category, categoryPermissions] of Object.entries(PERMISSION_GROUPS)) {
    const matching = categoryPermissions.filter((p) => permissions.includes(p))
    if (matching.length > 0) {
      const categoryLabel = PERMISSION_CATEGORY_LABELS[category as PermissionCategory]
      if (matching.length === categoryPermissions.length) {
        summary.push(`${categoryLabel}: all`)
      } else {
        summary.push(
          `${categoryLabel}: ${matching.map((p) => PERMISSION_DETAILS[p].label).join(', ')}`
        )
      }
    }
  }

  return summary
}

// ============================================================================
// Component
// ============================================================================

/**
 * RoleCard - Display card showing role + permissions
 *
 * Shows role name, description, color badge, and permissions in a compact format.
 * Edit/Delete buttons are hidden for system roles.
 */
export function RoleCard({
  role,
  onEdit,
  onDelete,
  memberCount = 0,
  isSystem: isSystemProp,
  className,
}: RoleCardProps) {
  const isSystem = isSystemProp ?? role.isSystem
  const permissionsSummary = React.useMemo(
    () => getPermissionsSummary(role.permissions),
    [role.permissions]
  )

  return (
    <CodeCard className={className}>
      <CodeCardHeader
        filename={`${role.name.toLowerCase().replace(/\s+/g, '-')}.role`}
        status={isSystem ? 'neutral' : 'active'}
        rightContent={
          <div className="flex items-center gap-2">
            {role.isDefault && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">
                default
              </span>
            )}
            {isSystem && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono flex items-center gap-1">
                <Lock className="h-3 w-3" />
                system
              </span>
            )}
          </div>
        }
      />

      <CodeCardBody>
        {/* Role name with badge */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-syntax-export">export role</span>
          <RoleBadge name={role.name} color={role.color} size="md" />
        </div>

        {/* Description */}
        {role.description && (
          <div className="mb-3">
            <span className="text-syntax-comment">// {role.description}</span>
          </div>
        )}

        {/* Permissions list */}
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <Shield className="h-3.5 w-3.5 text-syntax-key" />
            <span className="text-syntax-key">permissions</span>
            <span className="text-foreground">:</span>
            <span className="text-syntax-comment">
              ({role.permissions.length})
            </span>
          </div>
          <div className="ml-5 space-y-0.5">
            {permissionsSummary.length > 0 ? (
              permissionsSummary.map((summary, index) => (
                <div key={index} className="text-xs">
                  <span className="text-traffic-yellow">*</span>
                  <span className="text-syntax-string ml-1">{summary}</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-syntax-comment">
                // No permissions assigned
              </div>
            )}
          </div>
        </div>
      </CodeCardBody>

      <CodeCardFooter>
        {/* Member count */}
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 text-sm font-mono">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">members:</span>
            <span className="text-primary">{memberCount}</span>
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!isSystem && onEdit && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onEdit}
              aria-label={`Edit ${role.name} role`}
              className="h-8 w-8"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
          {!isSystem && onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onDelete}
              aria-label={`Delete ${role.name} role`}
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          {isSystem && (
            <span className="text-xs text-muted-foreground font-mono">
              // system roles cannot be modified
            </span>
          )}
        </div>
      </CodeCardFooter>
    </CodeCard>
  )
}

export default RoleCard
