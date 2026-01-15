import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { createBrowserClient } from '@supabase/ssr'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { AgentType, AgentSession } from '@/components/agents/AgentInstructionModal'

// ============================================================================
// Types
// ============================================================================

interface AgentState {
  // Modal state
  isModalOpen: boolean

  // Session state
  sessions: AgentSession[]
  isLoadingSessions: boolean

  // Current context
  institutionId: string | null

  // Active session tracking
  activeSessionId: string | null

  // Error state
  error: string | null

  // Realtime subscription
  realtimeChannel: RealtimeChannel | null
}

interface AgentActions {
  // Modal control
  openModal: () => void
  closeModal: () => void

  // Session management
  setInstitutionId: (id: string | null) => void
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

  // Reset
  reset: () => void
}

type AgentStore = AgentState & AgentActions

// ============================================================================
// Initial State
// ============================================================================

const initialState: AgentState = {
  isModalOpen: false,
  sessions: [],
  isLoadingSessions: false,
  institutionId: null,
  activeSessionId: null,
  error: null,
  realtimeChannel: null,
}

// ============================================================================
// Store
// ============================================================================

export const useAgentStore = create<AgentStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // Modal control
      openModal: () => set({ isModalOpen: true }),
      closeModal: () => set({ isModalOpen: false }),

      // Session management
      setInstitutionId: (id) => set({ institutionId: id }),

      fetchSessions: async (institutionId: string) => {
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
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, status } : s
          ),
        }))
      },

      updateSessionProgress: (sessionId, processed, total) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, processedItems: processed, totalItems: total }
              : s
          ),
        }))
      },

      // Realtime updates
      addSession: (session) => {
        set((state) => ({
          sessions: [session, ...state.sessions.filter((s) => s.id !== session.id)],
        }))
      },

      removeSession: (sessionId) => {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== sessionId),
        }))
      },

      // Realtime subscription
      subscribeToRealtime: (institutionId: string) => {
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

      // Computed
      getActiveCount: () => {
        return get().sessions.filter((s) => s.status === 'running').length
      },

      getRunningSessions: () => {
        return get().sessions.filter((s) => s.status === 'running')
      },

      // Reset
      reset: () => set(initialState),
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
