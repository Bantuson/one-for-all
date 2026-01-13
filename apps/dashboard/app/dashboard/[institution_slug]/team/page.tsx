'use client'

import * as React from 'react'
import { useParams } from 'next/navigation'
import {
  Users,
  Mail,
  Clock,
  X,
  RefreshCw,
  Trash2,
  Loader2,
  AlertCircle,
  UserPlus,
  MoveLeft,
  Shield,
  Plus,
} from 'lucide-react'
import Link from 'next/link'
import { CodeCard, CodeCardHeader } from '@/components/ui/CodeCard'
import { CommandButton } from '@/components/ui/CommandButton'
import { Button } from '@/components/ui/Button'
import { DottedModal, DottedModalContent } from '@/components/ui/DottedModal'
import { TeamPageSkeleton, RolesTabSkeleton } from '@/components/ui/Skeleton'
import {
  RoleSelector,
  RoleCard,
  RoleForm,
  RoleBadge,
  RoleDeleteDialog,
  useRoles,
  useDeleteRole,
  type Role,
} from '@/components/roles'

// ============================================================================
// Types
// ============================================================================

interface TeamMember {
  id: string
  role: string
  roleId: string | null
  roleColor: string | null
  permissions: string[]
  status: 'pending' | 'accepted'
  email: string
  firstName: string | null
  lastName: string | null
  avatarUrl: string | null
  isOwner: boolean
  invitedAt: string
  acceptedAt: string | null
  expiresAt: string | null
  emailSentAt: string | null
}

type TabType = 'members' | 'roles'

interface MembersResponse {
  members: TeamMember[]
  isOwner: boolean
  currentUserRole: string | null
}

// ============================================================================
// Permission Labels (kept for fallback display)
// ============================================================================

const PERMISSION_LABELS: Record<string, string> = {
  view_dashboard: 'View',
  edit_courses: 'Edit Courses',
  manage_applications: 'Applications',
  view_reports: 'Reports',
  manage_team: 'Team',
  manage_settings: 'Settings',
  admin_access: 'Admin',
}

