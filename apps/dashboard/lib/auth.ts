import { cache } from 'react'
import { currentUser, auth } from '@clerk/nextjs/server'

/**
 * Cached Clerk user lookup to prevent API rate limits.
 * Use this instead of calling currentUser() directly in Server Components.
 *
 * React's cache() ensures this is deduplicated within a single request,
 * preventing multiple Clerk API calls per render.
 */
export const getCachedUser = cache(async () => {
  return currentUser()
})

/**
 * Cached Clerk auth lookup.
 * Use this instead of calling auth() directly in Server Components.
 */
export const getCachedAuth = cache(async () => {
  return auth()
})
