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
} from 'lucide-react'
import Link from 'next/link'
import { CodeCard, CodeCardHeader } from '@/components/ui/CodeCard'
import { CommandButton } from '@/components/ui/CommandButton'
import { Button } from '@/components/ui/Button'

// ============================================================================
// Types
// ============================================================================

interface TeamMember {
  id: string
  role: string
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

interface MembersResponse {
  members: TeamMember[]
  isOwner: boolean
  currentUserRole: string | null
}

// ============================================================================
// Permission Labels
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

  // Invite form state
  const [showInviteForm, setShowInviteForm] = React.useState(false)
  const [inviteEmail, setInviteEmail] = React.useState('')
  const [invitePermissions, setInvitePermissions] = React.useState<string[]>(['view_dashboard'])
  const [isInviting, setIsInviting] = React.useState(false)

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

  // Can user manage team?
  const canManageTeam = isOwner || currentUserRole === 'admin' ||
    members.find(m => m.email === inviteEmail)?.permissions?.includes('manage_team')

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
    if (!institutionId || !inviteEmail) return

    setIsInviting(true)
    setError(null)

    try {
      const response = await fetch('/api/register/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institution_id: institutionId,
          email: inviteEmail,
          permissions: invitePermissions,
        }),
      })

      if (response.ok) {
        setInviteEmail('')
        setInvitePermissions(['view_dashboard'])
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

  // Toggle permission in invite form
  const togglePermission = (perm: string) => {
    setInvitePermissions((prev) =>
      prev.includes(perm)
        ? prev.filter((p) => p !== perm)
        : [...prev, perm]
    )
  }

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
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Home arrow - far left, vertically centered with comment */}
      <Link
        href={`/dashboard/${institutionSlug}`}
        className="absolute left-5 top-[2px] text-traffic-red hover:text-traffic-red/80 transition-colors"
        title="Back to dashboard"
      >
        <MoveLeft className="h-[22px] w-[22px]" />
      </Link>

      {/* Centered Comment - 19px offset from 3rd grid line (83px from top, 27px from content) */}
      <p className="text-sm text-muted-foreground text-center mt-[27px]">
        <span className="text-traffic-green">//</span> Manage team members and permissions
      </p>

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

      {/* Active Members - 15px offset from 5th grid line (143px from top) */}
      <CodeCard className="max-w-[70%] mx-auto mt-[49px]">
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

        {/* Inline Invite Form */}
        {showInviteForm && (
          <form onSubmit={handleInvite} className="p-4 border-b border-border bg-muted/30">
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 min-w-[200px] px-3 py-1.5 rounded-md border border-border bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-traffic-green/50"
                placeholder="colleague@example.com"
                required
              />
              <div className="flex flex-wrap gap-1">
                {Object.entries(PERMISSION_LABELS).slice(0, 4).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => togglePermission(key)}
                    className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                      invitePermissions.includes(key)
                        ? 'bg-traffic-green/20 text-traffic-green border border-traffic-green/30'
                        : 'bg-muted text-muted-foreground border border-border hover:border-traffic-green/30'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
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
                  disabled={isInviting || !inviteEmail}
                  loading={isInviting}
                  className="h-7"
                />
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
                    <span className="font-mono text-sm text-muted-foreground">
                      {(member.firstName?.[0] || member.email?.[0] || '?').toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm font-medium truncate">
                      {member.firstName
                        ? `${member.firstName} ${member.lastName || ''}`
                        : member.email}
                    </p>
                    {member.isOwner && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-traffic-amber/20 text-traffic-amber">
                        Owner
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                </div>

                {/* Permissions */}
                <div className="hidden md:flex flex-wrap gap-1 max-w-xs">
                  {member.permissions.slice(0, 3).map((perm) => (
                    <span
                      key={perm}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground"
                    >
                      {PERMISSION_LABELS[perm] || perm}
                    </span>
                  ))}
                  {member.permissions.length > 3 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground">
                      +{member.permissions.length - 3}
                    </span>
                  )}
                </div>

                {/* Role */}
                <span className="px-2 py-1 rounded text-xs font-mono bg-traffic-green/10 text-traffic-green capitalize">
                  {member.role}
                </span>

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
        <CodeCard className="max-w-[70%] mx-auto mt-6">
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

                {/* Permissions */}
                <div className="hidden md:flex flex-wrap gap-1 max-w-xs">
                  {member.permissions.slice(0, 2).map((perm) => (
                    <span
                      key={perm}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground"
                    >
                      {PERMISSION_LABELS[perm] || perm}
                    </span>
                  ))}
                </div>

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
    </div>
  )
}
