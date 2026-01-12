'use client'

import * as React from 'react'
import { Plus, X, Mail, Users, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { CodeCard, CodeCardHeader } from '@/components/ui/CodeCard'
import { useSetupStore } from '@/lib/stores/setupStore'
import { RoleSelector } from '@/components/roles/RoleSelector'
import { RolePermissionGrid } from '@/components/roles/RolePermissionGrid'
import type { Role } from '@/components/roles'
import type { Permission } from '@/lib/constants/permissions'

// ============================================================================
// Types
// ============================================================================

// Legacy permission type for backward compatibility
type LegacyPermission =
  | 'view_dashboard'
  | 'view_applications'
  | 'edit_courses'
  | 'process_applications'
  | 'export_data'
  | 'manage_team'
  | 'admin_access'

interface PendingInvite {
  email: string
  roleId?: string
  roleName?: string
  permissions: Permission[]
}

interface TeamInviteStepProps {
  className?: string
  onInvitesChange?: (invites: PendingInvite[]) => void
  showWrapper?: boolean
  institutionId?: string  // Required for role selection
}

// ============================================================================
// Constants
// ============================================================================

// Legacy permissions for backward compatibility (when institutionId not provided)
const LEGACY_PERMISSIONS: { id: LegacyPermission; label: string; description: string }[] = [
  { id: 'view_dashboard', label: 'View Dashboard', description: 'Access analytics and dashboard metrics' },
  { id: 'view_applications', label: 'View Applications', description: 'Read-only access to applications' },
  { id: 'edit_courses', label: 'Edit Courses', description: 'Add, edit, and delete courses and faculties' },
  { id: 'process_applications', label: 'Process Applications', description: 'Review and process applications' },
  { id: 'export_data', label: 'Export Data', description: 'Download reports and export data' },
  { id: 'manage_team', label: 'Manage Team', description: 'Invite and remove team members' },
  { id: 'admin_access', label: 'Full Admin Access', description: 'All permissions + settings access' },
]

const DEFAULT_LEGACY_PERMISSIONS: LegacyPermission[] = ['view_dashboard', 'view_applications']

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Basic email validation
 * Checks for presence of @ symbol and at least one character before and after
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Format permissions for display in pending invites list
 */
function formatPermissionsDisplay(permissions: Permission[]): string {
  if (permissions.length === LEGACY_PERMISSIONS.length || permissions.length >= 10) {
    return 'all permissions'
  }
  if (permissions.length <= 2) {
    return permissions.join(', ')
  }
  return `${permissions.slice(0, 2).join(', ')} +${permissions.length - 2} more`
}

// ============================================================================
// Component
// ============================================================================

export function TeamInviteStep({
  className,
  onInvitesChange,
  showWrapper = true,
  institutionId,
}: TeamInviteStepProps) {
  const [emailInput, setEmailInput] = React.useState('')
  const [emailError, setEmailError] = React.useState<string | null>(null)

  // Role-first selection state (when institutionId is provided)
  const [selectedRole, setSelectedRole] = React.useState<Role | null>(null)
  const [selectedRoleId, setSelectedRoleId] = React.useState<string | null>(null)
  const [showPermissionOverride, setShowPermissionOverride] = React.useState(false)
  const [overriddenPermissions, setOverriddenPermissions] = React.useState<Permission[]>([])

  // Legacy permission selection state (fallback when no institutionId)
  const [legacyPermissions, setLegacyPermissions] = React.useState<LegacyPermission[]>(DEFAULT_LEGACY_PERMISSIONS)

  // Get state and actions from store
  const pendingInvites = useSetupStore((state) => state.pendingInvites)
  const addInvite = useSetupStore((state) => state.addInvite)
  const removeInvite = useSetupStore((state) => state.removeInvite)

  // Email input ref for focus management
  const emailInputRef = React.useRef<HTMLInputElement>(null)

  // Determine if using role-first mode
  const useRoleFirstMode = Boolean(institutionId)

  // Notify parent of invite changes (for compatibility)
  React.useEffect(() => {
    onInvitesChange?.(pendingInvites as PendingInvite[])
  }, [pendingInvites, onInvitesChange])

  // Handle role selection
  const handleRoleChange = React.useCallback((roleId: string, role: Role) => {
    setSelectedRoleId(roleId)
    setSelectedRole(role)
    // Reset overridden permissions to role's default permissions
    setOverriddenPermissions(role.permissions)
    setShowPermissionOverride(false)
  }, [])

  // Handle legacy permission toggle (for backward compatibility)
  const handleLegacyPermissionToggle = React.useCallback((permissionId: LegacyPermission) => {
    setLegacyPermissions((prev) => {
      if (prev.includes(permissionId)) {
        return prev.filter((p) => p !== permissionId)
      }
      return [...prev, permissionId]
    })
  }, [])

  const handleAddInvite = React.useCallback(() => {
    const trimmedEmail = emailInput.trim().toLowerCase()

    // Validate email
    if (!trimmedEmail) {
      setEmailError('Email is required')
      return
    }

    if (!isValidEmail(trimmedEmail)) {
      setEmailError('Please enter a valid email address')
      return
    }

    // Check for duplicates
    if (pendingInvites.some((invite) => invite.email === trimmedEmail)) {
      setEmailError('This email has already been added')
      return
    }

    if (useRoleFirstMode) {
      // Role-first mode validation
      if (!selectedRole) {
        setEmailError('Select a role for this team member')
        return
      }

      // Get permissions - use overridden if custom, otherwise use role's defaults
      const permissions = showPermissionOverride ? overriddenPermissions : selectedRole.permissions

      if (permissions.length === 0) {
        setEmailError('Select at least one permission')
        return
      }

      // Add invite with role info
      addInvite(trimmedEmail, permissions, selectedRole.id, selectedRole.name)
    } else {
      // Legacy mode validation
      if (legacyPermissions.length === 0) {
        setEmailError('Select at least one permission')
        return
      }

      // Add invite with legacy permissions (cast to Permission[])
      addInvite(trimmedEmail, legacyPermissions as unknown as Permission[])
    }

    // Reset form
    setEmailInput('')
    setEmailError(null)
    emailInputRef.current?.focus()
  }, [
    emailInput,
    pendingInvites,
    useRoleFirstMode,
    selectedRole,
    showPermissionOverride,
    overriddenPermissions,
    legacyPermissions,
    addInvite
  ])

  const handleRemoveInvite = React.useCallback((emailToRemove: string) => {
    removeInvite(emailToRemove)
  }, [removeInvite])

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        handleAddInvite()
      }
    },
    [handleAddInvite]
  )

  const handleEmailChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setEmailInput(event.target.value)
      if (emailError) {
        setEmailError(null)
      }
    },
    [emailError]
  )

  const content = (
    <div className="p-4 space-y-4 font-mono text-sm">
      {/* Section: Invite description */}
      <p className="text-center">
        <span className="text-traffic-green">//</span>
        <span className="text-muted-foreground"> Invite team members to collaborate</span>
      </p>

      {/* Email Input Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Email Label and Input */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-syntax-key">Email:</span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-syntax-export" />
              <Input
                ref={emailInputRef}
                type="email"
                placeholder="teammate@example.com"
                value={emailInput}
                onChange={handleEmailChange}
                onKeyDown={handleKeyDown}
                aria-label="Team member email address"
                aria-describedby={emailError ? 'email-error' : 'email-hint'}
                aria-invalid={emailError ? 'true' : 'false'}
                className={cn(
                  'pl-10 font-mono',
                  emailError && 'border-destructive focus-visible:ring-destructive'
                )}
              />
            </div>
            {/* Add Button */}
            <Button
              type="button"
              variant="primary"
              onClick={handleAddInvite}
              aria-label="Add team member invite"
              className="shrink-0 gap-1"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Email Error */}
      {emailError && (
        <p
          id="email-error"
          role="alert"
        >
          <span className="text-traffic-green">//</span>
          <span className="text-destructive"> Error: {emailError}</span>
        </p>
      )}

      {/* Role/Permissions Section */}
      <div className="pt-2">
        {useRoleFirstMode && institutionId ? (
          // Role-first mode: Select role, then optionally override permissions
          <>
            <p className="mb-3 text-center">
              <span className="text-traffic-green">//</span>
              <span className="text-muted-foreground"> Select role:</span>
            </p>

            <RoleSelector
              institutionId={institutionId}
              value={selectedRoleId}
              onChange={handleRoleChange}
              showPermissionsPreview={!showPermissionOverride}
              placeholder="Select a role for this team member..."
              className="mb-4"
            />

            {/* Permission Override Toggle */}
            {selectedRole && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setShowPermissionOverride(!showPermissionOverride)}
                  className={cn(
                    'flex items-center gap-2 w-full p-2 rounded transition-colors',
                    'text-muted-foreground hover:text-foreground hover:bg-muted/30',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                  )}
                >
                  {showPermissionOverride ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <span className="text-traffic-green">//</span>
                  <span>
                    {showPermissionOverride ? 'Hide' : 'Override'} permissions
                  </span>
                </button>

                {/* Permission Override Grid */}
                {showPermissionOverride && (
                  <div className="mt-3 border border-border rounded-lg p-3 bg-muted/10">
                    <RolePermissionGrid
                      value={overriddenPermissions}
                      onChange={setOverriddenPermissions}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          // Legacy mode: Permission checkboxes directly
          <>
            <p className="mb-3 text-center">
              <span className="text-traffic-green">//</span>
              <span className="text-muted-foreground"> Select permissions:</span>
            </p>
            <fieldset>
              <legend className="sr-only">Select permissions for team member</legend>
              <div className="space-y-2">
                {LEGACY_PERMISSIONS.map((permission) => {
                  const isChecked = legacyPermissions.includes(permission.id)
                  return (
                    <label
                      key={permission.id}
                      className={cn(
                        'flex items-start gap-3 p-2 rounded cursor-pointer transition-colors',
                        'hover:bg-muted/30',
                        isChecked && 'bg-muted/20'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleLegacyPermissionToggle(permission.id)}
                        className={cn(
                          'mt-0.5 h-4 w-4 rounded border-2 border-muted-foreground',
                          'text-traffic-green focus:ring-traffic-green focus:ring-offset-0',
                          'accent-traffic-green cursor-pointer'
                        )}
                        aria-describedby={`permission-desc-${permission.id}`}
                      />
                      <div className="flex-1 min-w-0">
                        <span className={cn(
                          'block',
                          isChecked ? 'text-traffic-green' : 'text-foreground'
                        )}>
                          {permission.label}
                        </span>
                        <span
                          id={`permission-desc-${permission.id}`}
                          className="block text-xs text-syntax-comment"
                        >
                          {permission.description}
                        </span>
                      </div>
                    </label>
                  )
                })}
              </div>
            </fieldset>
          </>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Pending Invites Section */}
      {pendingInvites.length > 0 ? (
        <div className="space-y-2">
          <p>
            <span className="text-traffic-green">//</span>
            <span className="text-muted-foreground"> Pending invites:</span>
          </p>
          <ul className="space-y-1" aria-label="Pending team invites">
            {pendingInvites.map((invite) => {
              const inviteWithPermissions = invite as PendingInvite
              return (
                <li
                  key={invite.email}
                  className="flex items-center justify-between gap-2 p-2 rounded bg-muted/30 group"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
                    <span className="text-traffic-yellow">*</span>
                    <span className="text-syntax-string truncate">
                      "{invite.email}"
                    </span>
                    <span className="text-foreground">:</span>
                    {/* Show role name if available, otherwise show permissions */}
                    {inviteWithPermissions.roleName ? (
                      <span className="text-syntax-export truncate" title={`Role: ${inviteWithPermissions.roleName}`}>
                        @{inviteWithPermissions.roleName}
                      </span>
                    ) : (
                      <span className="text-syntax-key truncate" title={inviteWithPermissions.permissions?.join(', ')}>
                        [{formatPermissionsDisplay(inviteWithPermissions.permissions || [])}]
                      </span>
                    )}
                    {/* Show permissions count if role is used */}
                    {inviteWithPermissions.roleName && inviteWithPermissions.permissions?.length > 0 && (
                      <span className="text-syntax-comment text-xs">
                        ({inviteWithPermissions.permissions.length} perms)
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveInvite(invite.email)}
                    aria-label={`Remove invite for ${invite.email}`}
                    className={cn(
                      'p-1 rounded transition-colors shrink-0',
                      'text-muted-foreground hover:text-destructive hover:bg-destructive/10',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                    )}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <div className="text-center py-4">
          <Users className="mx-auto h-8 w-8 text-muted-foreground opacity-50 mb-2" />
          <p>
            <span className="text-traffic-green">//</span>
            <span className="text-muted-foreground"> No invites yet. Add team members above.</span>
          </p>
        </div>
      )}

      {/* Skip Option */}
      <p className="text-center pt-2">
        <span className="text-traffic-green">//</span>
        <span className="text-muted-foreground"> You can skip and invite team members later from Settings</span>
      </p>
    </div>
  )

  if (!showWrapper) {
    return <div className={cn('flex flex-col gap-6', className)}>{content}</div>
  }

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <CodeCard>
        <CodeCardHeader
          filename="team-members.config"
          status="active"
          badge={
            <span className="font-mono text-xs text-syntax-comment">
              {pendingInvites.length} pending
            </span>
          }
        />
        {content}
      </CodeCard>
    </div>
  )
}

export default TeamInviteStep
