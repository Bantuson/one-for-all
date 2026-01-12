'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Role } from '../RoleSelector'

// ============================================================================
// Types
// ============================================================================

interface UseRolesResult {
  /** List of roles for the institution */
  roles: Role[] | undefined
  /** Whether the roles are currently loading */
  isLoading: boolean
  /** Error that occurred during fetch */
  error: Error | null
  /** Function to revalidate the data */
  mutate: () => void
  /** Whether the data is being revalidated */
  isValidating: boolean
}

// ============================================================================
// Fetcher
// ============================================================================

async function fetchRoles(institutionId: string): Promise<Role[]> {
  const response = await fetch(`/api/institutions/${institutionId}/roles`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      errorData.message || `Failed to fetch roles: ${response.statusText}`
    )
  }

  const data = await response.json()
  return data.roles ?? data
}

// ============================================================================
// Query Keys
// ============================================================================

export const rolesQueryKey = (institutionId: string) => ['roles', institutionId] as const

// ============================================================================
// Hook
// ============================================================================

/**
 * useRoles - React Query hook for fetching roles for an institution
 *
 * Fetches roles from /api/institutions/{id}/roles and provides
 * loading, error, and revalidation states.
 *
 * @param institutionId - The ID of the institution to fetch roles for
 * @returns Object containing roles, loading state, error, and mutate function
 *
 * @example
 * ```tsx
 * function RolesList({ institutionId }: { institutionId: string }) {
 *   const { roles, isLoading, error, mutate } = useRoles(institutionId)
 *
 *   if (isLoading) return <Loading />
 *   if (error) return <Error message={error.message} />
 *
 *   return (
 *     <ul>
 *       {roles?.map(role => (
 *         <li key={role.id}>{role.name}</li>
 *       ))}
 *     </ul>
 *   )
 * }
 * ```
 */
export function useRoles(institutionId: string | null | undefined): UseRolesResult {
  const queryClient = useQueryClient()

  const {
    data: roles,
    error,
    isLoading,
    isFetching,
  } = useQuery<Role[], Error>({
    queryKey: institutionId ? rolesQueryKey(institutionId) : ['roles-disabled'],
    queryFn: () => fetchRoles(institutionId!),
    enabled: !!institutionId,
    staleTime: 5000,
    retry: 2,
    refetchOnWindowFocus: false,
  })

  const mutate = () => {
    if (institutionId) {
      queryClient.invalidateQueries({ queryKey: rolesQueryKey(institutionId) })
    }
  }

  return {
    roles,
    isLoading,
    error: error ?? null,
    mutate,
    isValidating: isFetching && !isLoading,
  }
}

export default useRoles
