import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Page routes that require authentication (redirects to /register)
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/applications(.*)',
  '/settings(.*)',
  '/onboarding(.*)',
])

// Routes that are explicitly public (invitation acceptance, etc.)
const isPublicRoute = createRouteMatcher([
  '/register/invite/(.*)',
  '/api/invitations/validate',
])

export default clerkMiddleware(async (auth, req) => {
  // Allow public routes without authentication
  if (isPublicRoute(req)) {
    return
  }

  // Only protect page routes - these will redirect to sign-in
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
  // API routes handle their own auth in handlers with await auth()
  // They return proper 401 JSON responses
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
