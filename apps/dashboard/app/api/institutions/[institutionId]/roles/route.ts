import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { getAllPermissions, isValidPermission, type Permission } from '@/lib/constants/permissions'

// ============================================================================
// Types
// ============================================================================

interface Role {
  id: string
  name: string
  slug: string
  description: string | null
  permissions: string[]
  isSystem: boolean
  isDefault: boolean
  color: string
  memberCount: number
  createdAt: string
  updatedAt: string
}

interface CreateRoleRequest {
  name: string
  slug?: string
  description?: string
  permissions: string[]
  isDefault?: boolean
  color?: string
}

// ============================================================================
// Supabase Client
// ============================================================================

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Generate a URL-friendly slug from a name
 * Converts to lowercase, replaces spaces with hyphens, removes special chars
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '') // Remove special characters
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
}

/**
 * Validate slug format matches database constraint
 * Must be lowercase alphanumeric with hyphens (no leading/trailing/consecutive hyphens)
 */
function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
}

/**
 * Validate permissions array against canonical list
 */
function validatePermissions(permissions: string[]): { valid: boolean; invalid: string[] } {
  const invalid = permissions.filter((p) => !isValidPermission(p))
  return {
    valid: invalid.length === 0,
    invalid,
  }
}

// ============================================================================
// GET - List all roles for institution
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ institutionId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { institutionId } = await params
    const supabase = getSupabaseClient()

    // Get current user from database
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is institution owner
    const { data: institution } = await supabase
      .from('institutions')
      .select('created_by')
      .eq('id', institutionId)
      .single()

    if (!institution) {
      return NextResponse.json({ error: 'Institution not found' }, { status: 404 })
    }

    const isOwner = institution.created_by === userRecord.id

    // Check membership if not owner
    let currentUserRole: string | null = null
    let currentUserPermissions: string[] = []

    if (!isOwner) {
      const { data: membership } = await supabase
        .from('institution_members')
        .select('role, permissions, role_id')
        .eq('institution_id', institutionId)
        .eq('user_id', userRecord.id)
        .eq('invitation_status', 'accepted')
        .single()

      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      currentUserRole = membership.role
      currentUserPermissions = (membership.permissions as string[]) || []

      // If member has a role_id, get role details
      if (membership.role_id) {
        const { data: roleData } = await supabase
          .from('institution_roles')
          .select('slug, permissions')
          .eq('id', membership.role_id)
          .single()

        if (roleData) {
          currentUserRole = roleData.slug
          currentUserPermissions = (roleData.permissions as string[]) || []
        }
      }
    } else {
      currentUserRole = 'owner'
      currentUserPermissions = getAllPermissions()
    }

    // Fetch all roles for the institution
    const { data: roles, error: rolesError } = await supabase
      .from('institution_roles')
      .select('*')
      .eq('institution_id', institutionId)
      .order('is_system', { ascending: false })
      .order('name', { ascending: true })

    if (rolesError) {
      console.error('[Roles API] Error fetching roles:', rolesError)
      return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 })
    }

    // Get member counts for each role
    const roleIds = roles?.map((r) => r.id) || []
    let memberCounts: Record<string, number> = {}

    if (roleIds.length > 0) {
      const { data: memberCountData, error: countError } = await supabase
        .from('institution_members')
        .select('role_id')
        .eq('institution_id', institutionId)
        .eq('invitation_status', 'accepted')
        .in('role_id', roleIds)

      if (!countError && memberCountData) {
        memberCounts = memberCountData.reduce(
          (acc, member) => {
            if (member.role_id) {
              acc[member.role_id] = (acc[member.role_id] || 0) + 1
            }
            return acc
          },
          {} as Record<string, number>
        )
      }
    }

    // Transform roles to response format
    const transformedRoles: Role[] =
      roles?.map((role) => ({
        id: role.id,
        name: role.name,
        slug: role.slug,
        description: role.description,
        permissions: (role.permissions as string[]) || [],
        isSystem: role.is_system,
        isDefault: role.is_default,
        color: role.color || '#6B7280',
        memberCount: memberCounts[role.id] || 0,
        createdAt: role.created_at,
        updatedAt: role.updated_at,
      })) || []

    return NextResponse.json({
      roles: transformedRoles,
      currentUserRole,
    })
  } catch (error) {
    console.error('[Roles API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================================================
// POST - Create new custom role
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ institutionId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { institutionId } = await params
    const body: CreateRoleRequest = await request.json()

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json({ error: 'Role name is required' }, { status: 400 })
    }

    if (!Array.isArray(body.permissions)) {
      return NextResponse.json({ error: 'Permissions must be an array' }, { status: 400 })
    }

    // Validate permissions against canonical list
    const permissionValidation = validatePermissions(body.permissions)
    if (!permissionValidation.valid) {
      return NextResponse.json(
        {
          error: `Invalid permissions: ${permissionValidation.invalid.join(', ')}`,
          validPermissions: getAllPermissions(),
        },
        { status: 400 }
      )
    }

    // Generate or validate slug
    const slug = body.slug ? body.slug.trim() : generateSlug(body.name)

    if (!isValidSlug(slug)) {
      return NextResponse.json(
        {
          error:
            'Invalid slug format. Must be lowercase alphanumeric with hyphens (e.g., "custom-role")',
        },
        { status: 400 }
      )
    }

    // Validate color if provided
    if (body.color && !/^#[0-9A-Fa-f]{6}$/.test(body.color)) {
      return NextResponse.json(
        { error: 'Invalid color format. Must be a hex color code (e.g., "#FF5733")' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseClient()

    // Get current user from database
    const { data: userRecord } = await supabase
      .from('users')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is institution owner
    const { data: institution } = await supabase
      .from('institutions')
      .select('created_by')
      .eq('id', institutionId)
      .single()

    if (!institution) {
      return NextResponse.json({ error: 'Institution not found' }, { status: 404 })
    }

    const isOwner = institution.created_by === userRecord.id

    // Check if user has permission to create roles
    if (!isOwner) {
      const { data: membership } = await supabase
        .from('institution_members')
        .select('role, permissions, role_id')
        .eq('institution_id', institutionId)
        .eq('user_id', userRecord.id)
        .eq('invitation_status', 'accepted')
        .single()

      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      let memberPermissions: string[] = (membership.permissions as string[]) || []

      // If member has a role_id, get role permissions
      if (membership.role_id) {
        const { data: roleData } = await supabase
          .from('institution_roles')
          .select('permissions')
          .eq('id', membership.role_id)
          .single()

        if (roleData) {
          memberPermissions = (roleData.permissions as string[]) || []
        }
      }

      // Check if user has admin role or manage_team permission
      const hasManageTeamPermission =
        membership.role === 'admin' ||
        memberPermissions.includes('manage_team') ||
        memberPermissions.includes('admin_access')

      if (!hasManageTeamPermission) {
        return NextResponse.json(
          { error: 'Permission denied. Requires admin role or manage_team permission.' },
          { status: 403 }
        )
      }
    }

    // Check if slug already exists for this institution
    const { data: existingRole } = await supabase
      .from('institution_roles')
      .select('id')
      .eq('institution_id', institutionId)
      .eq('slug', slug)
      .single()

    if (existingRole) {
      return NextResponse.json(
        { error: `A role with slug "${slug}" already exists for this institution` },
        { status: 409 }
      )
    }

    // Create the role (is_system is always false for user-created roles)
    const { data: newRole, error: insertError } = await supabase
      .from('institution_roles')
      .insert({
        institution_id: institutionId,
        name: body.name.trim(),
        slug,
        description: body.description?.trim() || null,
        permissions: body.permissions,
        is_system: false, // User-created roles cannot be system roles
        is_default: body.isDefault ?? false,
        color: body.color || '#6B7280',
        created_by: userRecord.id,
      })
      .select('*')
      .single()

    if (insertError || !newRole) {
      console.error('[Roles API] Insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create role' }, { status: 500 })
    }

    // If this role is set as default, unset other default roles
    if (body.isDefault) {
      await supabase
        .from('institution_roles')
        .update({ is_default: false })
        .eq('institution_id', institutionId)
        .neq('id', newRole.id)
    }

    // Transform to response format
    const createdRole: Role = {
      id: newRole.id,
      name: newRole.name,
      slug: newRole.slug,
      description: newRole.description,
      permissions: (newRole.permissions as string[]) || [],
      isSystem: newRole.is_system,
      isDefault: newRole.is_default,
      color: newRole.color || '#6B7280',
      memberCount: 0,
      createdAt: newRole.created_at,
      updatedAt: newRole.updated_at,
    }

    return NextResponse.json({ role: createdRole }, { status: 201 })
  } catch (error) {
    console.error('[Roles API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
