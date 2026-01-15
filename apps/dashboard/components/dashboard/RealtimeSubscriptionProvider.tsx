'use client'

import { useEffect } from 'react'
import { useAgentStore } from '@/lib/stores/agentStore'

interface RealtimeSubscriptionProviderProps {
  institutionId: string
  children: React.ReactNode
}

/**
 * Client component that manages Supabase Realtime subscriptions for agent sessions.
 * This wraps the dashboard content and subscribes/unsubscribes when the institution changes.
 */
export function RealtimeSubscriptionProvider({
  institutionId,
  children,
}: RealtimeSubscriptionProviderProps) {
  const subscribeToRealtime = useAgentStore((state) => state.subscribeToRealtime)
  const unsubscribeFromRealtime = useAgentStore((state) => state.unsubscribeFromRealtime)
  const setInstitutionId = useAgentStore((state) => state.setInstitutionId)

  useEffect(() => {
    // Set institution ID in store
    setInstitutionId(institutionId)

    // Subscribe to realtime updates for this institution
    subscribeToRealtime(institutionId)

    // Cleanup on unmount or institution change
    return () => {
      unsubscribeFromRealtime()
    }
  }, [institutionId, subscribeToRealtime, unsubscribeFromRealtime, setInstitutionId])

  return <>{children}</>
}
