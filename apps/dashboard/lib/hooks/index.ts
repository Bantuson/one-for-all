/**
 * React Query hooks for server state management.
 *
 * These hooks provide a modern approach to managing server state with:
 * - Automatic caching and request deduplication
 * - Optimistic updates for instant UI feedback
 * - Background refetching for data freshness
 * - Built-in loading and error states
 *
 * Usage is controlled by the USE_REACT_QUERY_STATE feature flag.
 * When enabled, these hooks manage server state while Zustand stores
 * handle UI-only state (selections, filters, UI toggles).
 *
 * @example
 * ```tsx
 * import { useChatSessions, useAgentSessions } from '@/lib/hooks'
 *
 * function MyComponent() {
 *   const { sessions, createSession, isLoading } = useChatSessions({
 *     institutionId: 'inst-123',
 *   })
 *
 *   const { sessions: agentSessions } = useAgentSessions('inst-123')
 *
 *   // ...
 * }
 * ```
 */

// Chat session hooks
export {
  useChatSessions,
  useChatSession,
  type ChatMessage,
  type ChatSession,
  type ChartConfig,
  type SavedChart,
  type DocumentReviewResult,
  type RankingResult,
  type AnalyticsResult,
} from './useChatSessions'

// Agent session hooks
export {
  useAgentSessions,
  useAgentSession,
} from './useAgentSessions'
