import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { createBrowserClient } from '@supabase/ssr'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { AgentType, AgentSession } from '@/components/agents/AgentInstructionModal'
import { featureFlags } from '@/lib/config/featureFlags'

// ============================================================================
// Types
// ============================================================================

/**
 * UI-only state that remains in Zustand regardless of feature flag.
 * This state is local to the client and doesn't need server synchronization.
 */
interface AgentUIState {
  // Modal state
  isModalOpen: boolean

  // Current context
  institutionId: string | null

  // Active session tracking (UI selection)
  activeSessionId: string | null

  // Selected agent type for new sessions
  selectedAgentType: AgentType | null

  // Filter/sort preferences
  statusFilter: AgentSession['status'] | 'all'
  sortOrder: 'newest' | 'oldest'
}

/**
 * Server state that can be migrated to React Query.
 * When USE_REACT_QUERY_STATE is enabled, this is managed by useAgentSessions hook.
 * When disabled, this remains in Zustand for backward compatibility.
 */
interface AgentServerState {
  // Session data
  sessions: AgentSession[]
  isLoadingSessions: boolean

  // Error state
  error: string | null

  // Realtime subscription (only used when RQ is disabled)
  realtimeChannel: RealtimeChannel | null
}

type AgentState = AgentUIState & AgentServerState

// ============================================================================
// Action Types
// ============================================================================

interface AgentUIActions {
  // Modal control (UI only)
  openModal: () => void
  closeModal: () => void

  // Context (UI only)
  setInstitutionId: (id: string | null) => void

  // Active session selection (UI only)
  setActiveSessionId: (sessionId: string | null) => void

  // Agent type selection (UI only)
  setSelectedAgentType: (agentType: AgentType | null) => void

  // Filter/sort (UI only)
  setStatusFilter: (filter: AgentSession['status'] | 'all') => void
  setSortOrder: (order: 'newest' | 'oldest') => void
}

interface AgentServerActions {
  // Session management
  fetchSessions: (institutionId: string) => Promise<void>
  createSession: (
    institutionId: string,
    agentType: AgentType,
    instructions: string
  ) => Promise<AgentSession | null>
  updateSessionStatus: (sessionId: string, status: AgentSession['status']) => void
  updateSessionProgress: (sessionId: string, processed: number, total: number) => void

  // Realtime updates
  addSession: (session: AgentSession) => void
  removeSession: (sessionId: string) => void

  // Realtime subscription
  subscribeToRealtime: (institutionId: string) => void
  unsubscribeFromRealtime: () => void

  // Computed
  getActiveCount: () => number
  getRunningSessions: () => AgentSession[]
  getFilteredSessions: () => AgentSession[]

  // Reset
  reset: () => void

  // Error handling
  setError: (error: string | null) => void
  clearError: () => void
}

type AgentStore = AgentState & AgentUIActions & AgentServerActions

// ============================================================================
// Initial State
// ============================================================================

const initialUIState: AgentUIState = {
  isModalOpen: false,
  institutionId: null,
  activeSessionId: null,
  selectedAgentType: null,
  statusFilter: 'all',
  sortOrder: 'newest',
}

const initialServerState: AgentServerState = {
  sessions: [],
  isLoadingSessions: false,
  error: null,
  realtimeChannel: null,
}

const initialState: AgentState = {
  ...initialUIState,
  ...initialServerState,
}

// ============================================================================
// Store
// ============================================================================

