'use client'

import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Permission } from '@/lib/constants/permissions'
import type { Role } from '../RoleSelector'
import { rolesQueryKey } from './useRoles'

// ============================================================================
// Types
// ============================================================================

interface CreateRolePayload {
  name: string
  description: string | null
  permissions: Permission[]
  color: string
  isDefault: boolean
}

interface UpdateRolePayload {
  name?: string
  description?: string | null
  permissions?: Permission[]
  color?: string
  isDefault?: boolean
}

interface MutationResult<T> {
  /** Execute the mutation */
  mutateAsync: (payload: T) => Promise<Role>
  /** Whether a mutation is in progress */
  isLoading: boolean
  /** Error from the last mutation */
  error: Error | null
  /** Reset the error state */
  reset: () => void
}

// ============================================================================
// API Functions
// ============================================================================

async function createRoleAPI(
  institutionId: string,
  payload: CreateRolePayload
): Promise<Role> {
  const response = await fetch(`/api/institutions/${institutionId}/roles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      errorData.message || `Failed to create role: ${response.statusText}`
    )
  }

  const data = await response.json()
  return data.role ?? data
}

async function updateRoleAPI(
  institutionId: string,
  roleId: string,
  payload: UpdateRolePayload
): Promise<Role> {
  const response = await fetch(
    `/api/institutions/${institutionId}/roles/${roleId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      errorData.message || `Failed to update role: ${response.statusText}`
    )
  }

  const data = await response.json()
  return data.role ?? data
}

async function deleteRoleAPI(
  institutionId: string,
  roleId: string
): Promise<void> {
  const response = await fetch(
    `/api/institutions/${institutionId}/roles/${roleId}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      errorData.message || `Failed to delete role: ${response.statusText}`
    )
  }
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * useCreateRole - Hook for creating a new role
 *
 * @param institutionId - The ID of the institution
 * @returns Mutation object with mutateAsync, isLoading, error, and reset
 *
 * @example
 * ```tsx
 * function CreateRoleButton({ institutionId }: { institutionId: string }) {
 *   const { mutateAsync, isLoading, error } = useCreateRole(institutionId)
 *
 *   const handleCreate = async () => {
 *     try {
 *       const role = await mutateAsync({
 *         name: 'New Role',
 *         description: 'A new role',
 *         permissions: ['view_dashboard'],
 *         color: '#3b82f6',
 *         isDefault: false,
 *       })
 *       console.log('Created role:', role)
 *     } catch (err) {
 *       console.error('Failed to create role:', err)
 *     }
 *   }
 *
 *   return <button onClick={handleCreate} disabled={isLoading}>Create</button>
 * }
 * ```
 */
export function useCreateRole(
  institutionId: string
): MutationResult<CreateRolePayload> {
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  const mutateAsync = React.useCallback(
    async (payload: CreateRolePayload): Promise<Role> => {
      setIsLoading(true)
      setError(null)

      try {
        const role = await createRoleAPI(institutionId, payload)
        // Invalidate the roles list
        queryClient.invalidateQueries({ queryKey: rolesQueryKey(institutionId) })
        return role
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [institutionId, queryClient]
  )

  const reset = React.useCallback(() => {
    setError(null)
  }, [])

  return { mutateAsync, isLoading, error, reset }
}

/**
 * useUpdateRole - Hook for updating an existing role
 *
 * @param institutionId - The ID of the institution
 * @param roleId - The ID of the role to update
 * @returns Mutation object with mutateAsync, isLoading, error, and reset
 *
 * @example
 * ```tsx
 * function EditRoleButton({ institutionId, roleId }: Props) {
 *   const { mutateAsync, isLoading } = useUpdateRole(institutionId, roleId)
 *
 *   const handleUpdate = async () => {
 *     await mutateAsync({ name: 'Updated Role Name' })
 *   }
 *
 *   return <button onClick={handleUpdate} disabled={isLoading}>Update</button>
 * }
 * ```
 */
export function useUpdateRole(
  institutionId: string,
  roleId: string
): MutationResult<UpdateRolePayload> {
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  const mutateAsync = React.useCallback(
    async (payload: UpdateRolePayload): Promise<Role> => {
      setIsLoading(true)
      setError(null)

      try {
        const role = await updateRoleAPI(institutionId, roleId, payload)
        // Invalidate the roles list
        queryClient.invalidateQueries({ queryKey: rolesQueryKey(institutionId) })
        return role
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [institutionId, roleId, queryClient]
  )

  const reset = React.useCallback(() => {
    setError(null)
  }, [])

  return { mutateAsync, isLoading, error, reset }
}

/**
 * useDeleteRole - Hook for deleting a role
 *
 * @param institutionId - The ID of the institution
 * @param roleId - The ID of the role to delete
 * @returns Mutation object with mutateAsync, isLoading, error, and reset
 *
 * @example
 * ```tsx
 * function DeleteRoleButton({ institutionId, roleId }: Props) {
 *   const { mutateAsync, isLoading } = useDeleteRole(institutionId, roleId)
 *
 *   const handleDelete = async () => {
 *     await mutateAsync({})
 *     // Role has been deleted
 *   }
 *
 *   return <button onClick={handleDelete} disabled={isLoading}>Delete</button>
 * }
 * ```
 */
export function useDeleteRole(
  institutionId: string,
  roleId: string
): MutationResult<Record<string, never>> {
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<Error | null>(null)

  const mutateAsync = React.useCallback(
    async (_payload: Record<string, never>): Promise<Role> => {
      setIsLoading(true)
      setError(null)

      try {
        await deleteRoleAPI(institutionId, roleId)
        // Invalidate the roles list
        queryClient.invalidateQueries({ queryKey: rolesQueryKey(institutionId) })
        // Return an empty role object since the role no longer exists
        return {} as Role
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error')
        setError(error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [institutionId, roleId, queryClient]
  )

  const reset = React.useCallback(() => {
    setError(null)
  }, [])

  return { mutateAsync, isLoading, error, reset }
}

export default { useCreateRole, useUpdateRole, useDeleteRole }
