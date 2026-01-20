'use client'

import { ThemeProvider } from 'next-themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useAuth } from '@clerk/nextjs'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useUnifiedRegistrationStore } from '@/lib/stores/unifiedRegistrationStore'
import { useSetupStore } from '@/lib/stores/setupStore'
import { useChatStore } from '@/lib/stores/chatStore'
import { useAgentStore } from '@/lib/stores/agentStore'
import { featureFlags } from '@/lib/config/featureFlags'

/**
 * Watches for auth state changes and clears stores on logout or user change.
 * This prevents stale data from previous sessions leaking into new sessions.
 */
function AuthStateListener() {
  const { userId, isLoaded } = useAuth()
  const previousUserIdRef = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    if (!isLoaded) return

    // If we haven't initialized yet, just record the current user
    if (previousUserIdRef.current === undefined) {
      previousUserIdRef.current = userId
      return
    }

    // If user has changed (including logout: userId becomes null)
    if (previousUserIdRef.current !== userId) {
      // Clear all stores to prevent data leakage
      useUnifiedRegistrationStore.getState().clearStorage()
      useSetupStore.getState().reset()
      useChatStore.getState().reset()
      useAgentStore.getState().reset()

      // Update the reference
      previousUserIdRef.current = userId
    }
  }, [userId, isLoaded])

  return null
}

/**
 * Create a stable QueryClient instance with optimized defaults.
 *
 * Configuration is driven by feature flags for easy tuning:
 * - staleTime: How long data is considered fresh (no background refetch)
 * - gcTime: How long unused data stays in cache
 *
 * Default behavior:
 * - Stale data is refetched in background on mount
 * - Window focus refetch is disabled (can cause unwanted requests)
 * - Retries are limited to 1 for faster failure feedback
 */
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is considered fresh for this duration
        staleTime: featureFlags.RQ_STALE_TIME,
        // Keep unused data in cache for this duration
        gcTime: featureFlags.RQ_CACHE_TIME,
        // Disable refetch on window focus (reduces unnecessary requests)
        refetchOnWindowFocus: false,
        // Disable refetch on reconnect (app handles this manually if needed)
        refetchOnReconnect: false,
        // Only retry once on failure
        retry: 1,
        // Delay between retries
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        // Retry mutations once on network errors
        retry: 1,
        // Optimistic updates are handled per-mutation
      },
    },
  })
}

export function Providers({ children }: { children: ReactNode }) {
  // Use useState to ensure stable QueryClient across renders
  // This is the recommended pattern from TanStack Query docs
  const [queryClient] = useState(() => createQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <AuthStateListener />
        {children}
      </ThemeProvider>
      {/* Only show devtools in development when React Query state is enabled */}
      {featureFlags.RQ_DEVTOOLS && featureFlags.USE_REACT_QUERY_STATE && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </QueryClientProvider>
  )
}
