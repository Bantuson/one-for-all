'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { useCallback, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { featureFlags, queryKeys } from '@/lib/config/featureFlags'
import type { AgentType } from '@/components/agents/AgentInstructionModal'

// ============================================================================
// Types
// ============================================================================

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  progressUpdate?: {
    processed: number
    total: number
    currentItem?: string
  }
  resultCard?: DocumentReviewResult | RankingResult | AnalyticsResult
  chartConfig?: ChartConfig
}

export interface DocumentReviewResult {
  type: 'document_review'
  totalProcessed: number
  approved: Array<{
    applicantName: string
    documentCount: number
  }>
  flagged: Array<{
    applicantName: string
    documentType: string
    reason: string
    actionsTaken: string[]
  }>
}

export interface RankingResult {
  type: 'aps_ranking'
  totalRanked: number
  intakeLimit: number
  cutoffAps: number
  autoAccept: Array<{
    rank: number
    applicantName: string
    apsScore: number
  }>
  conditional: Array<{
    rank: number
    applicantName: string
    apsScore: number
  }>
  waitlist: Array<{
    rank: number
    applicantName: string
    apsScore: number
  }>
  rejected: Array<{
    rank: number
    applicantName: string
    apsScore: number
  }>
}

export interface AnalyticsResult {
  type: 'analytics'
  title: string
  chartData: unknown
  insights: string[]
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'area'
  data: unknown[]
  xKey?: string
  yKey?: string
  colors?: string[]
  title?: string
}

export interface SavedChart {
  id: string
  sessionId: string
  config: ChartConfig
  title: string
  createdAt: string
}

export interface ChatSession {
  id: string
  agentType: AgentType
  courseId?: string
  institutionId: string
  messages: ChatMessage[]
  status: 'idle' | 'active' | 'completed'
  createdAt: string
  updatedAt: string
}

// API response types
interface ChatSessionsResponse {
  sessions: ChatSession[]
  savedCharts: SavedChart[]
}

// ============================================================================
// Local Storage Persistence (for chat sessions - client-side only)
// ============================================================================

const STORAGE_KEY = 'chat-sessions-rq'

function loadFromStorage(): ChatSessionsResponse {
  if (typeof window === 'undefined') {
    return { sessions: [], savedCharts: [] }
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      // Rehydrate Date objects in messages
      const sessions = (data.sessions || []).map((session: ChatSession) => ({
        ...session,
        messages: session.messages.map((msg: ChatMessage) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      }))
      return { sessions, savedCharts: data.savedCharts || [] }
    }
  } catch (error) {
    console.error('Failed to load chat sessions from storage:', error)
  }

  return { sessions: [], savedCharts: [] }
}

function saveToStorage(data: ChatSessionsResponse): void {
  if (typeof window === 'undefined') return

  try {
    const serialized = {
      sessions: data.sessions.map(session => ({
        ...session,
        messages: session.messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp instanceof Date
            ? msg.timestamp.toISOString()
            : msg.timestamp,
        })),
      })),
      savedCharts: data.savedCharts,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized))
  } catch (error) {
    console.error('Failed to save chat sessions to storage:', error)
  }
}

// ============================================================================
// Query Functions
// ============================================================================

async function fetchChatSessions(): Promise<ChatSessionsResponse> {
  // Chat sessions are stored locally in localStorage
  // This could be extended to sync with a backend API
  return loadFromStorage()
}

// ============================================================================
// Mutation Functions
// ============================================================================

interface CreateSessionParams {
  agentType: AgentType
  institutionId: string
  courseId?: string
}

interface AddMessageParams {
  sessionId: string
  message: Omit<ChatMessage, 'id' | 'timestamp'>
}

interface UpdateMessageParams {
  sessionId: string
  messageId: string
  updates: Partial<ChatMessage>
}

interface UpdateSessionStatusParams {
  sessionId: string
  status: ChatSession['status']
}

