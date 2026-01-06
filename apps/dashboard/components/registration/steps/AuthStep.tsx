'use client'

import { useSignUp, useSignIn, useUser, useAuth } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUnifiedRegistrationStore } from '@/lib/stores/unifiedRegistrationStore'
import { CommandButton } from '@/components/ui/CommandButton'
import type { OAuthStrategy } from '@clerk/types'

type AuthMode = 'signup' | 'signin'
type AuthState = 'initial' | 'verifying' | 'complete'

export function AuthStep() {
  // Clerk hooks
  const { isLoaded: isUserLoaded, isSignedIn, user } = useUser()
  const { getToken } = useAuth()
  const { isLoaded: isSignUpLoaded, signUp, setActive: setActiveSignUp } = useSignUp()
  const { isLoaded: isSignInLoaded, signIn, setActive: setActiveSignIn } = useSignIn()

  // Local state
  const [authMode, setAuthMode] = useState<AuthMode>('signup')
  const [authState, setAuthState] = useState<AuthState>('initial')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasAutoVerified, setHasAutoVerified] = useState(false)
  const [checkingInstitutions, setCheckingInstitutions] = useState(false)
  const [isAutoProceeding, setIsAutoProceeding] = useState(false)

  // Store actions
  const { nextStep, setClerkUserId } = useUnifiedRegistrationStore()
  const router = useRouter()

  const isLoaded = isUserLoaded && isSignUpLoaded && isSignInLoaded

  // Check if user already has institutions when signed in
  useEffect(() => {
    async function checkExistingInstitutions() {
      if (isSignedIn && !checkingInstitutions) {
        setCheckingInstitutions(true)
        try {
          const response = await fetch('/api/institutions', {
            credentials: 'include',
          })
          const data = await response.json()

          if (data.institutions && data.institutions.length > 0) {
            router.push(`/dashboard/${data.institutions[0].slug}`)
          }
        } catch (error) {
          console.error('Error checking institutions:', error)
        } finally {
          setCheckingInstitutions(false)
        }
      }
    }

    checkExistingInstitutions()
  }, [isSignedIn, router, checkingInstitutions])

  // Handle OAuth sign-up/sign-in (Google, GitHub, etc.)
  const handleOAuthSignUp = async (strategy: OAuthStrategy) => {
    if (!signUp) return
    setError(null)
    setIsLoading(true)

    try {
      await signUp.authenticateWithRedirect({
        strategy: strategy as any,
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/register?oauth=complete',
      })
    } catch (err) {
      console.error('[AuthStep] OAuth error:', err)
      setError('Failed to start OAuth flow. Please try again.')
      setIsLoading(false)
    }
  }

  const handleOAuthSignIn = async (strategy: OAuthStrategy) => {
    if (!signIn) return
    setError(null)
    setIsLoading(true)

    try {
      await signIn.authenticateWithRedirect({
        strategy: strategy as any,
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/register?oauth=complete',
      })
    } catch (err) {
      console.error('[AuthStep] OAuth sign-in error:', err)
      setError('Failed to start OAuth flow. Please try again.')
      setIsLoading(false)
    }
  }

  // Handle email/password sign-up
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signUp || !isLoaded) return

    setError(null)
    setIsLoading(true)

    try {
      // Create the sign-up
      await signUp.create({
        firstName,
        lastName,
        username: username || undefined,
        emailAddress: email,
        password,
      })

      // Send email verification code
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })

      // Move to verification state
      setAuthState('verifying')
    } catch (err: unknown) {
      console.error('[AuthStep] Sign-up error:', err)
      const clerkError = err as { errors?: Array<{ message: string }> }
      setError(clerkError.errors?.[0]?.message || 'Sign-up failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle email/password sign-in
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signIn || !isLoaded) return

    setError(null)
    setIsLoading(true)

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      })

      if (result.status === 'complete') {
        // CRITICAL: Activate the session
        await setActiveSignIn({ session: result.createdSessionId })
        console.log('[AuthStep] Sign-in complete, session activated')

        // Wait for user data to be available
        await new Promise(resolve => setTimeout(resolve, 500))
      } else if (result.status === 'needs_first_factor') {
        setError('Additional verification required. Please check your email.')
      } else if (result.status === 'needs_second_factor') {
        setError('Two-factor authentication required.')
      }
    } catch (err: unknown) {
      console.error('[AuthStep] Sign-in error:', err)
      const clerkError = err as { errors?: Array<{ message: string }> }
      setError(clerkError.errors?.[0]?.message || 'Sign-in failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle email verification code submission
  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signUp || !isLoaded) return

    setError(null)
    setIsLoading(true)

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      })

      console.log('[AuthStep] Verification result:', result.status)
      // signUp.emailAddress is an EmailAddressResource object, not a string
      const emailAddr = signUp.emailAddress as { verification?: { status?: string } } | undefined
      console.log('[AuthStep] Email verification status:', emailAddr?.verification?.status)

      // Check both overall status AND email verification status
      // Email may be verified even if overall status isn't 'complete' (timing issue)
      const emailVerified = emailAddr?.verification?.status === 'verified'
                         || result.status === 'complete'

      if (emailVerified) {
        // Activate session if available
        if (result.createdSessionId) {
          await setActiveSignUp({ session: result.createdSessionId })
          console.log('[AuthStep] Session activated successfully')
        }

        // Set user ID - try result first, fall back to signUp object
        const userId = result.createdUserId || signUp.createdUserId
        if (userId) {
          setClerkUserId(userId)
          console.log('[AuthStep] User ID set:', userId)
        }

        setAuthState('complete')

        // Small delay to ensure session is fully propagated
        await new Promise(resolve => setTimeout(resolve, 500))

        // Proceed to next step
        nextStep()
      } else if (result.status === 'missing_requirements') {
        // Check what's actually missing
        const missingFields = signUp.missingFields || []
        if (missingFields.length > 0) {
          setError(`Please complete: ${missingFields.join(', ')}`)
        } else {
          // No explicit missing fields - likely a timing issue, retry
          setError('Verification processing. Please wait and try again.')
        }
      } else {
        setError(`Verification status: ${result.status}. Please try again.`)
      }
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string; code?: string }> }
      const errorCode = clerkError.errors?.[0]?.code
      const errorMessage = clerkError.errors?.[0]?.message || ''

      // Handle "already verified" error
      if (errorCode === 'verification_already_verified'
          || errorMessage.includes('already been verified')) {
        console.log('[AuthStep] Email already verified, attempting to proceed...')

        try {
          // Reload signUp to get fresh state
          await signUp.reload()
          const reloadedEmailAddr = signUp.emailAddress as { verification?: { status?: string } } | undefined

          if (reloadedEmailAddr?.verification?.status === 'verified') {
            // Email is verified, try to complete sign-up
            if (signUp.status === 'complete' && signUp.createdSessionId) {
              await setActiveSignUp({ session: signUp.createdSessionId })
              if (signUp.createdUserId) {
                setClerkUserId(signUp.createdUserId)
              }
              setAuthState('complete')
              await new Promise(resolve => setTimeout(resolve, 500))
              nextStep()
              return
            } else {
              // Email verified but sign-up not complete - show success state
              // The user can proceed via the "already signed in" UI path
              setError('Email verified! Please refresh or sign in to continue.')
            }
          }
        } catch (reloadErr) {
          console.error('[AuthStep] Error reloading sign-up:', reloadErr)
        }
      }

      console.error('[AuthStep] Verification error:', err)
      if (!error) { // Only set if not already set above
        setError(clerkError.errors?.[0]?.message || 'Verification failed. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-verify when 6 digits are entered
  useEffect(() => {
    if (authState === 'verifying' && verificationCode.length === 6 && !isLoading && !hasAutoVerified) {
      setHasAutoVerified(true)
      const syntheticEvent = { preventDefault: () => {} } as React.FormEvent
      handleVerifyEmail(syntheticEvent)
    }
    // Reset flag if code changes (user correcting input)
    if (verificationCode.length < 6) {
      setHasAutoVerified(false)
    }
  }, [verificationCode, authState, isLoading, hasAutoVerified])

  // Handle resend verification code
  const handleResendCode = async () => {
    if (!signUp) return

    setError(null)
    setIsLoading(true)

    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setError(null)
    } catch (err: unknown) {
      const clerkError = err as { errors?: Array<{ message: string; code?: string }> }
      const errorMessage = clerkError.errors?.[0]?.message || ''

      // If already verified, help the user proceed instead of showing error
      if (errorMessage.includes('already been verified')) {
        console.log('[AuthStep] Email already verified on resend attempt')

        try {
          await signUp.reload()
          const resendEmailAddr = signUp.emailAddress as { verification?: { status?: string } } | undefined

          if (resendEmailAddr?.verification?.status === 'verified') {
            if (signUp.status === 'complete' && signUp.createdSessionId) {
              await setActiveSignUp({ session: signUp.createdSessionId })
              if (signUp.createdUserId) {
                setClerkUserId(signUp.createdUserId)
              }
              setAuthState('complete')
              await new Promise(resolve => setTimeout(resolve, 500))
              nextStep()
              return
            } else {
              setError('Email already verified! Click verify to continue.')
            }
          }
        } catch (reloadErr) {
          console.error('[AuthStep] Error reloading sign-up on resend:', reloadErr)
        }
      } else {
        console.error('[AuthStep] Resend code error:', err)
        setError(clerkError.errors?.[0]?.message || 'Failed to resend code.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Handle continue for already signed-in users
  const handleContinue = async () => {
    if (!user?.id) return

    try {
      // Force token refresh to ensure session is propagated
      const token = await getToken({ skipCache: true })

      if (!token) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        await getToken({ skipCache: true })
      }
    } catch (error) {
      console.error('[AuthStep] Session validation error:', error)
    } finally {
      setClerkUserId(user.id)
      nextStep()
    }
  }

  // Auto-proceed for already signed-in users (after brief UI display)
  useEffect(() => {
    if (isSignedIn && user?.id && isLoaded) {
      // Show visual indicator that we're about to proceed
      setIsAutoProceeding(true)
      const timer = setTimeout(() => {
        handleContinue()
      }, 1500)
      return () => {
        clearTimeout(timer)
        setIsAutoProceeding(false)
      }
    }
    return undefined
  }, [isSignedIn, user?.id, isLoaded])

  // Loading state
  if (!isLoaded) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4" />
          <p className="text-sm text-foreground/60">Loading...</p>
        </div>
      </div>
    )
  }

  // User is already signed in
  if (isSignedIn && user) {
    return (
      <div className="space-y-6 py-8">
        <div className="text-center font-mono">
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-traffic-green/10 border border-traffic-green/30">
              <span className="h-2 w-2 rounded-full bg-traffic-green animate-pulse" />
              <span className="text-traffic-green text-sm">authenticated</span>
            </div>
          </div>
          <h3 className="text-lg mb-2">
            <span className="text-syntax-export">export</span>
            <span className="text-syntax-key ml-2">session.active</span>
          </h3>
          <p className="text-sm text-muted-foreground mb-1">
            <span className="text-traffic-green">//</span> Welcome back, {user.firstName || user.emailAddresses[0]?.emailAddress}
          </p>
          {isAutoProceeding ? (
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-traffic-green" />
              <p className="text-sm text-traffic-green">
                Redirecting to dashboard...
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              <span className="text-traffic-green">//</span> Click continue to proceed
            </p>
          )}
        </div>
      </div>
    )
  }

  // Email verification state
  if (authState === 'verifying') {
    return (
      <div className="w-full py-8 max-w-md mx-auto">
        <div className="text-center font-mono mb-6">
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-amber-700/10 border border-amber-700/30">
              <span className="h-2 w-2 rounded-full bg-amber-600 animate-pulse" />
              <span className="text-amber-600 text-sm">verification pending</span>
            </div>
          </div>
          <h3 className="text-lg mb-2">
            <span className="text-syntax-export">await</span>
            <span className="text-syntax-key ml-2">email.verify()</span>
          </h3>
          <p className="text-sm text-muted-foreground">
            <span className="text-traffic-green">//</span> Check {email} for verification code
          </p>
        </div>

        <form onSubmit={handleVerifyEmail} className="space-y-4">
          <div>
            <label className="block text-sm font-mono text-foreground mb-2">
              Verification Code
            </label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Enter 6-digit code"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground font-mono placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 text-center tracking-widest text-lg"
              maxLength={6}
              autoFocus
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm font-mono text-center">
              <span className="text-red-400">//</span> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || verificationCode.length < 6}
            className="w-full px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-mono rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Verifying...' : 'verify --code'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={isLoading}
              className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="text-traffic-green">//</span> Didn&apos;t receive code?{' '}
              <span className="text-syntax-key">Resend</span>
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setAuthState('initial')
                setVerificationCode('')
                setError(null)
              }}
              className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="text-traffic-green">//</span> Use different email?{' '}
              <span className="text-syntax-key">Go back</span>
            </button>
          </div>
        </form>
      </div>
    )
  }

  // Initial auth form (sign-up or sign-in)
  return (
    <div className="w-full py-8 max-w-md mx-auto">
      {/* Terminal Style Header */}
      <div className="text-center font-mono mb-6">
        <div className="flex justify-center mb-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary/10 border border-primary/30">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-primary text-sm">ready</span>
          </div>
        </div>
        <h3 className="text-lg mb-2">
          <span className="text-syntax-export">{authMode === 'signup' ? 'new' : 'await'}</span>
          <span className="text-syntax-key ml-2">user.{authMode === 'signup' ? 'create()' : 'authenticate()'}</span>
        </h3>
        <p className="text-sm text-muted-foreground">
          <span className="text-traffic-green">//</span> {authMode === 'signup' ? 'Create your account to get started' : 'Sign in to continue'}
        </p>
      </div>

      {/* Social login buttons */}
      <div className="space-y-3 mb-6">
        <button
          type="button"
          onClick={() => authMode === 'signup' ? handleOAuthSignUp('oauth_google') : handleOAuthSignIn('oauth_google')}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-border text-foreground hover:bg-muted transition-colors rounded-lg disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

      </div>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-background text-muted-foreground">
            or continue with email
          </span>
        </div>
      </div>

      {/* Email/password form */}
      <form onSubmit={authMode === 'signup' ? handleEmailSignUp : handleEmailSignIn} className="space-y-4">
        {/* Sign-up only fields */}
        {authMode === 'signup' && (
          <>
            <div>
              <label className="block text-sm font-mono text-foreground mb-2">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-mono text-foreground mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-mono text-foreground mb-2">
                Username <span className="text-muted-foreground">(optional)</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="johndoe"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-mono text-foreground mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-mono text-foreground mb-2">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary pr-10"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="text-destructive text-sm font-mono">
            <span className="text-red-400">//</span> {error}
          </div>
        )}

        {/* CAPTCHA element for bot protection */}
        {authMode === 'signup' && (
          <div id="clerk-captcha" data-cl-theme="dark" className="my-4" />
        )}

        <button
          type="submit"
          disabled={isLoading || !email || !password || (authMode === 'signup' && (!firstName || !lastName))}
          className="w-full px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-mono"
        >
          {isLoading
            ? (authMode === 'signup' ? '$ creating...' : '$ authenticating...')
            : (authMode === 'signup' ? '$ create --user' : '$ login --user')
          }
        </button>
      </form>

      {/* Toggle between sign-up and sign-in */}
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={() => {
            setAuthMode(authMode === 'signup' ? 'signin' : 'signup')
            setError(null)
          }}
          className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="text-traffic-green">//</span>{' '}
          {authMode === 'signin' ? (
            <>
              Don&apos;t have an account?{' '}
              <span className="text-syntax-key">Sign up</span>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <span className="text-syntax-key">Sign in</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
