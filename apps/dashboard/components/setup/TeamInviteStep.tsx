'use client'

import * as React from 'react'
import { Plus, X, Mail, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { CodeCard, CodeCardHeader } from '@/components/ui/CodeCard'
import { useSetupStore } from '@/lib/stores/setupStore'

// ============================================================================
// Types
// ============================================================================

type Permission =
  | 'view_dashboard'
  | 'view_applications'
  | 'edit_courses'
  | 'process_applications'
  | 'export_data'
  | 'manage_team'
  | 'admin_access'

interface PendingInvite {
  email: string
  permissions: Permission[]
}

interface TeamInviteStepProps {
  className?: string
  onInvitesChange?: (invites: PendingInvite[]) => void
}

// ============================================================================
// Constants
// ============================================================================

const PERMISSIONS: { id: Permission; label: string; description: string }[] = [
  { id: 'view_dashboard', label: 'View Dashboard', description: 'Access analytics and dashboard metrics' },
  { id: 'view_applications', label: 'View Applications', description: 'Read-only access to applications' },
  { id: 'edit_courses', label: 'Edit Courses', description: 'Add, edit, and delete courses and faculties' },
  { id: 'process_applications', label: 'Process Applications', description: 'Review and process applications' },
  { id: 'export_data', label: 'Export Data', description: 'Download reports and export data' },
  { id: 'manage_team', label: 'Manage Team', description: 'Invite and remove team members' },
  { id: 'admin_access', label: 'Full Admin Access', description: 'All permissions + settings access' },
]

const DEFAULT_PERMISSIONS: Permission[] = ['view_dashboard', 'view_applications']

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
  if (permissions.length === PERMISSIONS.length) {
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
}: TeamInviteStepProps) {
  const [emailInput, setEmailInput] = React.useState('')
  const [selectedPermissions, setSelectedPermissions] = React.useState<Permission[]>(DEFAULT_PERMISSIONS)
  const [emailError, setEmailError] = React.useState<string | null>(null)

  // Get state and actions from store
  const pendingInvites = useSetupStore((state) => state.pendingInvites)
  const addInvite = useSetupStore((state) => state.addInvite)
  const removeInvite = useSetupStore((state) => state.removeInvite)

  // Email input ref for focus management
  const emailInputRef = React.useRef<HTMLInputElement>(null)

  // Notify parent of invite changes (for compatibility)
  React.useEffect(() => {
    onInvitesChange?.(pendingInvites as PendingInvite[])
  }, [pendingInvites, onInvitesChange])

  const handlePermissionToggle = React.useCallback((permissionId: Permission) => {
    setSelectedPermissions((prev) => {
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

    // Validate at least one permission selected
    if (selectedPermissions.length === 0) {
      setEmailError('Select at least one permission')
      return
    }

    // Add invite using store action with permissions
    addInvite(trimmedEmail, selectedPermissions)

    // Reset form (keep permissions selected for convenience)
    setEmailInput('')
    setEmailError(null)
    emailInputRef.current?.focus()
  }, [emailInput, selectedPermissions, pendingInvites, addInvite])

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

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* Single CodeCard encompassing entire team workflow */}
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
        <div className="p-4 space-y-4 font-mono text-sm">
          {/* Section: Invite description */}
          <p>
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

          {/* Permissions Section */}
          <div className="pt-2">
            <p className="mb-3">
              <span className="text-traffic-green">//</span>
              <span className="text-muted-foreground"> Select permissions:</span>
            </p>
            <fieldset>
              <legend className="sr-only">Select permissions for team member</legend>
              <div className="space-y-2">
                {PERMISSIONS.map((permission) => {
                  const isChecked = selectedPermissions.includes(permission.id)
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
                        onChange={() => handlePermissionToggle(permission.id)}
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
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="text-traffic-yellow">*</span>
                        <span className="text-syntax-string truncate">
                          "{invite.email}"
                        </span>
                        <span className="text-foreground">:</span>
                        <span className="text-syntax-key truncate" title={inviteWithPermissions.permissions?.join(', ')}>
                          [{formatPermissionsDisplay(inviteWithPermissions.permissions || [])}]
                        </span>
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
      </CodeCard>
    </div>
  )
}

export default TeamInviteStep
