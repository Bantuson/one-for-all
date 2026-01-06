'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { AlertCircle, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

interface IntegrationCheck {
  name: string
  status: 'checking' | 'success' | 'error' | 'warning'
  message: string
  details?: string
}

/**
 * Development-only component that checks Clerk-Supabase integration status
 * Shows on /dashboard routes to help debug authentication issues
 *
 * Only renders in development mode (NODE_ENV === 'development')
 */
export function IntegrationStatus() {
  const { isLoaded, isSignedIn, user } = useUser()
  const [checks, setChecks] = useState<IntegrationCheck[]>([])
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV !== 'development') return

    async function runChecks() {
      const newChecks: IntegrationCheck[] = []

      // Check 1: Clerk Session
      if (!isLoaded) {
        newChecks.push({
          name: 'Clerk Session',
          status: 'checking',
          message: 'Loading Clerk session...',
        })
      } else if (!isSignedIn) {
        newChecks.push({
          name: 'Clerk Session',
          status: 'error',
          message: 'Not signed in to Clerk',
          details: 'User must be authenticated to test integration',
        })
      } else {
        newChecks.push({
          name: 'Clerk Session',
          status: 'success',
          message: `Signed in as ${user.primaryEmailAddress?.emailAddress}`,
          details: `Clerk ID: ${user.id}`,
        })
      }

      // Check 2: Supabase User Sync
      if (isSignedIn) {
        try {
          const response = await fetch('/api/users/me', {
            credentials: 'include',
          })
          if (response.ok) {
            const data = await response.json()
            newChecks.push({
              name: 'Supabase User Sync',
              status: 'success',
              message: 'User synced to Supabase',
              details: `Database ID: ${data.user?.id}`,
            })
          } else if (response.status === 404) {
            newChecks.push({
              name: 'Supabase User Sync',
              status: 'error',
              message: 'User NOT found in Supabase',
              details: 'User may need to be synced manually or webhook failed',
            })
          } else {
            newChecks.push({
              name: 'Supabase User Sync',
              status: 'warning',
              message: `API returned ${response.status}`,
              details: 'Check server logs for details',
            })
          }
        } catch (error) {
          newChecks.push({
            name: 'Supabase User Sync',
            status: 'error',
            message: 'Failed to check user sync',
            details: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      // Check 3: Institutions API
      if (isSignedIn) {
        try {
          const response = await fetch('/api/institutions', {
            credentials: 'include',
          })
          if (response.ok) {
            const data = await response.json()
            const count = data.institutions?.length || 0
            newChecks.push({
              name: 'Institutions API',
              status: count > 0 ? 'success' : 'warning',
              message: count > 0 ? `Found ${count} institution(s)` : 'No institutions found',
              details: count > 0 ? data.institutions.map((i: any) => i.name).join(', ') : 'User may need to register an institution',
            })
          } else {
            newChecks.push({
              name: 'Institutions API',
              status: 'error',
              message: `API returned ${response.status}`,
              details: 'Clerk-Supabase integration may not be configured',
            })
          }
        } catch (error) {
          newChecks.push({
            name: 'Institutions API',
            status: 'error',
            message: 'Failed to fetch institutions',
            details: error instanceof Error ? error.message : 'Unknown error',
          })
        }
      }

      setChecks(newChecks)
    }

    runChecks()
  }, [isLoaded, isSignedIn, user])

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  const hasErrors = checks.some((c) => c.status === 'error')
  const hasWarnings = checks.some((c) => c.status === 'warning')

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className={`
          px-4 py-2 rounded-lg shadow-lg font-mono text-xs font-medium
          ${hasErrors ? 'bg-red-500 text-white' : hasWarnings ? 'bg-yellow-500 text-white' : 'bg-green-500 text-white'}
        `}
      >
        {hasErrors ? '❌' : hasWarnings ? '⚠️' : '✅'} Integration Status
      </button>

      {/* Status Panel */}
      {isVisible && (
        <div className="absolute bottom-12 right-0 w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 font-mono text-xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-sm">🔍 Integration Checks</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
            {checks.map((check, index) => (
              <div key={index} className="pb-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <div className="flex items-start gap-2">
                  {check.status === 'checking' && <Loader2 className="h-4 w-4 mt-0.5 animate-spin text-blue-500" />}
                  {check.status === 'success' && <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500" />}
                  {check.status === 'warning' && <AlertCircle className="h-4 w-4 mt-0.5 text-yellow-500" />}
                  {check.status === 'error' && <XCircle className="h-4 w-4 mt-0.5 text-red-500" />}

                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{check.name}</div>
                    <div className="text-gray-600 dark:text-gray-400">{check.message}</div>
                    {check.details && (
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 bg-gray-50 dark:bg-gray-800 p-1 rounded">
                        {check.details}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {hasErrors && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="text-red-500 font-medium mb-1">⚠️ Action Required</div>
              <div className="text-gray-600 dark:text-gray-400 text-xs">
                See <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">CLERK_SUPABASE_INTEGRATION_TODO.md</code> for setup instructions.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
