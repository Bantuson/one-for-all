import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { getAllPermissions, isValidPermission, PERMISSIONS } from '@/lib/constants/permissions';

// ============================================================================
// Types
// ============================================================================

interface RoleUpdateBody {
  name?: string;
  description?: string;
  permissions?: string[];
  isDefault?: boolean;
  color?: string;
}

interface InstitutionRole {
  id: string;
  institution_id: string;
  name: string;
  slug: string;
  description: string | null;
  permissions: string[];
  is_system: boolean;
  is_default: boolean;
  color: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Supabase Client
// ============================================================================

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// ============================================================================
// Helper: Check team management authorization
// ============================================================================

async function checkTeamManagementAuth(
  supabase: ReturnType<typeof getSupabaseClient>,
  clerkUserId: string,
  institutionId: string
): Promise<{
  authorized: boolean;
  userId: string | null;
  isOwner: boolean;
  error?: string;
  statusCode?: number;
}> {
  // Get current user
  const { data: userRecord } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (!userRecord) {
    return {
      authorized: false,
      userId: null,
      isOwner: false,
      error: 'User not found',
      statusCode: 404,
    };
  }

  // Get institution
  const { data: institution } = await supabase
    .from('institutions')
    .select('created_by')
    .eq('id', institutionId)
    .single();

  if (!institution) {
    return {
      authorized: false,
      userId: userRecord.id,
      isOwner: false,
      error: 'Institution not found',
      statusCode: 404,
    };
  }

  const isOwner = institution.created_by === userRecord.id;

  if (isOwner) {
    return { authorized: true, userId: userRecord.id, isOwner: true };
  }

  // Check membership and permissions
  const { data: membership } = await supabase
    .from('institution_members')
    .select('role, permissions')
    .eq('institution_id', institutionId)
    .eq('user_id', userRecord.id)
    .eq('invitation_status', 'accepted')
    .single();

  const canManage =
    membership?.role === 'admin' ||
    (membership?.permissions as string[] | null)?.includes('manage_team');

  return {
    authorized: canManage || false,
    userId: userRecord.id,
    isOwner: false,
    error: canManage ? undefined : 'Permission denied',
    statusCode: canManage ? undefined : 403,
  };
}

// ============================================================================
// Helper: Check basic institution membership
// ============================================================================

async function checkInstitutionMembership(
  supabase: ReturnType<typeof getSupabaseClient>,
  clerkUserId: string,
  institutionId: string
): Promise<{
  isMember: boolean;
  userId: string | null;
  isOwner: boolean;
  error?: string;
  statusCode?: number;
}> {
  // Get current user
  const { data: userRecord } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (!userRecord) {
    return {
      isMember: false,
      userId: null,
      isOwner: false,
      error: 'User not found',
      statusCode: 404,
    };
  }

  // Check if user created the institution
  const { data: institution } = await supabase
    .from('institutions')
    .select('created_by')
    .eq('id', institutionId)
    .single();

  if (!institution) {
    return {
      isMember: false,
      userId: userRecord.id,
      isOwner: false,
      error: 'Institution not found',
      statusCode: 404,
    };
  }

  const isOwner = institution.created_by === userRecord.id;

  if (isOwner) {
    return { isMember: true, userId: userRecord.id, isOwner: true };
  }

  // Check membership
  const { data: membership } = await supabase
    .from('institution_members')
    .select('id')
    .eq('institution_id', institutionId)
    .eq('user_id', userRecord.id)
    .eq('invitation_status', 'accepted')
    .single();

  return {
    isMember: !!membership,
    userId: userRecord.id,
    isOwner: false,
    error: membership ? undefined : 'Access denied',
    statusCode: membership ? undefined : 403,
  };
}

// ============================================================================
// GET - Get single role details
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ institutionId: string; roleId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { institutionId, roleId } = await params;
    const supabase = getSupabaseClient();

    // Verify user is a member of the institution
    const membershipCheck = await checkInstitutionMembership(
      supabase,
      userId,
      institutionId
    );

    if (!membershipCheck.isMember) {
      return NextResponse.json(
        { error: membershipCheck.error },
        { status: membershipCheck.statusCode || 403 }
      );
    }

