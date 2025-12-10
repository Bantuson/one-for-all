'use client'

import { SignUp, SignIn } from '@clerk/nextjs'
import { useUser } from '@clerk/nextjs'
import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useRegistrationStore } from '@/lib/stores/registrationStore'
import { Button } from '@/components/ui/Button'
import { CheckCircle2 } from 'lucide-react'
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
          const response = await fetch('/api/institutions')
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
        <div className="text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">You're Signed In!</h3>
          <p className="text-sm text-foreground/60 mb-1">
            Welcome back, {user.firstName || user.emailAddresses[0]?.emailAddress}
          </p>
          <p className="text-sm text-foreground/60">
            Click continue to proceed with institution registration
          </p>
        </div>

        <div className="flex justify-center">
          <Button onClick={handleContinue} size="lg">
            Continue to Registration →
          </Button>
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
                  formButtonPrimary: 'bg-foreground hover:bg-foreground/90 text-background',
                  footerActionLink: { display: 'none' },
                  formContainer: 'w-full',
                  form: 'w-full space-y-4',
                  formFieldLabel: 'text-foreground text-sm font-medium mb-2',
                  formFieldInput: 'w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground',
                  formFieldLabelRow: '[&>label]:text-foreground [&>p]:hidden',
                  identityPreviewText: 'text-foreground',
                  formFieldInputShowPasswordButton: 'text-foreground',
                  socialButtonsBlockButton: 'border border-border text-foreground hover:bg-foreground/10',
                  socialButtonsBlockButtonText: 'text-foreground',
                },
              }}
              routing="virtual"
              afterSignInUrl={undefined}
              redirectUrl={undefined}
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
                  formButtonPrimary: 'bg-foreground hover:bg-foreground/90 text-background',
                  footerActionLink: { display: 'none' },
                  formContainer: 'w-full',
                  form: 'w-full space-y-4',
                  formFieldLabel: 'text-foreground text-sm font-medium mb-2',
                  formFieldInput: 'w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground',
                  formFieldLabelRow: '[&>label]:text-foreground [&>p]:hidden',
                  identityPreviewText: 'text-foreground',
                  formFieldInputShowPasswordButton: 'text-foreground',
                  socialButtonsBlockButton: 'border border-border text-foreground hover:bg-foreground/10',
                  socialButtonsBlockButtonText: 'text-foreground',
                },
              }}
              routing="virtual"
              afterSignUpUrl={undefined}
              redirectUrl={undefined}
              signUpForceCaptureAttributes={{
                firstName: 'required',
                lastName: 'required',
              }}
            />
          )}
        </Suspense>
      </ClerkErrorBoundary>

      {/* Toggle between sign-up and sign-in */}
      <div className="mt-6 text-center w-full">
        <button
          onClick={() => setShowSignIn(!showSignIn)}
          className="text-sm text-foreground/60 hover:text-foreground transition-colors"
        >
          {showSignIn ? (
            <>
              Don't have an account? <span className="font-medium">Sign up</span>
            </>
          ) : (
            <>
              Already have an account? <span className="font-medium">Sign in</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
