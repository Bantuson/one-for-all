'use client'

import * as React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSignUp, useSignIn, useUser } from '@clerk/nextjs'
import { AlertCircle, CheckCircle2, Loader2, Users, Shield, Lock } from 'lucide-react'
import { CodeCard, CodeCardHeader } from '@/components/ui/CodeCard'
import { CommandButton } from '@/components/ui/CommandButton'
import { Button } from '@/components/ui/Button'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'

// ============================================================================
// Types
// ============================================================================

interface InvitationData {
  id: string
  institution_id: string
  institution_name: string
  institution_slug: string
  invited_email: string
  permissions: string[]
  role: string
  inviter_name: string | null
  expires_at: string
  status: 'valid' | 'expired' | 'used' | 'not_found'
}

interface ValidationResponse {
  valid: boolean
  invitation?: InvitationData
  error?: string
}

// ============================================================================
// Permission Display Mapping
// ============================================================================

const PERMISSION_LABELS: Record<string, string> = {
  view_dashboard: 'View Dashboard',
  edit_courses: 'Edit Courses',
  manage_applications: 'Manage Applications',
  view_reports: 'View Reports',
  manage_team: 'Manage Team',
  manage_settings: 'Manage Settings',
  admin_access: 'Full Admin Access',
}

// ============================================================================
// Component
// ============================================================================

