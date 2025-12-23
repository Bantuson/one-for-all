import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Create a Supabase client for use in Client Components with Clerk authentication
 * This must be called within a component that has access to Clerk's session
 *
 * @example
 * ```tsx
 * 'use client'
 * import { useSession } from '@clerk/nextjs'
 * import { createClient } from '@/lib/supabase/client'
 *
 * export function MyComponent() {
 *   const { session } = useSession()
 *   const supabase = createClient(session)
 *   // ... use supabase client
 * }
 * ```
 */
export function createClient(session: any) {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: async (url, options = {}) => {
          const token = await session?.getToken()
          const headers = new Headers(options.headers)
          if (token) {
            headers.set('Authorization', `Bearer ${token}`)
          }
          return fetch(url, { ...options, headers })
        },
      },
    }
  )
}
