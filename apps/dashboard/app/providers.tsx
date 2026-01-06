'use client'

import { ThemeProvider } from 'next-themes'
import { useAuth } from '@clerk/nextjs'
import { useEffect, useRef, type ReactNode } from 'react'
import { useUnifiedRegistrationStore } from '@/lib/stores/unifiedRegistrationStore'
import { useSetupStore } from '@/lib/stores/setupStore'

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

      // Update the reference
      previousUserIdRef.current = userId
    }
  }, [userId, isLoaded])

  return null
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthStateListener />
      {children}
    </ThemeProvider>
  )
}
