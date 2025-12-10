import { auth } from '@clerk/nextjs/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Create a Supabase client for use in Server Components/Actions/Route Handlers with Clerk authentication
 * Automatically passes Clerk session token to Supabase for RLS policy enforcement
 *
 * @example
 * ```tsx
 * import { createClient } from '@/lib/supabase/server'
 *
 * export async function GET() {
 *   const supabase = await createClient()
 *   const { data } = await supabase.from('institutions').select('*')
 *   return Response.json({ data })
 * }
 * ```
 */
export async function createClient() {
  const { getToken } = await auth()

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: async () => {
          const token = await getToken()
          return token ? { Authorization: `Bearer ${token}` } : {}
        },
      },
    }
  )
}

/**
 * Create a Supabase client with service role credentials for admin operations
 * **USE WITH CAUTION**: This bypasses all Row Level Security (RLS) policies
 *
 * Use this client only for:
 * - User creation/sync operations (chicken-egg problem where user doesn't exist yet)
 * - Administrative operations that need to bypass RLS
 * - Background jobs/cron tasks
 * - Server-side operations where user context isn't available
 *
 * @example
 * ```tsx
 * import { createServiceClient } from '@/lib/supabase/server'
 *
 * // Sync user from Clerk webhook
 * const supabase = createServiceClient()
 * await supabase.rpc('sync_clerk_user', { ... })
 * ```
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}
