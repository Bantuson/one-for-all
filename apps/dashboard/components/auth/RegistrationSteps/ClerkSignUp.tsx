'use client'

import { SignUp, SignIn } from '@clerk/nextjs'
import { useUser } from '@clerk/nextjs'
import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useRegistrationStore } from '@/lib/stores/registrationStore'
import { CommandButton } from '@/components/ui/CommandButton'
import { ClerkErrorBoundary } from '../ClerkErrorBoundary'

export function ClerkSignUp() {
  const { isLoaded, isSignedIn, user } = useUser()
  const { nextStep, setClerkUserId } = useRegistrationStore()
  const [showSignIn, setShowSignIn] = useState(false)
  const [checkingInstitutions, setCheckingInstitutions] = useState(false)
  const [hasInstitutions, setHasInstitutions] = useState(false)
  const router = useRouter()

  // Check if user already has institutions when they're signed in
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
            setHasInstitutions(true)
            // User already has institutions, redirect to their dashboard
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

  const handleContinue = () => {
    if (user?.id) {
      setClerkUserId(user.id)
    }
    nextStep()
  }

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
  if (isSignedIn) {
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
          <p className="text-sm text-muted-foreground">
            <span className="text-traffic-green">//</span> Click continue to proceed
          </p>
        </div>

        <div className="flex justify-center">
          <CommandButton
            command="continue --registration"
            variant="primary"
            onClick={handleContinue}
          />
        </div>
      </div>
    )
  }

  // Show sign-up or sign-in form wrapped in error boundary
  return (
    <div className="w-full py-8">
      <ClerkErrorBoundary>
        <Suspense
          fallback={
            <div className="flex justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4" />
                <p className="text-sm text-foreground/60">Loading authentication...</p>
              </div>
            </div>
          }
        >
          {showSignIn ? (
            <SignIn
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  card: 'shadow-none border-0 bg-transparent w-full',
                  cardBox: 'shadow-none bg-transparent w-full',
                  header: 'hidden',
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                  footer: 'bg-transparent border-t-0',
                  formButtonPrimary: 'bg-amber-700 hover:bg-amber-800 text-white font-mono border-0 border-transparent',
                  footerActionLink: { display: 'none' },
                  formContainer: 'w-full',
                  form: 'w-full space-y-4',
                  formFieldLabel: 'text-foreground text-sm font-mono mb-2',
                  formFieldInput: 'w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground font-mono placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50',
                  formFieldLabelRow: '[&>label]:text-foreground [&>label]:font-mono [&>p]:hidden',
                  identityPreviewText: 'text-foreground font-mono',
                  formFieldInputShowPasswordButton: 'text-foreground',
                  socialButtonsBlockButton: 'border border-border text-foreground hover:bg-muted transition-colors font-mono',
                  socialButtonsBlockButtonText: 'text-foreground',
                  footerActionText: 'font-mono text-muted-foreground text-xs',
                  footerPagesLink: 'font-mono text-syntax-key hover:text-syntax-key/80',
                  badge: 'font-mono text-xs bg-amber-700/20 text-amber-600 border border-amber-700/30 rounded px-2 py-0.5',
                },
              }}
              routing="virtual"
            />
          ) : (
            <SignUp
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  card: 'shadow-none border-0 bg-transparent w-full',
                  cardBox: 'shadow-none bg-transparent w-full',
                  header: 'hidden',
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                  footer: 'bg-transparent border-t-0',
                  formButtonPrimary: 'bg-amber-700 hover:bg-amber-800 text-white font-mono border-0 border-transparent',
                  footerActionLink: { display: 'none' },
                  formContainer: 'w-full',
                  form: 'w-full space-y-4',
                  formFieldLabel: 'text-foreground text-sm font-mono mb-2',
                  formFieldInput: 'w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground font-mono placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50',
                  formFieldLabelRow: '[&>label]:text-foreground [&>label]:font-mono [&>p]:hidden',
                  identityPreviewText: 'text-foreground font-mono',
                  formFieldInputShowPasswordButton: 'text-foreground',
                  socialButtonsBlockButton: 'border border-border text-foreground hover:bg-muted transition-colors font-mono',
                  socialButtonsBlockButtonText: 'text-foreground',
                  footerActionText: 'font-mono text-muted-foreground text-xs',
                  footerPagesLink: 'font-mono text-syntax-key hover:text-syntax-key/80',
                  badge: 'font-mono text-xs bg-amber-700/20 text-amber-600 border border-amber-700/30 rounded px-2 py-0.5',
                },
              }}
              routing="virtual"
            />
          )}
        </Suspense>
      </ClerkErrorBoundary>

      {/* Toggle between sign-up and sign-in */}
      <div className="mt-6 text-center w-full">
        <button
          onClick={() => setShowSignIn(!showSignIn)}
          className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
        >
          {showSignIn ? (
            <>
              <span className="text-traffic-green">//</span> Don&apos;t have an account?{' '}
              <span className="text-syntax-key font-medium">Sign up</span>
            </>
          ) : (
            <>
              <span className="text-traffic-green">//</span> Already have an account?{' '}
              <span className="text-syntax-key font-medium">Sign in</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