export default function InviteAcceptancePage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const { signUp, setActive: setActiveSignUp, isLoaded: _isSignUpLoaded } = useSignUp()
  const { signIn, setActive: setActiveSignIn, isLoaded: _isSignInLoaded } = useSignIn()
  const { user, isSignedIn, isLoaded: isUserLoaded } = useUser()

  // State
  const [validationState, setValidationState] = React.useState<'loading' | 'valid' | 'invalid'>('loading')
  const [invitation, setInvitation] = React.useState<InvitationData | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  // Form state
  const [firstName, setFirstName] = React.useState('')
  const [lastName, setLastName] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [verificationCode, setVerificationCode] = React.useState('')

  // Flow state
  const [authStep, setAuthStep] = React.useState<'form' | 'verifying' | 'accepting' | 'complete'>('form')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Validate token on mount
  React.useEffect(() => {
    async function validateToken() {
      try {
        const response = await fetch(`/api/invitations/validate?token=${token}`)
        const data: ValidationResponse = await response.json()

        if (data.valid && data.invitation) {
          setInvitation(data.invitation)
          setValidationState('valid')
        } else {
          setError(data.error || 'Invalid invitation')
          setValidationState('invalid')
        }
      } catch (err) {
        console.error('Failed to validate token:', err)
        setError('Failed to validate invitation')
        setValidationState('invalid')
      }
    }

    if (token) {
      validateToken()
    }
  }, [token])

  // Handle sign-up form submission
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signUp || !invitation) return

    // Validate passwords
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Create sign-up with locked email
      await signUp.create({
        emailAddress: invitation.invited_email,
        password,
        firstName,
        lastName,
      })

      // Prepare email verification
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setAuthStep('verifying')
    } catch (err: unknown) {
      console.error('Sign-up error:', err)
      const clerkError = err as { errors?: Array<{ message: string }> }
      setError(clerkError.errors?.[0]?.message || 'Failed to create account')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle email verification
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signUp || !invitation) return

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      })

      if (result.status === 'complete') {
        // Set active session
        await setActiveSignUp({ session: result.createdSessionId })
        setAuthStep('accepting')

        // Now accept the invitation
        await acceptInvitation(result.createdUserId!)
      } else {
        setError('Verification failed. Please try again.')
      }
    } catch (err: unknown) {
      console.error('Verification error:', err)
      const clerkError = err as { errors?: Array<{ message: string }> }
      setError(clerkError.errors?.[0]?.message || 'Invalid verification code')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle existing user sign-in
  // Note: This function is defined but not currently wired up to UI
  // It's kept for future use when implementing sign-in flow for existing users
  const _handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!signIn || !invitation) return

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await signIn.create({
        identifier: invitation.invited_email,
        password,
      })

      if (result.status === 'complete') {
        await setActiveSignIn({ session: result.createdSessionId })
        setAuthStep('accepting')

        // Fetch the user ID from the session after sign-in
        const sessionResponse = await fetch('/api/auth/session-check')
        const sessionData = await sessionResponse.json()
        if (!sessionData.userId) {
          setError('Failed to retrieve user from session')
          setAuthStep('form')
          return
        }
        await acceptInvitation(sessionData.userId)
      } else {
        setError('Sign-in incomplete. Please try again.')
      }
    } catch (err: unknown) {
      console.error('Sign-in error:', err)
      const clerkError = err as { errors?: Array<{ message: string }> }
      setError(clerkError.errors?.[0]?.message || 'Invalid credentials')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Accept invitation (link user to institution)
  const acceptInvitation = async (clerkUserId: string) => {
    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          clerk_user_id: clerkUserId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setAuthStep('complete')
        // Redirect to dashboard after short delay
        setTimeout(() => {
          router.push(`/dashboard/${invitation?.institution_slug}?welcome=invite_accepted`)
        }, 2000)
      } else {
        setError(data.error || 'Failed to accept invitation')
        setAuthStep('form')
      }
    } catch (err) {
      console.error('Accept invitation error:', err)
      setError('Failed to accept invitation')
      setAuthStep('form')
    }
  }

  // Handle already signed-in user accepting invitation
  const handleAcceptAsCurrentUser = async () => {
    if (!user || !invitation) return

    // Verify email matches
    const userEmail = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress
    if (userEmail !== invitation.invited_email) {
      setError(`This invitation was sent to ${invitation.invited_email}. Please sign out and use that email to accept.`)
      return
    }

    setIsSubmitting(true)
    setAuthStep('accepting')

    try {
      await acceptInvitation(user.id)
    } catch (err) {
      console.error('Accept error:', err)
      setError('Failed to accept invitation')
      setAuthStep('form')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Auto-verify when 6 digits entered
  React.useEffect(() => {
    if (authStep === 'verifying' && verificationCode.length === 6 && !isSubmitting) {
      const syntheticEvent = { preventDefault: () => {} } as React.FormEvent
      handleVerify(syntheticEvent)
    }
  }, [verificationCode, authStep, isSubmitting])

  // ============================================================================
  // Render States
  // ============================================================================

  // Loading state
  if (validationState === 'loading') {
    return (
      <div className="flex flex-col flex-1 min-h-screen">
        <DashboardHeader
          institution={{ name: 'One For All', slug: 'invite' }}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-4 font-mono text-sm text-muted-foreground">
              Validating invitation...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Invalid invitation state
  if (validationState === 'invalid' || !invitation) {
    return (
      <div className="flex flex-col flex-1 min-h-screen">
        <DashboardHeader
          institution={{ name: 'One For All', slug: 'invite' }}
        />
        <div className="container mx-auto py-12 px-4">
          <div className="max-w-md mx-auto">
            <CodeCard>
              <CodeCardHeader filename="invitation.error" status="error" />
              <div className="p-6 text-center">
                <AlertCircle className="h-12 w-12 text-traffic-red mx-auto mb-4" />
                <h2 className="font-mono text-lg font-semibold mb-2">
                  Invalid Invitation
                </h2>
                <p className="text-muted-foreground text-sm mb-6">
                  {error || 'This invitation link is invalid or has expired.'}
                </p>
                <Button onClick={() => router.push('/')}>
                  Return Home
                </Button>
              </div>
            </CodeCard>
          </div>
        </div>
      </div>
    )
  }

  // Check if user is already signed in
  const showExistingUserFlow = isUserLoaded && isSignedIn && user

  return (
    <div className="flex flex-col flex-1 min-h-screen">
      <DashboardHeader
        institution={{ name: 'One For All', slug: 'invite' }}
      />

      <div className="container mx-auto py-8 px-4">
        <div className="max-w-lg mx-auto">
          {/* Heading */}
          <div className="mb-8 text-center">
            <p className="font-mono text-sm">
              <span className="text-traffic-green">//</span>
              <span className="text-muted-foreground">
                {' '}You&apos;ve been invited to join {invitation.institution_name}
              </span>
            </p>
          </div>

          {/* Invitation Details Card */}
          <CodeCard className="mb-6">
            <CodeCardHeader filename="invitation.details" status="active" />
            <div className="p-6">
              {/* Invitation info */}
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-muted">
                  <Users className="h-5 w-5 text-traffic-green" />
                </div>
                <div>
                  <p className="font-mono text-sm font-medium">
                    {invitation.institution_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {invitation.inviter_name ? `Invited by ${invitation.inviter_name}` : 'Team invitation'}
                  </p>
                </div>
              </div>

              {/* Permissions */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-traffic-amber" />
                  <span className="font-mono text-xs text-muted-foreground">
                    Permissions granted:
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {invitation.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="px-2 py-1 rounded text-xs font-mono bg-muted text-foreground"
                    >
                      {PERMISSION_LABELS[perm] || perm}
                    </span>
                  ))}
                </div>
              </div>

              {/* Locked email notice */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  <span className="font-mono">
                    Email locked to: {invitation.invited_email}
                  </span>
                </div>
              </div>
            </div>
          </CodeCard>

          {/* Error display */}
          {error && (
            <div className="mb-6 p-4 border border-traffic-red/50 bg-traffic-red/5 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-traffic-red flex-shrink-0 mt-0.5" />
                <p className="text-sm font-mono text-foreground">{error}</p>
              </div>
            </div>
          )}

          {/* Main Form Card */}
          <CodeCard>
            <CodeCardHeader
              filename="accept.form"
              status="active"
            />
            <div className="p-6">
              {/* Complete state */}
              {authStep === 'complete' && (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-traffic-green mx-auto mb-4" />
                  <h3 className="font-mono text-lg font-semibold mb-2">
                    Welcome to {invitation.institution_name}!
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Redirecting to your dashboard...
                  </p>
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </div>
              )}

              {/* Accepting state */}
              {authStep === 'accepting' && (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-traffic-green mb-4" />
                  <p className="font-mono text-sm text-muted-foreground">
                    Linking account to institution...
                  </p>
                </div>
              )}

              {/* Existing user flow */}
              {showExistingUserFlow && authStep === 'form' && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    You&apos;re signed in as{' '}
                    <span className="font-mono text-foreground">
                      {user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress}
                    </span>
                  </p>
                  <CommandButton
                    command="accept --invitation"
                    variant="primary"
                    size="md"
                    onClick={handleAcceptAsCurrentUser}
                    disabled={isSubmitting}
                    loading={isSubmitting}
                  />
                </div>
              )}

              {/* Sign-up form */}
              {!showExistingUserFlow && authStep === 'form' && (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <p className="text-center text-sm text-muted-foreground mb-6">
                    Create your account to join the team
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-mono text-xs text-muted-foreground mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-border bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-traffic-green/50"
                        required
                      />
                    </div>
                    <div>
                      <label className="block font-mono text-xs text-muted-foreground mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-border bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-traffic-green/50"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-mono text-xs text-muted-foreground mb-1">
                      Email (locked)
                    </label>
                    <input
                      type="email"
                      value={invitation.invited_email}
                      disabled
                      className="w-full px-3 py-2 rounded-md border border-border bg-muted font-mono text-sm text-muted-foreground cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-xs text-muted-foreground mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-border bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-traffic-green/50"
                      required
                      minLength={8}
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-xs text-muted-foreground mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-md border border-border bg-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-traffic-green/50"
                      required
                    />
                  </div>

                  <div className="pt-4">
                    <CommandButton
                      command="create --account"
                      variant="primary"
                      size="md"
                      type="submit"
                      disabled={isSubmitting}
                      loading={isSubmitting}
                      className="w-full"
                    />
                  </div>
                </form>
              )}

              {/* Verification form */}
              {authStep === 'verifying' && (
                <form onSubmit={handleVerify} className="space-y-4">
                  <div className="text-center mb-6">
                    <p className="text-sm text-muted-foreground">
                      We sent a verification code to{' '}
                      <span className="font-mono text-foreground">
                        {invitation.invited_email}
                      </span>
                    </p>
                  </div>

                  <div>
                    <label className="block font-mono text-xs text-muted-foreground mb-1 text-center">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full px-4 py-3 rounded-md border border-border bg-background font-mono text-2xl text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-traffic-green/50"
                      placeholder="000000"
                      maxLength={6}
                      autoFocus
                    />
                  </div>

                  <div className="pt-4">
                    <CommandButton
                      command="verify --email"
                      variant="primary"
                      size="md"
                      type="submit"
                      disabled={isSubmitting || verificationCode.length !== 6}
                      loading={isSubmitting}
                      className="w-full"
                    />
                  </div>
                </form>
              )}
            </div>
          </CodeCard>
        </div>
      </div>
    </div>
  )
}
