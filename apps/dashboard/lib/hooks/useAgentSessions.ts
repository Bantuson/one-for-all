'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { useCallback, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { featureFlags, queryKeys } from '@/lib/config/featureFlags'
import type { AgentType, AgentSession } from '@/components/agents/AgentInstructionModal'

// ============================================================================
// Types
// ============================================================================

// API response shape from the backend
interface APIAgentSession {
  id: string
  agent_type: string
  status: string
  processed_items: number
  total_items: number
  created_at: string
  started_at?: string
  completed_at?: string
}

// Create session request body
interface CreateSessionRequest {
  agent_type: AgentType
  instructions: string
  target_type?: string
  target_ids?: string[]
}

// ============================================================================
// API Functions
// ============================================================================

async function fetchAgentSessions(institutionId: string): Promise<AgentSession[]> {
  const response = await fetch(`/api/institutions/${institutionId}/agent-sessions`)

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Unauthorized')
    }
    if (response.status === 403) {
      throw new Error('Access denied')
    }
    throw new Error('Failed to fetch agent sessions')
  }

  const data = await response.json()

  // Transform API response to AgentSession format
  return (data.sessions || []).map((s: APIAgentSession): AgentSession => ({
    id: s.id,
    agentType: s.agent_type as AgentType,
    status: s.status as AgentSession['status'],
    processedItems: s.processed_items || 0,
    totalItems: s.total_items || 0,
    createdAt: s.created_at,
  }))
}

