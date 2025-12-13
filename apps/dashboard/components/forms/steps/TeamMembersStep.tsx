'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Input } from '@/components/ui/Input'
import { CommandButton } from '@/components/ui/CommandButton'
import { Users, Trash2, Mail, Shield } from 'lucide-react'

const teamMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.string().min(1, 'Role is required'),
  permissions: z.array(z.string()).optional(),
})

type TeamMemberFormData = z.infer<typeof teamMemberSchema>

export interface TeamMember {
  id: string
  email: string
  role: string
  permissions: string[]
}

interface TeamMembersStepProps {
  initialData?: TeamMember[]
  onSubmit: (teamMembers: TeamMember[]) => void
  onBack: () => void
  onCancel: () => void
  isSubmitting?: boolean
}

const availableRoles = [
  { value: 'admin', label: 'Admin', description: 'Full access to all features' },
  { value: 'reviewer', label: 'Reviewer', description: 'Review and manage applications' },
  { value: 'member', label: 'Member', description: 'View and basic operations' },
  { value: 'applicant', label: 'Applicant', description: 'Submit applications only' },
]

const availablePermissions = [
  { value: 'manage_campuses', label: 'Manage Campuses' },
  { value: 'manage_faculties', label: 'Manage Faculties' },
  { value: 'manage_courses', label: 'Manage Courses' },
  { value: 'review_applications', label: 'Review Applications' },
  { value: 'invite_members', label: 'Invite Members' },
  { value: 'view_analytics', label: 'View Analytics' },
]

// JSON-style label component
function SyntaxLabel({ name, required }: { name: string; required?: boolean }) {
  return (
    <label className="block font-mono text-sm mb-1.5">
      <span className="text-syntax-key">"{name}"</span>
      <span className="text-foreground"> :</span>
      {required && <span className="text-destructive ml-1">*</span>}
    </label>
  )
}

export function TeamMembersStep({
  initialData = [],
  onSubmit,
  onBack,
  onCancel,
  isSubmitting = false,
}: TeamMembersStepProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(initialData)
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<TeamMemberFormData>({
    resolver: zodResolver(teamMemberSchema),
  })

  const selectedRole = watch('role')

  const handleAddMember = (data: TeamMemberFormData) => {
    const newMember: TeamMember = {
      id: `member-${Date.now()}-${Math.random()}`,
      email: data.email,
      role: data.role,
      permissions: selectedPermissions,
    }

    setTeamMembers([...teamMembers, newMember])
    reset()
    setSelectedPermissions([])
    setIsAddingMember(false)
  }

  const handleRemoveMember = (id: string) => {
    setTeamMembers(teamMembers.filter((m) => m.id !== id))
  }

  const togglePermission = (permission: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    )
  }

  const handleFinalSubmit = () => {
    onSubmit(teamMembers)
  }

  return (
    <div className="space-y-6">
      {/* Header - Code Style */}
      <div className="flex items-center gap-3 mb-6">
        <Users className="h-5 w-5 text-syntax-key" />
        <h2 className="font-mono text-lg">
          <span className="text-syntax-export">export</span>
          <span className="text-syntax-key ml-2">Team Members</span>
        </h2>
      </div>

      <p className="font-mono text-xs text-traffic-green mb-6">
        // Invite team members to help manage this campus (optional)
      </p>

      {/* List of Added Team Members */}
      {teamMembers.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-mono text-xs text-traffic-green">
            // Team Members ({teamMembers.length})
          </h3>
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-start justify-between p-4 border border-border rounded-lg bg-muted/30"
            >
              <div className="flex-1 font-mono">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-4 w-4 text-syntax-key" />
                  <span className="text-syntax-string">"{member.email}"</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-syntax-key" />
                  <span className="text-sm text-syntax-key">{member.role}</span>
                </div>
                {member.permissions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {member.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="text-xs bg-syntax-key/10 text-syntax-key px-2 py-1 rounded"
                      >
                        {availablePermissions.find((p) => p.value === perm)?.label || perm}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleRemoveMember(member.id)}
                className="p-2 text-traffic-red hover:bg-traffic-red/10 rounded transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Team Member Form */}
      {isAddingMember ? (
        <form
          onSubmit={handleSubmit(handleAddMember)}
          className="space-y-6 p-6 border border-border rounded-lg bg-muted/10"
        >
          <h3 className="font-mono text-sm text-traffic-green">// Invite New Member</h3>

          <div className="space-y-1">
            <SyntaxLabel name="Email Address" required />
            <Input
              id="email"
              type="email"
              placeholder="colleague@university.edu"
              className="font-mono"
              {...register('email')}
            />
            {errors.email && (
              <p className="font-mono text-xs text-destructive">// Error: {errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <SyntaxLabel name="Role" required />
            <select
              id="role"
              {...register('role')}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background font-mono text-sm"
            >
              <option value="">// Select a role...</option>
              {availableRoles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label} - {role.description}
                </option>
              ))}
            </select>
            {errors.role && (
              <p className="font-mono text-xs text-destructive">// Error: {errors.role.message}</p>
            )}
          </div>

          {selectedRole && (
            <div className="space-y-3">
              <SyntaxLabel name="Custom Permissions" />
              <p className="font-mono text-xs text-traffic-green">
                // Select additional permissions for this role
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availablePermissions.map((permission) => (
                  <label
                    key={permission.value}
                    className="flex items-center gap-2 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors font-mono text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(permission.value)}
                      onChange={() => togglePermission(permission.value)}
                      className="h-4 w-4"
                    />
                    <span className="text-syntax-key">{permission.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <CommandButton type="submit" command="add" variant="primary" size="sm" />
            <CommandButton
              type="button"
              command="cancel"
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsAddingMember(false)
                setSelectedPermissions([])
                reset()
              }}
            />
          </div>
        </form>
      ) : (
        <CommandButton
          type="button"
          command="invite --member"
          variant="outline"
          onClick={() => setIsAddingMember(true)}
          className="w-full justify-center"
        />
      )}

      {/* Action Buttons - Command Style */}
      <div className="flex justify-between pt-6 border-t border-border">
        <div className="flex gap-2">
          <CommandButton type="button" command="back" variant="outline" onClick={onBack} />
          <CommandButton type="button" command="cancel" variant="ghost" onClick={onCancel} />
        </div>
        <CommandButton
          type="button"
          command={isSubmitting ? "populating..." : "populate --dashboard"}
          variant="primary"
          onClick={handleFinalSubmit}
          disabled={isSubmitting}
        />
      </div>

      {teamMembers.length === 0 && (
        <div className="text-center p-6 border-t border-border">
          <p className="font-mono text-xs text-traffic-green">
            // You can skip inviting team members and add them later
          </p>
        </div>
      )}
    </div>
  )
}