interface SaveChartParams {
  sessionId: string
  config: ChartConfig
  title: string
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * React Query hook for managing chat sessions.
 *
 * Features:
 * - Automatic caching and deduplication
 * - Optimistic updates for better UX
 * - LocalStorage persistence
 * - Supabase realtime integration (optional)
 *
 * @param options.institutionId - Filter sessions by institution
 * @param options.enableRealtime - Enable Supabase realtime updates
 */
export function useChatSessions(options?: {
  institutionId?: string
  enableRealtime?: boolean
}) {
  const { userId } = useAuth()
  const queryClient = useQueryClient()
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null)

  // Main query for fetching sessions
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.chat.sessions(userId || ''),
    queryFn: fetchChatSessions,
    enabled: !!userId && featureFlags.USE_REACT_QUERY_STATE,
    staleTime: featureFlags.RQ_STALE_TIME,
    gcTime: featureFlags.RQ_CACHE_TIME,
  })

  // Filter sessions by institution if provided
  const sessions = options?.institutionId
    ? (data?.sessions || []).filter(s => s.institutionId === options.institutionId)
    : (data?.sessions || [])

  const savedCharts = data?.savedCharts || []

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  // Create session mutation with optimistic update
  const createSessionMutation = useMutation({
    mutationFn: async (params: CreateSessionParams): Promise<ChatSession> => {
      const newSession: ChatSession = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        agentType: params.agentType,
        institutionId: params.institutionId,
        courseId: params.courseId,
        messages: [],
        status: 'idle',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      return newSession
    },
    onMutate: async (params) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.chat.sessions(userId || ''),
      })

      // Snapshot previous value
      const previousData = queryClient.getQueryData<ChatSessionsResponse>(
        queryKeys.chat.sessions(userId || '')
      )

      // Optimistically update
      const newSession: ChatSession = {
        id: `temp-${Date.now()}`,
        agentType: params.agentType,
        institutionId: params.institutionId,
        courseId: params.courseId,
        messages: [],
        status: 'idle',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      queryClient.setQueryData<ChatSessionsResponse>(
        queryKeys.chat.sessions(userId || ''),
        (old) => ({
          sessions: [newSession, ...(old?.sessions || [])],
          savedCharts: old?.savedCharts || [],
        })
      )

      return { previousData }
    },
    onError: (_err, _params, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          queryKeys.chat.sessions(userId || ''),
          context.previousData
        )
      }
    },
    onSuccess: (newSession) => {
      // Replace temp session with real one
      queryClient.setQueryData<ChatSessionsResponse>(
        queryKeys.chat.sessions(userId || ''),
        (old) => {
          const sessions = (old?.sessions || []).map(s =>
            s.id.startsWith('temp-') ? newSession : s
          )
          const updated = { sessions, savedCharts: old?.savedCharts || [] }
          saveToStorage(updated)
          return updated
        }
      )
    },
  })

  // Add message mutation
  const addMessageMutation = useMutation({
    mutationFn: async (params: AddMessageParams): Promise<ChatMessage> => {
      const newMessage: ChatMessage = {
        ...params.message,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        timestamp: new Date(),
      }
      return newMessage
    },
    onMutate: async (params) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.chat.sessions(userId || ''),
      })

      const previousData = queryClient.getQueryData<ChatSessionsResponse>(
        queryKeys.chat.sessions(userId || '')
      )

      const newMessage: ChatMessage = {
        ...params.message,
        id: `temp-${Date.now()}`,
        timestamp: new Date(),
      }

      queryClient.setQueryData<ChatSessionsResponse>(
        queryKeys.chat.sessions(userId || ''),
        (old) => ({
          sessions: (old?.sessions || []).map(session =>
            session.id === params.sessionId
              ? {
                  ...session,
                  messages: [...session.messages, newMessage],
                  updatedAt: new Date().toISOString(),
                }
              : session
          ),
          savedCharts: old?.savedCharts || [],
        })
      )

      return { previousData }
    },
    onError: (_err, _params, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          queryKeys.chat.sessions(userId || ''),
          context.previousData
        )
      }
    },
    onSuccess: (newMessage, params) => {
      queryClient.setQueryData<ChatSessionsResponse>(
        queryKeys.chat.sessions(userId || ''),
        (old) => {
          const sessions = (old?.sessions || []).map(session =>
            session.id === params.sessionId
              ? {
                  ...session,
                  messages: session.messages.map(msg =>
                    msg.id.startsWith('temp-') ? newMessage : msg
                  ),
                }
              : session
          )
          const updated = { sessions, savedCharts: old?.savedCharts || [] }
          saveToStorage(updated)
          return updated
        }
      )
    },
  })

  // Update message mutation
  const updateMessageMutation = useMutation({
    mutationFn: async (_: UpdateMessageParams): Promise<void> => {
      void _; // Required for optimistic update pattern
    },
    onMutate: async (params) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.chat.sessions(userId || ''),
      })

      const previousData = queryClient.getQueryData<ChatSessionsResponse>(
        queryKeys.chat.sessions(userId || '')
      )

      queryClient.setQueryData<ChatSessionsResponse>(
        queryKeys.chat.sessions(userId || ''),
        (old) => {
          const sessions = (old?.sessions || []).map(session =>
            session.id === params.sessionId
              ? {
                  ...session,
                  messages: session.messages.map(msg =>
                    msg.id === params.messageId
                      ? { ...msg, ...params.updates }
                      : msg
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : session
          )
          const updated = { sessions, savedCharts: old?.savedCharts || [] }
          saveToStorage(updated)
          return updated
        }
      )

      return { previousData }
    },
    onError: (_err, _params, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          queryKeys.chat.sessions(userId || ''),
          context.previousData
        )
      }
    },
  })

  // Update session status mutation
  const updateSessionStatusMutation = useMutation({
    mutationFn: async (_: UpdateSessionStatusParams): Promise<void> => {
      void _; // Required for optimistic update pattern
    },
    onMutate: async (params) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.chat.sessions(userId || ''),
      })

      const previousData = queryClient.getQueryData<ChatSessionsResponse>(
        queryKeys.chat.sessions(userId || '')
      )

      queryClient.setQueryData<ChatSessionsResponse>(
        queryKeys.chat.sessions(userId || ''),
        (old) => {
          const sessions = (old?.sessions || []).map(session =>
            session.id === params.sessionId
              ? {
                  ...session,
                  status: params.status,
                  updatedAt: new Date().toISOString(),
                }
              : session
          )
          const updated = { sessions, savedCharts: old?.savedCharts || [] }
          saveToStorage(updated)
          return updated
        }
      )

      return { previousData }
    },
    onError: (_err, _params, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          queryKeys.chat.sessions(userId || ''),
          context.previousData
        )
      }
    },
  })

  // Save chart mutation
  const saveChartMutation = useMutation({
    mutationFn: async (params: SaveChartParams): Promise<SavedChart> => {
      const newChart: SavedChart = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        sessionId: params.sessionId,
        config: params.config,
        title: params.title,
        createdAt: new Date().toISOString(),
      }
      return newChart
    },
    onSuccess: (newChart) => {
      queryClient.setQueryData<ChatSessionsResponse>(
        queryKeys.chat.sessions(userId || ''),
        (old) => {
          const updated = {
            sessions: old?.sessions || [],
            savedCharts: [newChart, ...(old?.savedCharts || [])],
          }
          saveToStorage(updated)
          return updated
        }
      )
    },
  })

  // Delete chart mutation
  const deleteChartMutation = useMutation({
    mutationFn: async (_: string): Promise<void> => {
      void _; // Required for optimistic update pattern
    },
    onMutate: async (chartId) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.chat.sessions(userId || ''),
      })

      const previousData = queryClient.getQueryData<ChatSessionsResponse>(
        queryKeys.chat.sessions(userId || '')
      )

      queryClient.setQueryData<ChatSessionsResponse>(
        queryKeys.chat.sessions(userId || ''),
        (old) => {
          const updated = {
            sessions: old?.sessions || [],
            savedCharts: (old?.savedCharts || []).filter(c => c.id !== chartId),
          }
          saveToStorage(updated)
          return updated
        }
      )

      return { previousData }
    },
    onError: (_err, _chartId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          queryKeys.chat.sessions(userId || ''),
          context.previousData
        )
      }
    },
  })

  // -------------------------------------------------------------------------
  // Realtime Subscription
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!options?.enableRealtime || !options?.institutionId) {
      return
    }

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Subscribe to chat session changes
    const channel = supabase
      .channel(`chat-sessions-${options.institutionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_sessions',
          filter: `institution_id=eq.${options.institutionId}`,
        },
        () => {
          // Invalidate and refetch on any change
          queryClient.invalidateQueries({
            queryKey: queryKeys.chat.sessions(userId || ''),
          })
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
  }, [options?.enableRealtime, options?.institutionId, queryClient, userId])

  // -------------------------------------------------------------------------
  // Action Helpers
  // -------------------------------------------------------------------------

  const createSession = useCallback(
    (agentType: AgentType, institutionId: string, courseId?: string) => {
      return createSessionMutation.mutateAsync({ agentType, institutionId, courseId })
    },
    [createSessionMutation]
  )

  const addMessage = useCallback(
    (sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
      return addMessageMutation.mutateAsync({ sessionId, message })
    },
    [addMessageMutation]
  )

  const updateMessage = useCallback(
    (sessionId: string, messageId: string, updates: Partial<ChatMessage>) => {
      return updateMessageMutation.mutateAsync({ sessionId, messageId, updates })
    },
    [updateMessageMutation]
  )

  const setSessionStatus = useCallback(
    (sessionId: string, status: ChatSession['status']) => {
      return updateSessionStatusMutation.mutateAsync({ sessionId, status })
    },
    [updateSessionStatusMutation]
  )

  const saveChart = useCallback(
    (sessionId: string, config: ChartConfig, title: string) => {
      return saveChartMutation.mutateAsync({ sessionId, config, title })
    },
    [saveChartMutation]
  )

  const deleteChart = useCallback(
    (chartId: string) => {
      return deleteChartMutation.mutateAsync(chartId)
    },
    [deleteChartMutation]
  )

  const getSession = useCallback(
    (sessionId: string) => {
      return sessions.find(s => s.id === sessionId) || null
    },
    [sessions]
  )

  const getSessionsByInstitution = useCallback(
    (institutionId: string) => {
      return sessions.filter(s => s.institutionId === institutionId)
    },
    [sessions]
  )

  // Clear all data
  const clearAll = useCallback(() => {
    queryClient.setQueryData<ChatSessionsResponse>(
      queryKeys.chat.sessions(userId || ''),
      { sessions: [], savedCharts: [] }
    )
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [queryClient, userId])

  return {
    // Data
    sessions,
    savedCharts,
    isLoading,
    error,

    // Actions
    createSession,
    addMessage,
    updateMessage,
    setSessionStatus,
    saveChart,
    deleteChart,
    getSession,
    getSessionsByInstitution,
    clearAll,
    refetch,

    // Mutation states (for loading indicators)
    isCreatingSession: createSessionMutation.isPending,
    isAddingMessage: addMessageMutation.isPending,
    isSavingChart: saveChartMutation.isPending,
  }
}

/**
 * Hook to access a specific chat session.
 * Provides derived state and actions scoped to a single session.
 */
export function useChatSession(sessionId: string | null) {
  const {
    sessions,
    addMessage,
    updateMessage,
    setSessionStatus,
  } = useChatSessions()

  const session = sessionId
    ? sessions.find(s => s.id === sessionId) || null
    : null

  return {
    session,
    messages: session?.messages || [],
    status: session?.status || 'idle',
    agentType: session?.agentType || null,

    // Scoped actions
    addMessage: useCallback(
      (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
        if (sessionId) {
          return addMessage(sessionId, message)
        }
        return Promise.resolve(null)
      },
      [sessionId, addMessage]
    ),
    updateMessage: useCallback(
      (messageId: string, updates: Partial<ChatMessage>) => {
        if (sessionId) {
          return updateMessage(sessionId, messageId, updates)
        }
        return Promise.resolve()
      },
      [sessionId, updateMessage]
    ),
    setStatus: useCallback(
      (status: ChatSession['status']) => {
        if (sessionId) {
          return setSessionStatus(sessionId, status)
        }
        return Promise.resolve()
      },
      [sessionId, setSessionStatus]
    ),
  }
}
