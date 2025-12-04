'use client'

import { SignUp, SignIn } from '@clerk/nextjs'
import { useUser } from '@clerk/nextjs'
import { useState } from 'react'
import { useRegistrationStore } from '@/lib/stores/registrationStore'
import { Button } from '@/components/ui/Button'
import { CheckCircle2 } from 'lucide-react'

export function ClerkSignUp() {
  const { isLoaded, isSignedIn, user } = useUser()
  const { nextStep, setClerkUserId } = useRegistrationStore()
  const [showSignIn, setShowSignIn] = useState(false)

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

  // Show sign-up or sign-in form
  return (
    <div className="w-full py-8">
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
              phoneInputBox: 'bg-background border border-border rounded-lg',
              selectButton: 'bg-background text-foreground border-r border-border',
              selectOptionsContainer: 'bg-background border border-border',
              selectOption: 'text-foreground hover:bg-foreground/10',
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
              phoneInputBox: 'bg-background border border-border rounded-lg',
              selectButton: 'bg-background text-foreground border-r border-border',
              selectOptionsContainer: 'bg-background border border-border',
              selectOption: 'text-foreground hover:bg-foreground/10',
              socialButtonsBlockButton: 'border border-border text-foreground hover:bg-foreground/10',
              socialButtonsBlockButtonText: 'text-foreground',
            },
          }}
          routing="virtual"
          afterSignUpUrl={undefined}
          redirectUrl={undefined}
        />
      )}

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
