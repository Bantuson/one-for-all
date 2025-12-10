'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Button } from '@/components/ui/Button'
import { Users, Plus, Trash2, Mail, Shield } from 'lucide-react'

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
      <div className="flex items-center gap-2 mb-6">
        <Users className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-semibold">Invite Team Members</h2>
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        Invite team members to help manage this campus. They'll receive an email
        invitation and will be automatically assigned to this campus when they create
        their account. You can skip this step and invite members later.
      </p>

      {/* List of Added Team Members */}
      {teamMembers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Team Members ({teamMembers.length})
          </h3>
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-start justify-between p-4 border rounded-lg bg-muted/30"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{member.email}</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm capitalize">{member.role}</span>
                </div>
                {member.permissions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {member.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="text-xs bg-primary/10 text-primary px-2 py-1 rounded"
                      >
                        {availablePermissions.find((p) => p.value === perm)?.label || perm}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveMember(member.id)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add Team Member Form */}
      {isAddingMember ? (
        <form
          onSubmit={handleSubmit(handleAddMember)}
          className="space-y-6 p-6 border rounded-lg bg-muted/10"
        >
          <h3 className="text-lg font-medium">Invite New Member</h3>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@university.edu"
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">
              Role <span className="text-red-500">*</span>
            </Label>
            <select
              id="role"
              {...register('role')}
              className="w-full px-3 py-2 border rounded-lg bg-background"
            >
              <option value="">Select a role...</option>
              {availableRoles.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label} - {role.description}
                </option>
              ))}
            </select>
            {errors.role && (
              <p className="text-sm text-red-500">{errors.role.message}</p>
            )}
          </div>

          {selectedRole && (
            <div className="space-y-3">
              <Label>Custom Permissions (Optional)</Label>
              <p className="text-sm text-muted-foreground">
                Select additional permissions for this role
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availablePermissions.map((permission) => (
                  <label
                    key={permission.value}
                    className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(permission.value)}
                      onChange={() => togglePermission(permission.value)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">{permission.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button type="submit" size="sm">
              Add Member
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAddingMember(false)
                setSelectedPermissions([])
                reset()
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsAddingMember(true)}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Invite Team Member
        </Button>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between pt-6 border-t">
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
        <Button
          type="button"
          onClick={handleFinalSubmit}
          disabled={isSubmitting}
          className="min-w-[200px]"
        >
          {isSubmitting ? 'Populating Dashboard...' : 'Populate Dashboard'}
        </Button>
      </div>

      {teamMembers.length === 0 && (
        <div className="text-center p-6 border-t">
          <p className="text-sm text-muted-foreground">
            You can skip inviting team members for now and add them later from settings.
          </p>
        </div>
      )}
    </div>
  )
}
