/**
 * Role Management Components
 *
 * A comprehensive set of components for managing roles and permissions
 * in the One For All admissions management platform.
 *
 * @module components/roles
 */

// ============================================================================
// Components
// ============================================================================

export { RoleBadge } from './RoleBadge'
export type { default as RoleBadgeComponent } from './RoleBadge'

export { RoleSelector } from './RoleSelector'
export type { Role } from './RoleSelector'
export type { default as RoleSelectorComponent } from './RoleSelector'

export { RolePermissionGrid } from './RolePermissionGrid'
export type { default as RolePermissionGridComponent } from './RolePermissionGrid'

export { RoleCard } from './RoleCard'
export type { default as RoleCardComponent } from './RoleCard'

export { RoleForm } from './RoleForm'
export type { default as RoleFormComponent } from './RoleForm'

export { RoleDeleteDialog } from './RoleDeleteDialog'
export type { default as RoleDeleteDialogComponent } from './RoleDeleteDialog'

// ============================================================================
// Hooks
// ============================================================================

export { useRoles } from './hooks/useRoles'
export { useCreateRole, useUpdateRole, useDeleteRole } from './hooks/useRoleMutations'