export const useAgentStore = create<AgentStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // -----------------------------------------------------------------------
      // UI Actions (always managed by Zustand)
      // -----------------------------------------------------------------------

      openModal: () => set({ isModalOpen: true }),

      closeModal: () => set({ isModalOpen: false }),

      setInstitutionId: (id) => set({ institutionId: id }),

      setActiveSessionId: (sessionId) => set({ activeSessionId: sessionId }),

      setSelectedAgentType: (agentType) => set({ selectedAgentType: agentType }),

      setStatusFilter: (filter) => set({ statusFilter: filter }),

      setSortOrder: (order) => set({ sortOrder: order }),

      // -----------------------------------------------------------------------
      // Server State Actions
      // When USE_REACT_QUERY_STATE is true, these are compatibility wrappers.
      // When false, these operate directly on Zustand state.
      // -----------------------------------------------------------------------

      fetchSessions: async (institutionId: string) => {
        // Skip if React Query is managing server state
        if (featureFlags.USE_REACT_QUERY_STATE) {
          return
        }

        set({ isLoadingSessions: true, error: null })

        try {
          const response = await fetch(`/api/institutions/${institutionId}/agent-sessions`)

          if (!response.ok) {
            throw new Error('Failed to fetch agent sessions')
          }

          const data = await response.json()

          // Transform API response to AgentSession format
          const sessions: AgentSession[] = (data.sessions || []).map(
            (s: {
              id: string
              agent_type: string
              status: string
              processed_items: number
              total_items: number
              created_at: string
            }) => ({
              id: s.id,
              agentType: s.agent_type as AgentType,
              status: s.status as AgentSession['status'],
              processedItems: s.processed_items,
              totalItems: s.total_items,
              createdAt: s.created_at,
            })
          )

          set({ sessions, isLoadingSessions: false })
        } catch (error) {
          console.error('Failed to fetch sessions:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch sessions',
            isLoadingSessions: false,
          })
        }
      },

      createSession: async (institutionId, agentType, instructions) => {
        // Skip if React Query is managing server state
        if (featureFlags.USE_REACT_QUERY_STATE) {
          return null
        }

        set({ error: null })

        try {
          const response = await fetch(`/api/institutions/${institutionId}/agent-sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              agent_type: agentType,
              instructions,
            }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to create agent session')
          }

          const data = await response.json()

          const newSession: AgentSession = {
            id: data.session.id,
            agentType: data.session.agent_type as AgentType,
            status: data.session.status as AgentSession['status'],
            processedItems: data.session.processed_items || 0,
            totalItems: data.session.total_items || 0,
            createdAt: data.session.created_at,
          }

          // Add to sessions list
          set((state) => ({
            sessions: [newSession, ...state.sessions],
            activeSessionId: newSession.id,
          }))

          return newSession
        } catch (error) {
          console.error('Failed to create session:', error)
          set({
            error: error instanceof Error ? error.message : 'Failed to create session',
          })
          return null
        }
      },

      updateSessionStatus: (sessionId, status) => {
        // Skip if React Query is managing server state
        if (featureFlags.USE_REACT_QUERY_STATE) {
          return
        }

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, status } : s
          ),
        }))
      },

      updateSessionProgress: (sessionId, processed, total) => {
        // Skip if React Query is managing server state
        if (featureFlags.USE_REACT_QUERY_STATE) {
          return
        }

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, processedItems: processed, totalItems: total }
              : s
          ),
        }))
      },

      // Realtime updates (only used when RQ is disabled)
      addSession: (session) => {
        if (featureFlags.USE_REACT_QUERY_STATE) {
          return
        }

        set((state) => ({
          sessions: [session, ...state.sessions.filter((s) => s.id !== session.id)],
        }))
      },

      removeSession: (sessionId) => {
        if (featureFlags.USE_REACT_QUERY_STATE) {
          return
        }

        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== sessionId),
        }))
      },

      // Realtime subscription (only used when RQ is disabled)
      subscribeToRealtime: (institutionId: string) => {
        // Skip if React Query is managing server state (RQ hook has its own subscription)
        if (featureFlags.USE_REACT_QUERY_STATE) {
          return
        }

        // Unsubscribe from existing channel first
        const existingChannel = get().realtimeChannel
        if (existingChannel) {
          const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          )
          supabase.removeChannel(existingChannel)
        }

        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const channel = supabase
          .channel(`agent-sessions-${institutionId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'agent_sessions',
              filter: `institution_id=eq.${institutionId}`,
            },
            (payload) => {
              const rawSession = payload.new as {
                id: string
                agent_type: string
                status: string
                processed_items?: number
                total_items?: number
                created_at: string
              }

              if (payload.eventType === 'INSERT') {
                const session: AgentSession = {
                  id: rawSession.id,
                  agentType: rawSession.agent_type as AgentType,
                  status: rawSession.status as AgentSession['status'],
                  processedItems: rawSession.processed_items || 0,
                  totalItems: rawSession.total_items || 0,
                  createdAt: rawSession.created_at,
                }
                get().addSession(session)
              } else if (payload.eventType === 'UPDATE') {
                const session: AgentSession = {
                  id: rawSession.id,
                  agentType: rawSession.agent_type as AgentType,
                  status: rawSession.status as AgentSession['status'],
                  processedItems: rawSession.processed_items || 0,
                  totalItems: rawSession.total_items || 0,
                  createdAt: rawSession.created_at,
                }
                get().updateSessionStatus(session.id, session.status)
                if (rawSession.processed_items !== undefined) {
                  get().updateSessionProgress(
                    session.id,
                    rawSession.processed_items,
                    rawSession.total_items || 0
                  )
                }
              } else if (payload.eventType === 'DELETE') {
                const oldSession = payload.old as { id: string }
                get().removeSession(oldSession.id)
              }
            }
          )
          .subscribe()

        set({ realtimeChannel: channel })
      },

      unsubscribeFromRealtime: () => {
        const channel = get().realtimeChannel
        if (channel) {
          const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          )
          supabase.removeChannel(channel)
          set({ realtimeChannel: null })
        }
      },

      // Computed values
      getActiveCount: () => {
        return get().sessions.filter((s) => s.status === 'running').length
      },

      getRunningSessions: () => {
        return get().sessions.filter((s) => s.status === 'running')
      },

      getFilteredSessions: () => {
        const { sessions, statusFilter, sortOrder } = get()

        let filtered = sessions
        if (statusFilter !== 'all') {
          filtered = sessions.filter((s) => s.status === statusFilter)
        }

        // Sort by createdAt
        return [...filtered].sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime()
          const dateB = new Date(b.createdAt).getTime()
          return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
        })
      },

      // Error handling
      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      // Reset
      reset: () => {
        // Clean up realtime subscription before reset
        get().unsubscribeFromRealtime()
        set(initialState)
      },
    }),
    { name: 'agent-store' }
  )
)

