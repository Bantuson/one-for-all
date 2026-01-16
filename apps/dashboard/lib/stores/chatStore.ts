import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { AgentType } from '@/components/agents/AgentInstructionModal'

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
export const AGENT_TAGLINES: Record<AgentType, string> = {
  document_reviewer: "Document Reviewer at your service. I'll review all documents for applicants in this course.",
  aps_ranking: "APS Ranking Agent at your service. What is the course intake limit?",
  reviewer_assistant: "Review Assistant at your service. Ask me anything about applications, eligibility, or policies.",
  analytics: "Analytics Agent at your service. What insights would you like me to generate?",
  notification_sender: "Notification Sender at your service. I can send bulk notifications to applicants.",
}

interface ChatState {
  // Sessions
  sessions: ChatSession[]
  activeSessionId: string | null

  // Saved charts (from analytics)
  savedCharts: SavedChart[]

  // UI state
  isSidebarCollapsed: boolean
  isLoading: boolean

  // Current context
  institutionId: string | null
  courseId: string | null
}

interface ChatActions {
  // Session management
  createSession: (agentType: AgentType, institutionId: string, courseId?: string) => ChatSession
  setActiveSession: (sessionId: string | null) => void
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

  // UI actions
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void

  // Context
  setContext: (institutionId: string | null, courseId?: string | null) => void

  // Session status
  setSessionStatus: (sessionId: string, status: ChatSession['status']) => void

  // Utilities
  getActiveSession: () => ChatSession | null
  getSessionsByInstitution: (institutionId: string) => ChatSession[]

  // Reset
  reset: () => void
}

type ChatStore = ChatState & ChatActions

// ============================================================================
// Initial State
// ============================================================================

const initialState: ChatState = {
  sessions: [],
  activeSessionId: null,
  savedCharts: [],
  isSidebarCollapsed: false,
  isLoading: false,
  institutionId: null,
  courseId: null,
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

        // Session management
        createSession: (agentType, institutionId, courseId) => {
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

          set((state) => ({
            sessions: [newSession, ...state.sessions],
            activeSessionId: newSession.id,
          }))

          return newSession
        },

        setActiveSession: (sessionId) => {
          set({ activeSessionId: sessionId })
        },

        loadSessionHistory: (sessionId) => {
          const session = get().sessions.find(s => s.id === sessionId)
          if (session) {
            set({ activeSessionId: sessionId })
          }
        },

        // Message management
        addMessage: (sessionId, message) => {
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

        // Agent switching
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
            set((state) => ({
              sessions: state.sessions.map(session =>
                session.id === activeSession.id
                  ? { ...session, status: 'completed' as const, updatedAt: new Date().toISOString() }
                  : session
              ),
            }))
          }

          // Create new session with the new agent type
          const { institutionId, courseId } = get()
          return get().createSession(newAgentType, institutionId!, courseId || undefined)
        },

        // Chart management
        saveChart: (sessionId, config, title) => {
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
          set((state) => ({
            savedCharts: state.savedCharts.filter(chart => chart.id !== chartId),
          }))
        },

        // UI actions
        toggleSidebar: () => {
          set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed }))
        },

        setSidebarCollapsed: (collapsed) => {
          set({ isSidebarCollapsed: collapsed })
        },

        // Context
        setContext: (institutionId, courseId) => {
          set({ institutionId, courseId: courseId || null })
        },

        // Session status
        setSessionStatus: (sessionId, status) => {
          set((state) => ({
            sessions: state.sessions.map(session =>
              session.id === sessionId
                ? { ...session, status, updatedAt: new Date().toISOString() }
                : session
            ),
          }))
        },

        // Utilities
        getActiveSession: () => {
          const { sessions, activeSessionId } = get()
          return sessions.find(s => s.id === activeSessionId) || null
        },

        getSessionsByInstitution: (institutionId) => {
          return get().sessions.filter(s => s.institutionId === institutionId)
        },

        // Reset
        reset: () => set(initialState),
      }),
      {
        name: 'chat-store',
        // Custom serialization to handle Date objects
        partialize: (state) => ({
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
          isSidebarCollapsed: state.isSidebarCollapsed,
        }),
        // Rehydrate Date objects on load
        onRehydrateStorage: () => (state) => {
          if (state) {
            state.sessions = state.sessions.map(session => ({
              ...session,
              messages: serializeMessages(session.messages),
            }))
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