    // Get the role
    const { data: role, error: roleError } = await supabase
      .from('institution_roles')
      .select('*')
      .eq('id', roleId)
      .eq('institution_id', institutionId)
      .single();

    if (roleError || !role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Get member count for this role
    const { count: memberCount, error: countError } = await supabase
      .from('institution_members')
      .select('*', { count: 'exact', head: true })
      .eq('institution_id', institutionId)
      .eq('role_id', roleId)
      .eq('invitation_status', 'accepted');

    if (countError) {
      console.error('[Role GET] Error counting members:', countError);
    }

    // Transform role data for response
    const roleResponse = {
      id: role.id,
      institutionId: role.institution_id,
      name: role.name,
      slug: role.slug,
      description: role.description,
      permissions: role.permissions || [],
      isSystem: role.is_system,
      isDefault: role.is_default,
      color: role.color,
      memberCount: memberCount || 0,
      createdAt: role.created_at,
      updatedAt: role.updated_at,
    };

    return NextResponse.json(roleResponse);
  } catch (error) {
    console.error('[Role GET] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH - Update role
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ institutionId: string; roleId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { institutionId, roleId } = await params;
    const supabase = getSupabaseClient();

    // Verify user has admin role or manage_team permission
    const authResult = await checkTeamManagementAuth(
      supabase,
      userId,
      institutionId
    );

    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 403 }
      );
    }

    // Parse and validate request body
    let body: RoleUpdateBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const { name, description, permissions, isDefault, color } = body;

    // Validate at least one field is being updated
    if (
      name === undefined &&
      description === undefined &&
      permissions === undefined &&
      isDefault === undefined &&
      color === undefined
    ) {
      return NextResponse.json(
        { error: 'At least one field must be provided for update' },
        { status: 400 }
      );
    }

    // Get current role
    const { data: currentRole, error: fetchError } = await supabase
      .from('institution_roles')
      .select('*')
      .eq('id', roleId)
      .eq('institution_id', institutionId)
      .single();

    if (fetchError || !currentRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const typedRole = currentRole as InstitutionRole;

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json(
          { error: 'Role name must be a non-empty string' },
          { status: 400 }
        );
      }
      if (name.trim().length > 50) {
        return NextResponse.json(
          { error: 'Role name must not exceed 50 characters' },
          { status: 400 }
        );
      }
    }

    // Validate description if provided
    if (description !== undefined && description !== null) {
      if (typeof description !== 'string') {
        return NextResponse.json(
          { error: 'Description must be a string' },
          { status: 400 }
        );
      }
      if (description.length > 500) {
        return NextResponse.json(
          { error: 'Description must not exceed 500 characters' },
          { status: 400 }
        );
      }
    }

    // Validate permissions if provided
    if (permissions !== undefined) {
      if (!Array.isArray(permissions)) {
        return NextResponse.json(
          { error: 'Permissions must be an array' },
          { status: 400 }
        );
      }

      // Validate each permission against canonical list
      const invalidPermissions = permissions.filter(
        (perm) => !isValidPermission(perm)
      );
      if (invalidPermissions.length > 0) {
        return NextResponse.json(
          {
            error: `Invalid permissions: ${invalidPermissions.join(', ')}`,
            validPermissions: getAllPermissions(),
          },
          { status: 400 }
        );
      }

      // Cannot remove admin_access from system admin role
      if (
        typedRole.is_system &&
        typedRole.slug === 'admin' &&
        !permissions.includes(PERMISSIONS.ADMIN_ACCESS)
      ) {
        return NextResponse.json(
          {
            error:
              'Cannot remove admin_access permission from the system admin role',
          },
          { status: 400 }
        );
      }
    }

    // Validate color if provided
    if (color !== undefined && color !== null) {
      if (typeof color !== 'string') {
        return NextResponse.json(
          { error: 'Color must be a string' },
          { status: 400 }
        );
      }
      // Validate hex color format
      const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      if (!hexColorRegex.test(color)) {
        return NextResponse.json(
          { error: 'Color must be a valid hex color (e.g., #FF5733 or #F53)' },
          { status: 400 }
        );
      }
    }

    // Validate isDefault if provided
    if (isDefault !== undefined && typeof isDefault !== 'boolean') {
      return NextResponse.json(
        { error: 'isDefault must be a boolean' },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) {
      updateData.name = name.trim();
    }
    if (description !== undefined) {
      updateData.description = description;
    }
    if (permissions !== undefined) {
      updateData.permissions = permissions;
    }
    if (isDefault !== undefined) {
      updateData.is_default = isDefault;
    }
    if (color !== undefined) {
      updateData.color = color;
    }

    // If setting this role as default, unset other defaults first
    if (isDefault === true) {
      const { error: unsetError } = await supabase
        .from('institution_roles')
        .update({ is_default: false })
        .eq('institution_id', institutionId)
        .neq('id', roleId);

      if (unsetError) {
        console.error('[Role PATCH] Error unsetting default roles:', unsetError);
        return NextResponse.json(
          { error: 'Failed to update default role settings' },
          { status: 500 }
        );
      }
    }

    // Update role
    const { data: updatedRole, error: updateError } = await supabase
      .from('institution_roles')
      .update(updateData)
      .eq('id', roleId)
      .eq('institution_id', institutionId)
      .select('*')
      .single();

    if (updateError) {
      console.error('[Role PATCH] Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update role' },
        { status: 500 }
      );
    }

    // Get member count
    const { count: memberCount } = await supabase
      .from('institution_members')
      .select('*', { count: 'exact', head: true })
      .eq('institution_id', institutionId)
      .eq('role_id', roleId)
      .eq('invitation_status', 'accepted');

    // Transform response
    const roleResponse = {
      id: updatedRole.id,
      institutionId: updatedRole.institution_id,
      name: updatedRole.name,
      slug: updatedRole.slug,
      description: updatedRole.description,
      permissions: updatedRole.permissions || [],
      isSystem: updatedRole.is_system,
      isDefault: updatedRole.is_default,
      color: updatedRole.color,
      memberCount: memberCount || 0,
      createdAt: updatedRole.created_at,
      updatedAt: updatedRole.updated_at,
    };

    return NextResponse.json({
      success: true,
      role: roleResponse,
    });
  } catch (error) {
    console.error('[Role PATCH] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Delete role
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ institutionId: string; roleId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { institutionId, roleId } = await params;
    const supabase = getSupabaseClient();

    // Verify user has admin role or manage_team permission
    const authResult = await checkTeamManagementAuth(
      supabase,
      userId,
      institutionId
    );

    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 403 }
      );
    }

    // Get the role to check constraints
    const { data: role, error: fetchError } = await supabase
      .from('institution_roles')
      .select('*')
      .eq('id', roleId)
      .eq('institution_id', institutionId)
      .single();

    if (fetchError || !role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    const typedRole = role as InstitutionRole;

    // Cannot delete system roles
    if (typedRole.is_system) {
      return NextResponse.json(
        {
          error: 'Cannot delete system roles',
          reason: 'system_role',
          roleName: typedRole.name,
        },
        { status: 400 }
      );
    }

    // Check if members are assigned to this role
    const { count: memberCount, error: countError } = await supabase
      .from('institution_members')
      .select('*', { count: 'exact', head: true })
      .eq('institution_id', institutionId)
      .eq('role_id', roleId)
      .eq('invitation_status', 'accepted');

    if (countError) {
      console.error('[Role DELETE] Error counting members:', countError);
      return NextResponse.json(
        { error: 'Failed to verify role usage' },
        { status: 500 }
      );
    }

    if (memberCount && memberCount > 0) {
      return NextResponse.json(
        {
          error: 'Cannot delete role with assigned members',
          reason: 'members_assigned',
          memberCount,
          roleName: typedRole.name,
        },
        { status: 400 }
      );
    }

    // Delete the role
    const { error: deleteError } = await supabase
      .from('institution_roles')
      .delete()
      .eq('id', roleId)
      .eq('institution_id', institutionId);

    if (deleteError) {
      console.error('[Role DELETE] Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete role' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      deletedRoleId: roleId,
      roleName: typedRole.name,
    });
  } catch (error) {
    console.error('[Role DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