async function createAgentSession(
  institutionId: string,
  request: CreateSessionRequest
): Promise<AgentSession> {
  const response = await fetch(`/api/institutions/${institutionId}/agent-sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to create agent session')
  }

  const data = await response.json()
  const s = data.session

  return {
    id: s.id,
    agentType: s.agent_type as AgentType,
    status: s.status as AgentSession['status'],
    processedItems: s.processed_items || 0,
    totalItems: s.total_items || 0,
    createdAt: s.created_at,
  }
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * React Query hook for managing agent sessions.
 *
 * Features:
 * - Automatic caching and request deduplication
 * - Optimistic updates for immediate UI feedback
 * - Supabase realtime integration for live status updates
 * - Polling fallback when realtime is not available
 *
 * @param institutionId - The institution to fetch sessions for
 * @param options.enabled - Whether to enable the query (default: true)
 * @param options.enableRealtime - Enable Supabase realtime updates (default: true)
 * @param options.pollingInterval - Polling interval in ms when realtime is disabled (default: 0 = disabled)
 */
export function useAgentSessions(
  institutionId: string | null,
  options?: {
    enabled?: boolean
    enableRealtime?: boolean
    pollingInterval?: number
  }
) {
  const { userId } = useAuth()
  const queryClient = useQueryClient()
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null)

  const enabled =
    !!userId &&
    !!institutionId &&
    featureFlags.USE_REACT_QUERY_STATE &&
    (options?.enabled !== false)

  // Main query for fetching sessions
  const {
    data: sessions = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.agent.sessions(userId || '', institutionId || ''),
    queryFn: () => fetchAgentSessions(institutionId!),
    enabled,
    staleTime: featureFlags.RQ_STALE_TIME,
    gcTime: featureFlags.RQ_CACHE_TIME,
    // Enable polling as fallback when realtime is disabled
    refetchInterval: options?.pollingInterval || false,
  })

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  // Create session mutation with optimistic update
  const createSessionMutation = useMutation({
    mutationFn: async (params: {
      agentType: AgentType
      instructions: string
      targetType?: string
      targetIds?: string[]
    }): Promise<AgentSession> => {
      if (!institutionId) {
        throw new Error('Institution ID is required')
      }

      return createAgentSession(institutionId, {
        agent_type: params.agentType,
        instructions: params.instructions,
        target_type: params.targetType,
        target_ids: params.targetIds,
      })
    },
    onMutate: async (params) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.agent.sessions(userId || '', institutionId || ''),
      })

      // Snapshot previous value
      const previousSessions = queryClient.getQueryData<AgentSession[]>(
        queryKeys.agent.sessions(userId || '', institutionId || '')
      )

      // Optimistically add new session
      const optimisticSession: AgentSession = {
        id: `temp-${Date.now()}`,
        agentType: params.agentType,
        status: 'pending',
        processedItems: 0,
        totalItems: 0,
        createdAt: new Date().toISOString(),
      }

      queryClient.setQueryData<AgentSession[]>(
        queryKeys.agent.sessions(userId || '', institutionId || ''),
        (old) => [optimisticSession, ...(old || [])]
      )

      return { previousSessions }
    },
    onError: (_err, _params, context) => {
      // Rollback on error
      if (context?.previousSessions) {
        queryClient.setQueryData(
          queryKeys.agent.sessions(userId || '', institutionId || ''),
          context.previousSessions
        )
      }
    },
    onSuccess: (newSession) => {
      // Replace optimistic session with real one
      queryClient.setQueryData<AgentSession[]>(
        queryKeys.agent.sessions(userId || '', institutionId || ''),
        (old) => {
          const filtered = (old || []).filter(s => !s.id.startsWith('temp-'))
          return [newSession, ...filtered]
        }
      )
    },
  })

  // Update session status mutation (for local cache updates from realtime)
  const updateSessionStatusMutation = useMutation({
    mutationFn: async (_: {
      sessionId: string
      status: AgentSession['status']
    }): Promise<void> => {
      void _; // Required for optimistic update pattern
    },
    onMutate: async (params) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.agent.sessions(userId || '', institutionId || ''),
      })

      const previousSessions = queryClient.getQueryData<AgentSession[]>(
        queryKeys.agent.sessions(userId || '', institutionId || '')
      )

      queryClient.setQueryData<AgentSession[]>(
        queryKeys.agent.sessions(userId || '', institutionId || ''),
        (old) =>
          (old || []).map(session =>
            session.id === params.sessionId
              ? { ...session, status: params.status }
              : session
          )
      )

      return { previousSessions }
    },
  })

  // Update session progress mutation
  const updateSessionProgressMutation = useMutation({
    mutationFn: async (_: {
      sessionId: string
      processed: number
      total: number
    }): Promise<void> => {
      void _; // Required for optimistic update pattern
    },
    onMutate: async (params) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.agent.sessions(userId || '', institutionId || ''),
      })

      const previousSessions = queryClient.getQueryData<AgentSession[]>(
        queryKeys.agent.sessions(userId || '', institutionId || '')
      )

      queryClient.setQueryData<AgentSession[]>(
        queryKeys.agent.sessions(userId || '', institutionId || ''),
        (old) =>
          (old || []).map(session =>
            session.id === params.sessionId
              ? {
                  ...session,
                  processedItems: params.processed,
                  totalItems: params.total,
                }
              : session
          )
      )

      return { previousSessions }
    },
  })

  // -------------------------------------------------------------------------
  // Realtime Subscription
  // -------------------------------------------------------------------------

  useEffect(() => {
    // Only subscribe when enabled and realtime is requested
    if (!institutionId || options?.enableRealtime === false || !enabled) {
      return
    }

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Clean up existing channel if any
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current)
    }

    const channel = supabase
      .channel(`agent-sessions-rq-${institutionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agent_sessions',
          filter: `institution_id=eq.${institutionId}`,
        },
        (payload) => {
          const rawSession = payload.new as APIAgentSession

          if (payload.eventType === 'INSERT') {
            // Add new session to cache
            const newSession: AgentSession = {
              id: rawSession.id,
              agentType: rawSession.agent_type as AgentType,
              status: rawSession.status as AgentSession['status'],
              processedItems: rawSession.processed_items || 0,
              totalItems: rawSession.total_items || 0,
              createdAt: rawSession.created_at,
            }

            queryClient.setQueryData<AgentSession[]>(
              queryKeys.agent.sessions(userId || '', institutionId),
              (old) => {
                // Avoid duplicates
                const filtered = (old || []).filter(
                  s => s.id !== newSession.id && !s.id.startsWith('temp-')
                )
                return [newSession, ...filtered]
              }
            )
          } else if (payload.eventType === 'UPDATE') {
            // Update existing session in cache
            queryClient.setQueryData<AgentSession[]>(
              queryKeys.agent.sessions(userId || '', institutionId),
              (old) =>
                (old || []).map(session =>
                  session.id === rawSession.id
                    ? {
                        ...session,
                        status: rawSession.status as AgentSession['status'],
                        processedItems: rawSession.processed_items || 0,
                        totalItems: rawSession.total_items || 0,
                      }
                    : session
                )
            )
          } else if (payload.eventType === 'DELETE') {
            const oldSession = payload.old as { id: string }
            queryClient.setQueryData<AgentSession[]>(
              queryKeys.agent.sessions(userId || '', institutionId),
              (old) => (old || []).filter(s => s.id !== oldSession.id)
            )
          }
        }
      )
      .subscribe()

    realtimeChannelRef.current = channel

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current)
        realtimeChannelRef.current = null
      }
    }
  }, [institutionId, options?.enableRealtime, enabled, queryClient, userId])

  // -------------------------------------------------------------------------
  // Action Helpers
  // -------------------------------------------------------------------------

  const createSession = useCallback(
    async (
      agentType: AgentType,
      instructions: string,
      targetType?: string,
      targetIds?: string[]
    ) => {
      return createSessionMutation.mutateAsync({
        agentType,
        instructions,
        targetType,
        targetIds,
      })
    },
    [createSessionMutation]
  )

  const updateSessionStatus = useCallback(
    (sessionId: string, status: AgentSession['status']) => {
      return updateSessionStatusMutation.mutateAsync({ sessionId, status })
    },
    [updateSessionStatusMutation]
  )

  const updateSessionProgress = useCallback(
    (sessionId: string, processed: number, total: number) => {
      return updateSessionProgressMutation.mutateAsync({
        sessionId,
        processed,
        total,
      })
    },
    [updateSessionProgressMutation]
  )

  // Computed values
  const activeCount = sessions.filter(s => s.status === 'running').length
  const runningSessions = sessions.filter(s => s.status === 'running')
  const pendingSessions = sessions.filter(s => s.status === 'pending')
  const completedSessions = sessions.filter(
    s => s.status === 'completed' || s.status === 'failed'
  )

  return {
    // Data
    sessions,
    activeCount,
    runningSessions,
    pendingSessions,
    completedSessions,

    // Loading states
    isLoading,
    isFetching,
    error,

    // Actions
    createSession,
    updateSessionStatus,
    updateSessionProgress,
    refetch,

    // Mutation states
    isCreatingSession: createSessionMutation.isPending,
    createError: createSessionMutation.error,
  }
}

