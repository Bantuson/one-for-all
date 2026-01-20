import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { AgentType } from '@/components/agents/AgentInstructionModal'
import { featureFlags } from '@/lib/config/featureFlags'

// ============================================================================
// Types
// ============================================================================

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  // Progress updates for long-running tasks
  progressUpdate?: {
    processed: number
    total: number
    currentItem?: string
  }
  // Agent-specific result data
  resultCard?: DocumentReviewResult | RankingResult | AnalyticsResult
  // Recharts config for analytics agent
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

// Agent taglines displayed when agent starts
export const AGENT_TAGLINES: Partial<Record<AgentType, string>> = {
  reviewer_assistant: "Review Assistant at your service. I can answer policy questions, check eligibility, and manage course rankings. What would you like help with?",
  analytics: "Analytics Agent at your service. What insights would you like me to generate?",
  notification_sender: "Notification Sender at your service. I can send bulk notifications to applicants.",
}

// ============================================================================
// State Types
// ============================================================================

/**
 * UI-only state that remains in Zustand regardless of feature flag.
 * This state is local to the client and doesn't need server synchronization.
 */
interface ChatUIState {
  // Active session tracking (UI selection)
  activeSessionId: string | null

  // Sidebar state
  isSidebarCollapsed: boolean

  // Current context for creating new sessions
  institutionId: string | null
  courseId: string | null

  // Transient loading state
  isLoading: boolean

  // Expanded message IDs (for collapsible content)
  expandedMessageIds: Set<string>

  // Input draft state (to preserve typing across re-renders)
  inputDraft: string
}

/**
 * Server state that can be migrated to React Query.
 * When USE_REACT_QUERY_STATE is enabled, this is managed by useChatSessions hook.
 * When disabled, this remains in Zustand for backward compatibility.
 */
interface ChatServerState {
  // Sessions data
  sessions: ChatSession[]

  // Saved charts (from analytics)
  savedCharts: SavedChart[]
}

type ChatState = ChatUIState & ChatServerState

// ============================================================================
// Action Types
// ============================================================================

interface ChatUIActions {
  // Active session selection (UI only)
  setActiveSession: (sessionId: string | null) => void

  // Sidebar toggle (UI only)
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void

  // Context (UI only)
  setContext: (institutionId: string | null, courseId?: string | null) => void

  // Loading state (UI only)
  setLoading: (loading: boolean) => void

  // Message expansion (UI only)
  toggleMessageExpanded: (messageId: string) => void
  isMessageExpanded: (messageId: string) => boolean

  // Input draft (UI only)
  setInputDraft: (draft: string) => void
}

interface ChatServerActions {
  // Session management
  createSession: (agentType: AgentType, institutionId: string, courseId?: string) => ChatSession
  loadSessionHistory: (sessionId: string) => void

  // Message management
  addMessage: (sessionId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => void
  updateMessage: (sessionId: string, messageId: string, updates: Partial<ChatMessage>) => void

  // Agent switching
  switchAgent: (newAgentType: AgentType) => { requiresConfirmation: boolean; currentAgentType?: AgentType }
  confirmAgentSwitch: (newAgentType: AgentType) => ChatSession

  // Chart management
  saveChart: (sessionId: string, config: ChartConfig, title: string) => void
  deleteChart: (chartId: string) => void

  // Session status
  setSessionStatus: (sessionId: string, status: ChatSession['status']) => void

  // Utilities
  getActiveSession: () => ChatSession | null
  getSessionsByInstitution: (institutionId: string) => ChatSession[]

  // Reset
  reset: () => void
}

type ChatStore = ChatState & ChatUIActions & ChatServerActions

// ============================================================================
// Initial State
// ============================================================================

const initialUIState: ChatUIState = {
  activeSessionId: null,
  isSidebarCollapsed: true,
  institutionId: null,
  courseId: null,
  isLoading: false,
  expandedMessageIds: new Set(),
  inputDraft: '',
}

const initialServerState: ChatServerState = {
  sessions: [],
  savedCharts: [],
}

const initialState: ChatState = {
  ...initialUIState,
  ...initialServerState,
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

function serializeMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map(msg => ({
    ...msg,
    timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
  }))
}

// ============================================================================
// Store
// ============================================================================

export const useChatStore = create<ChatStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ---------------------------------------------------------------------
        // UI Actions (always managed by Zustand)
        // ---------------------------------------------------------------------