// ============================================================================
// Tab Button Component
// ============================================================================

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: React.ElementType
  label: string
  count?: number
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
        active
          ? 'text-traffic-green font-medium'
          : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      {count !== undefined && (
        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
          active ? 'bg-traffic-green/20' : 'bg-muted'
        }`}>
          {count}
        </span>
      )}
    </button>
  )
}

// ============================================================================
// Component
// ============================================================================

export default function TeamManagementPage() {
  const params = useParams()
  const institutionSlug = params.institution_slug as string

  // State
  const [members, setMembers] = React.useState<TeamMember[]>([])
  const [isOwner, setIsOwner] = React.useState(false)
  const [currentUserRole, setCurrentUserRole] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [actionLoading, setActionLoading] = React.useState<string | null>(null)

  // Tab state
  const [activeTab, setActiveTab] = React.useState<TabType>('members')

  // Invite form state
  const [showInviteForm, setShowInviteForm] = React.useState(false)
  const [inviteEmail, setInviteEmail] = React.useState('')
  const [inviteRoleId, setInviteRoleId] = React.useState<string | null>(null)
  const [isInviting, setIsInviting] = React.useState(false)
  const [showInviteRoleModal, setShowInviteRoleModal] = React.useState(false)

  // Role management state
  const [editingRole, setEditingRole] = React.useState<Role | null>(null)
  const [deletingRole, setDeletingRole] = React.useState<Role | null>(null)
  const [isDeletingRole, setIsDeletingRole] = React.useState(false)

  // Fetch institution ID first, then members
  const [institutionId, setInstitutionId] = React.useState<string | null>(null)

  // Fetch institution by slug
  React.useEffect(() => {
    async function fetchInstitution() {
      try {
        const response = await fetch(`/api/institutions/by-slug/${institutionSlug}`)
        if (!response.ok) throw new Error('Failed to fetch institution')
        const data = await response.json()
        setInstitutionId(data.id)
      } catch (err) {
        console.error('Failed to fetch institution:', err)
        setError('Failed to load institution')
        setIsLoading(false)
      }
    }

    if (institutionSlug) {
      fetchInstitution()
    }
  }, [institutionSlug])

  // Fetch members
  const fetchMembers = React.useCallback(async () => {
    if (!institutionId) return

    try {
      setIsLoading(true)
      const response = await fetch(`/api/institutions/${institutionId}/members`)

      if (!response.ok) throw new Error('Failed to fetch members')

      const data: MembersResponse = await response.json()
      setMembers(data.members)
      setIsOwner(data.isOwner)
      setCurrentUserRole(data.currentUserRole)
    } catch (err) {
      console.error('Failed to fetch members:', err)
      setError('Failed to load team members')
    } finally {
      setIsLoading(false)
    }
  }, [institutionId])

  React.useEffect(() => {
    if (institutionId) {
      fetchMembers()
    }
  }, [institutionId, fetchMembers])

  // Fetch roles
  const { roles, isLoading: rolesLoading, mutate: refreshRoles } = useRoles(institutionId)

  // Delete role mutation
  const deleteRoleMutation = useDeleteRole(institutionId ?? '', deletingRole?.id ?? '')

  // Can user manage team?
  const canManageTeam = isOwner || currentUserRole === 'admin' ||
    members.find(m => m.email === inviteEmail)?.permissions?.includes('manage_team')

  // Calculate member count per role
  const getMemberCountForRole = React.useCallback((roleId: string) => {
    return members.filter(m => m.roleId === roleId).length
  }, [members])

  // Handle resend invitation
  const handleResend = async (member: TeamMember) => {
    if (!institutionId) return

    setActionLoading(member.id)
    try {
      const response = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitation_id: member.id,
          email: member.email,
          token: '', // Will need to regenerate
          institution_name: institutionSlug,
          inviter_name: 'Team admin',
          permissions: member.permissions,
          expires_at: member.expiresAt,
        }),
      })

      if (response.ok) {
        await fetchMembers()
      } else {
        setError('Failed to resend invitation')
      }
    } catch (err) {
      console.error('Resend error:', err)
      setError('Failed to resend invitation')
    } finally {
      setActionLoading(null)
    }
  }

  // Handle remove member
  const handleRemove = async (member: TeamMember) => {
    if (!institutionId || !confirm(`Remove ${member.email} from the team?`)) return

    setActionLoading(member.id)
    try {
      const response = await fetch(
        `/api/institutions/${institutionId}/members?memberId=${member.id}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        await fetchMembers()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to remove member')
      }
    } catch (err) {
      console.error('Remove error:', err)
      setError('Failed to remove member')
    } finally {
      setActionLoading(null)
    }
  }

  // Handle new invite
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!institutionId || !inviteEmail || !inviteRoleId) return

    setIsInviting(true)
    setError(null)

    try {
      const response = await fetch('/api/register/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institution_id: institutionId,
          email: inviteEmail,
          role_id: inviteRoleId,
        }),
      })

      if (response.ok) {
        setInviteEmail('')
        setInviteRoleId(null)
        setShowInviteForm(false)
        await fetchMembers()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to send invitation')
      }
    } catch (err) {
      console.error('Invite error:', err)
      setError('Failed to send invitation')
    } finally {
      setIsInviting(false)
    }
  }

  // Handle role form success (edit modal)
  const handleRoleFormSuccess = React.useCallback(() => {
    setEditingRole(null)
    refreshRoles()
  }, [refreshRoles])

  // Handle role creation success in invite flow
  const handleInviteRoleCreated = React.useCallback((newRole: Role) => {
    setInviteRoleId(newRole.id)
    setShowInviteRoleModal(false)
    refreshRoles()
  }, [refreshRoles])

  // Handle role delete
  const handleDeleteRole = React.useCallback(async () => {
    if (!deletingRole) return

    setIsDeletingRole(true)
    try {
      await deleteRoleMutation.mutateAsync({})
      setDeletingRole(null)
      refreshRoles()
    } catch (err) {
      console.error('Delete role error:', err)
      setError('Failed to delete role')
    } finally {
      setIsDeletingRole(false)
    }
  }, [deletingRole, deleteRoleMutation, refreshRoles])

  // Separate accepted and pending members
  const acceptedMembers = members.filter((m) => m.status === 'accepted')
  const pendingMembers = members.filter((m) => m.status === 'pending')

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  // Loading state
  if (isLoading) {
    return <TeamPageSkeleton />
  }

  return (
    <div className="relative">
      {/* Home arrow - far left, vertically centered with comment */}
      <Link
        href={`/dashboard/${institutionSlug}`}
        className="absolute left-5 top-[8px] text-traffic-red hover:text-traffic-red/80 transition-colors"
        title="Back to dashboard"
      >
        <MoveLeft className="h-[22px] w-[22px]" />
      </Link>

      {/* Tab Navigation */}
      <div className="max-w-[70%] mx-auto mt-[20px] flex items-center justify-between">
        <div className="flex items-center">
          <TabButton
            active={activeTab === 'members'}
            onClick={() => setActiveTab('members')}
            icon={Users}
            label="Members"
            count={members.length}
          />
          <TabButton
            active={activeTab === 'roles'}
            onClick={() => setActiveTab('roles')}
            icon={Shield}
            label="Roles"
            count={roles?.length}
          />
        </div>

        {activeTab === 'roles' && canManageTeam && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowInviteRoleModal(true)}
            className="h-7 px-3 text-xs font-mono"
          >
            <Plus className="h-3 w-3 mr-1" />
            Create Role
          </Button>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="max-w-[70%] mx-auto mt-[49px] p-4 border border-traffic-red/50 bg-traffic-red/5 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-traffic-red flex-shrink-0 mt-0.5" />
            <p className="text-sm font-mono text-foreground">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MEMBERS TAB */}
      {/* ============================================================ */}
      {activeTab === 'members' && (
        <>
          {/* Active Members */}
          <CodeCard className="max-w-[70%] mx-auto mt-[34px]">
            <CodeCardHeader
              filename="team.members"
              status="active"
              badge={
                <span className="font-mono text-xs text-muted-foreground">
                  {acceptedMembers.length} active
                </span>
              }
              rightContent={
                canManageTeam ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowInviteForm(!showInviteForm)}
                    className="h-6 px-2 text-xs"
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Invite
                  </Button>
                ) : undefined
              }
            />

            {/* Inline Invite Form with RoleSelector */}
            {showInviteForm && institutionId && (
              <form onSubmit={handleInvite} className="p-4 border-b border-border bg-muted/30">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="flex-1 min-w-[200px] px-3 py-1.5 rounded-md border border-border bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-traffic-green/50"
                      placeholder="colleague@example.com"
                      required
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowInviteForm(false)}
                        className="h-7 px-2 text-xs"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <CommandButton
                        command="send"
                        variant="primary"
                        size="sm"
                        type="submit"
                        disabled={isInviting || !inviteEmail || !inviteRoleId}
                        loading={isInviting}
                        className="h-7"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">
                      <span className="text-traffic-green">//</span> Select role:
                    </span>
                    <div className="flex-1 max-w-xs">
                      <RoleSelector
                        institutionId={institutionId}
                        value={inviteRoleId}
                        onChange={(roleId) => setInviteRoleId(roleId)}
                        placeholder="Choose a role..."
                        onCreateRole={() => setShowInviteRoleModal(true)}
                      />
                    </div>
                  </div>
                </div>
              </form>
            )}

            <div className="divide-y divide-border">
              {acceptedMembers.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No team members yet</p>
                </div>
              ) : (
                acceptedMembers.map((member) => (
                  <div key={member.id} className="p-4 flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground">
                          {(member.firstName?.[0] || member.email?.[0] || '?').toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">
                          {member.firstName
                            ? `${member.firstName} ${member.lastName || ''}`
                            : member.email}
                        </p>
                        {member.isOwner && (
                          <span className="px-1.5 py-0.5 rounded text-xs font-semibold bg-traffic-amber/20 text-traffic-amber">
                            Owner
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                    </div>

                    {/* Permissions (fallback when no roleColor) */}
                    {!member.roleColor && (
                      <div className="hidden md:flex flex-wrap gap-1 max-w-xs">
                        {member.permissions.slice(0, 3).map((perm) => (
                          <span
                            key={perm}
                            className="px-1.5 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground"
                          >
                            {PERMISSION_LABELS[perm] || perm}
                          </span>
                        ))}
                        {member.permissions.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
                            +{member.permissions.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Role Badge */}
                    {member.roleColor ? (
                      <RoleBadge
                        name={member.role}
                        color={member.roleColor}
                        size="sm"
                      />
                    ) : (
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-traffic-green/10 text-traffic-green capitalize">
                        {member.role}
                      </span>
                    )}

                    {/* Actions */}
                    {canManageTeam && !member.isOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemove(member)}
                        disabled={actionLoading === member.id}
                        className="text-traffic-red hover:text-traffic-red"
                      >
                        {actionLoading === member.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </CodeCard>

          {/* Pending Invitations */}
          {pendingMembers.length > 0 && (
            <CodeCard className="max-w-[70%] mx-auto mt-[34px]">
              <CodeCardHeader
                filename="invitations.pending"
                status="warning"
                badge={
                  <span className="font-mono text-xs text-traffic-amber">
                    {pendingMembers.length} pending
                  </span>
                }
              />
              <div className="divide-y divide-border">
                {pendingMembers.map((member) => (
                  <div key={member.id} className="p-4 flex items-center gap-4">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-full bg-traffic-amber/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-traffic-amber" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm truncate">{member.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Invited {formatDate(member.invitedAt)}
                        </span>
                        {member.expiresAt && (
                          <span className="text-xs text-traffic-amber">
                            Expires {formatDate(member.expiresAt)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Role Badge or Permissions fallback */}
                    {member.roleColor ? (
                      <RoleBadge
                        name={member.role}
                        color={member.roleColor}
                        size="sm"
                      />
                    ) : (
                      <div className="hidden md:flex flex-wrap gap-1 max-w-xs">
                        {member.permissions.slice(0, 2).map((perm) => (
                          <span
                            key={perm}
                            className="px-1.5 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground"
                          >
                            {PERMISSION_LABELS[perm] || perm}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    {canManageTeam && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResend(member)}
                          disabled={actionLoading === member.id}
                        >
                          {actionLoading === member.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Resend
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemove(member)}
                          disabled={actionLoading === member.id}
                          className="text-traffic-red hover:text-traffic-red"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CodeCard>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/* ROLES TAB */}
      {/* ============================================================ */}
      {activeTab === 'roles' && (
        <>
          {/* Roles List */}
          <div className="max-w-[70%] mx-auto mt-[34px]">
              {/* Roles Grid */}
              {rolesLoading ? (
                <RolesTabSkeleton />
              ) : roles && roles.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {roles.map((role) => (
                    <RoleCard
                      key={role.id}
                      role={role}
                      memberCount={getMemberCountForRole(role.id)}
                      onEdit={canManageTeam && !role.isSystem ? () => setEditingRole(role) : undefined}
                      onDelete={canManageTeam && !role.isSystem ? () => setDeletingRole(role) : undefined}
                    />
                  ))}
                </div>
              ) : (
                <CodeCard>
                  <div className="p-8 text-center">
                    <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground font-mono">
                      <span className="text-traffic-green">//</span> No roles defined yet
                    </p>
                    {canManageTeam && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowInviteRoleModal(true)}
                        className="mt-4 font-mono"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create your first role
                      </Button>
                    )}
                  </div>
                </CodeCard>
              )}
            </div>
        </>
      )}

      {/* Role Delete Confirmation Dialog */}
      {deletingRole && (
        <RoleDeleteDialog
          role={deletingRole}
          memberCount={getMemberCountForRole(deletingRole.id)}
          isOpen={!!deletingRole}
          onConfirm={handleDeleteRole}
          onCancel={() => setDeletingRole(null)}
          isDeleting={isDeletingRole}
        />
      )}

      {/* Inline Role Creation Modal for Invite Flow */}
      {institutionId && (
        <DottedModal
          isOpen={showInviteRoleModal}
          onClose={() => setShowInviteRoleModal(false)}
          title="Create New Role"
        >
          <DottedModalContent>
            <RoleForm
              institutionId={institutionId}
              onSuccess={handleInviteRoleCreated}
              onCancel={() => setShowInviteRoleModal(false)}
              showWrapper={false}
            />
          </DottedModalContent>
        </DottedModal>
      )}

      {/* Edit Role Modal */}
      {editingRole && institutionId && (
        <DottedModal
          isOpen={!!editingRole}
          onClose={() => setEditingRole(null)}
          title={`Edit ${editingRole.name}`}
        >
          <DottedModalContent>
            <RoleForm
              institutionId={institutionId}
              role={editingRole}
              onSuccess={handleRoleFormSuccess}
              onCancel={() => setEditingRole(null)}
              showWrapper={false}
            />
          </DottedModalContent>
        </DottedModal>
      )}
    </div>
  )
}