/**
 * Hook to access a specific agent session.
 * Provides derived state for a single session with live updates.
 */
export function useAgentSession(institutionId: string | null, sessionId: string | null) {
  const { sessions, updateSessionStatus, updateSessionProgress } = useAgentSessions(institutionId)

  const session = sessionId
    ? sessions.find(s => s.id === sessionId) || null
    : null

  // Calculate progress percentage
  const progressPercent = session
    ? session.totalItems > 0
      ? Math.round((session.processedItems / session.totalItems) * 100)
      : 0
    : 0

  const isRunning = session?.status === 'running'
  const isCompleted = session?.status === 'completed'
  const isFailed = session?.status === 'failed'
  const isPending = session?.status === 'pending'

  return {
    session,
    progressPercent,
    isRunning,
    isCompleted,
    isFailed,
    isPending,

    // Scoped actions
    updateStatus: useCallback(
      (status: AgentSession['status']) => {
        if (sessionId) {
          return updateSessionStatus(sessionId, status)
        }
        return Promise.resolve()
      },
      [sessionId, updateSessionStatus]
    ),
    updateProgress: useCallback(
      (processed: number, total: number) => {
        if (sessionId) {
          return updateSessionProgress(sessionId, processed, total)
        }
        return Promise.resolve()
      },
      [sessionId, updateSessionProgress]
    ),
  }
}