        setActiveSession: (sessionId) => {
          set({ activeSessionId: sessionId })
        },

        toggleSidebar: () => {
          set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed }))
        },

        setSidebarCollapsed: (collapsed) => {
          set({ isSidebarCollapsed: collapsed })
        },

        setContext: (institutionId, courseId) => {
          set({ institutionId, courseId: courseId || null })
        },

        setLoading: (loading) => {
          set({ isLoading: loading })
        },

        toggleMessageExpanded: (messageId) => {
          set((state) => {
            const expanded = new Set(state.expandedMessageIds)
            if (expanded.has(messageId)) {
              expanded.delete(messageId)
            } else {
              expanded.add(messageId)
            }
            return { expandedMessageIds: expanded }
          })
        },

        isMessageExpanded: (messageId) => {
          return get().expandedMessageIds.has(messageId)
        },

        setInputDraft: (draft) => {
          set({ inputDraft: draft })
        },

        // ---------------------------------------------------------------------
        // Server State Actions
        // When USE_REACT_QUERY_STATE is true, these are compatibility wrappers.
        // When false, these operate directly on Zustand state.
        // ---------------------------------------------------------------------

        createSession: (agentType, institutionId, courseId) => {
          // Always create locally for immediate UI response
          const newSession: ChatSession = {
            id: generateId(),
            agentType,
            institutionId,
            courseId,
            messages: [],
            status: 'idle',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }

          // If React Query is managing server state, we only update activeSessionId
          // The actual session will be managed by useChatSessions hook
          if (featureFlags.USE_REACT_QUERY_STATE) {
            set({ activeSessionId: newSession.id })
          } else {
            set((state) => ({
              sessions: [newSession, ...state.sessions],
              activeSessionId: newSession.id,
            }))
          }

          return newSession
        },

        loadSessionHistory: (sessionId) => {
          const session = get().sessions.find(s => s.id === sessionId)
          if (session) {
            set({ activeSessionId: sessionId })
          }
        },

        addMessage: (sessionId, message) => {
          // Skip if React Query is managing server state
          if (featureFlags.USE_REACT_QUERY_STATE) {
            return
          }

          const newMessage: ChatMessage = {
            ...message,
            id: generateId(),
            timestamp: new Date(),
          }

          set((state) => ({
            sessions: state.sessions.map(session =>
              session.id === sessionId
                ? {
                    ...session,
                    messages: [...session.messages, newMessage],
                    updatedAt: new Date().toISOString(),
                  }
                : session
            ),
          }))
        },

        updateMessage: (sessionId, messageId, updates) => {
          // Skip if React Query is managing server state
          if (featureFlags.USE_REACT_QUERY_STATE) {
            return
          }

          set((state) => ({
            sessions: state.sessions.map(session =>
              session.id === sessionId
                ? {
                    ...session,
                    messages: session.messages.map(msg =>
                      msg.id === messageId ? { ...msg, ...updates } : msg
                    ),
                    updatedAt: new Date().toISOString(),
                  }
                : session
            ),
          }))
        },

        switchAgent: (newAgentType) => {
          const activeSession = get().getActiveSession()

          // If no active session or session is idle, no confirmation needed
          if (!activeSession || activeSession.status === 'idle' || activeSession.status === 'completed') {
            return { requiresConfirmation: false }
          }

          // If switching to same agent, no confirmation needed
          if (activeSession.agentType === newAgentType) {
            return { requiresConfirmation: false }
          }

          // Active session with different agent requires confirmation
          return {
            requiresConfirmation: true,
            currentAgentType: activeSession.agentType,
          }
        },

        confirmAgentSwitch: (newAgentType) => {
          const activeSession = get().getActiveSession()

          // Mark current session as completed if it exists
          if (activeSession && activeSession.status === 'active') {
            if (!featureFlags.USE_REACT_QUERY_STATE) {
              set((state) => ({
                sessions: state.sessions.map(session =>
                  session.id === activeSession.id
                    ? { ...session, status: 'completed' as const, updatedAt: new Date().toISOString() }
                    : session
                ),
              }))
            }
          }

          // Create new session with the new agent type
          const { institutionId, courseId } = get()
          return get().createSession(newAgentType, institutionId!, courseId || undefined)
        },

        saveChart: (sessionId, config, title) => {
          // Skip if React Query is managing server state
          if (featureFlags.USE_REACT_QUERY_STATE) {
            return
          }

          const newChart: SavedChart = {
            id: generateId(),
            sessionId,
            config,
            title,
            createdAt: new Date().toISOString(),
          }

          set((state) => ({
            savedCharts: [newChart, ...state.savedCharts],
          }))
        },

        deleteChart: (chartId) => {
          // Skip if React Query is managing server state
          if (featureFlags.USE_REACT_QUERY_STATE) {
            return
          }

          set((state) => ({
            savedCharts: state.savedCharts.filter(chart => chart.id !== chartId),
          }))
        },

        setSessionStatus: (sessionId, status) => {
          // Skip if React Query is managing server state
          if (featureFlags.USE_REACT_QUERY_STATE) {
            return
          }

          set((state) => ({
            sessions: state.sessions.map(session =>
              session.id === sessionId
                ? { ...session, status, updatedAt: new Date().toISOString() }
                : session
            ),
          }))
        },

        getActiveSession: () => {
          const { sessions, activeSessionId } = get()
          return sessions.find(s => s.id === activeSessionId) || null
        },

        getSessionsByInstitution: (institutionId) => {
          return get().sessions.filter(s => s.institutionId === institutionId)
        },

        reset: () => set(initialState),
      }),
      {
        name: 'chat-store',
        // Custom serialization to handle Date objects and Sets
        partialize: (state) => ({
          // Only persist server state when React Query is not managing it
          ...(featureFlags.USE_REACT_QUERY_STATE
            ? {}
            : {
                sessions: state.sessions.map(session => ({
                  ...session,
                  messages: session.messages.map(msg => ({
                    ...msg,
                    timestamp: msg.timestamp instanceof Date
                      ? msg.timestamp.toISOString()
                      : msg.timestamp,
                  })),
                })),
                savedCharts: state.savedCharts,
              }),
          // Always persist UI state
          isSidebarCollapsed: state.isSidebarCollapsed,
          activeSessionId: state.activeSessionId,
        }),
        // Rehydrate Date objects on load
        onRehydrateStorage: () => (state) => {
          if (state && state.sessions) {
            state.sessions = state.sessions.map(session => ({
              ...session,
              messages: serializeMessages(session.messages),
            }))
          }
          // Reinitialize Sets (not serialized)
          if (state) {
            state.expandedMessageIds = new Set()
          }
        },
      }
    ),
    { name: 'chat-store' }
  )
)

// ============================================================================
// Selectors (for performance optimization)
// ============================================================================

export const selectActiveSession = (state: ChatStore) =>
  state.sessions.find(s => s.id === state.activeSessionId) || null

export const selectSessions = (state: ChatStore) => state.sessions

export const selectSavedCharts = (state: ChatStore) => state.savedCharts

export const selectIsSidebarCollapsed = (state: ChatStore) => state.isSidebarCollapsed

export const selectIsLoading = (state: ChatStore) => state.isLoading

export const selectActiveSessionId = (state: ChatStore) => state.activeSessionId

export const selectContext = (state: ChatStore) => ({
  institutionId: state.institutionId,
  courseId: state.courseId,
})

export const selectInputDraft = (state: ChatStore) => state.inputDraft