// ============================================================================
// Selectors (for performance optimization)
// ============================================================================

export const selectIsModalOpen = (state: AgentStore) => state.isModalOpen

export const selectSessions = (state: AgentStore) => state.sessions

export const selectIsLoadingSessions = (state: AgentStore) => state.isLoadingSessions

export const selectActiveCount = (state: AgentStore) =>
  state.sessions.filter((s) => s.status === 'running').length

export const selectActiveSessionId = (state: AgentStore) => state.activeSessionId

export const selectSelectedAgentType = (state: AgentStore) => state.selectedAgentType

export const selectError = (state: AgentStore) => state.error

export const selectInstitutionId = (state: AgentStore) => state.institutionId

export const selectStatusFilter = (state: AgentStore) => state.statusFilter

export const selectSortOrder = (state: AgentStore) => state.sortOrder

/**
 * Selector for filtered and sorted sessions based on current filter/sort state.
 * Use this for rendering session lists.
 */
export const selectFilteredSessions = (state: AgentStore) => {
  const { sessions, statusFilter, sortOrder } = state

  let filtered = sessions
  if (statusFilter !== 'all') {
    filtered = sessions.filter((s) => s.status === statusFilter)
  }

  return [...filtered].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime()
    const dateB = new Date(b.createdAt).getTime()
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
  })
}
