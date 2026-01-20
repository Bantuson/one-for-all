/**
 * Feature flags for gradual rollout of React Query state management.
 *
 * This allows us to migrate from Zustand server state to React Query
 * incrementally, with the ability to roll back if issues arise.
 *
 * Environment Variables:
 * - NEXT_PUBLIC_USE_RQ_STATE: Enable React Query for server state (default: false)
 * - NEXT_PUBLIC_RQ_STALE_TIME: Time in ms before data is considered stale (default: 30000)
 * - NEXT_PUBLIC_RQ_CACHE_TIME: Time in ms to keep unused data in cache (default: 300000)
 */

export const featureFlags = {
  /**
   * When enabled, components will read server state from React Query hooks
   * instead of Zustand stores. Zustand stores will continue to manage UI-only state.
   */
  USE_REACT_QUERY_STATE: process.env.NEXT_PUBLIC_USE_RQ_STATE === 'true',

  /**
   * Time in milliseconds before cached data is considered stale.
   * Stale data will be refetched in the background on the next access.
   * Default: 30 seconds
   */
  RQ_STALE_TIME: parseInt(process.env.NEXT_PUBLIC_RQ_STALE_TIME || '30000', 10),

  /**
   * Time in milliseconds to keep unused data in cache before garbage collection.
   * Default: 5 minutes
   */
  RQ_CACHE_TIME: parseInt(process.env.NEXT_PUBLIC_RQ_CACHE_TIME || '300000', 10),

  /**
   * Enable React Query devtools in development mode.
   * Only applies when USE_REACT_QUERY_STATE is also enabled.
   */
  RQ_DEVTOOLS: process.env.NODE_ENV === 'development',
} as const

/**
 * Type-safe feature flag keys for use in conditional logic.
 */
export type FeatureFlagKey = keyof typeof featureFlags

/**
 * Check if a feature flag is enabled.
 * Provides a type-safe way to check boolean flags.
 */
export function isFeatureEnabled(flag: 'USE_REACT_QUERY_STATE' | 'RQ_DEVTOOLS'): boolean {
  return featureFlags[flag]
}

/**
 * Query keys factory for React Query.
 * Centralizes all query keys for consistent cache management.
 *
 * Pattern: ['domain', 'entity', ...identifiers]
 */
export const queryKeys = {
  // Chat domain
  chat: {
    all: ['chat'] as const,
    sessions: (userId: string) => ['chat', 'sessions', userId] as const,
    session: (sessionId: string) => ['chat', 'session', sessionId] as const,
    messages: (sessionId: string) => ['chat', 'messages', sessionId] as const,
    charts: (userId: string) => ['chat', 'charts', userId] as const,
  },

  // Agent domain
  agent: {
    all: ['agent'] as const,
    sessions: (userId: string, institutionId?: string) =>
      institutionId
        ? (['agent', 'sessions', userId, institutionId] as const)
        : (['agent', 'sessions', userId] as const),
    session: (sessionId: string) => ['agent', 'session', sessionId] as const,
  },

  // Analytics domain (for future use)
  analytics: {
    all: ['analytics'] as const,
    dashboard: (institutionId: string) => ['analytics', 'dashboard', institutionId] as const,
    charts: (institutionId: string) => ['analytics', 'charts', institutionId] as const,
  },
} as const
