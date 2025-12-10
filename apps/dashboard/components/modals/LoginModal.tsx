'use client'

import { Dialog, DialogContent } from '@/components/ui/Dialog'
import { ModalHeader } from '@/components/ui/ModalHeader'
import { SignIn } from '@clerk/nextjs'
import { Suspense } from 'react'
import { ClerkErrorBoundary } from '../auth/ClerkErrorBoundary'

interface LoginModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * LoginModal using Clerk's built-in SignIn component
 *
 * This handles all authentication flows automatically:
 * - Email + password
 * - Email verification codes
 * - Two-factor authentication
 * - Password reset
 * - OAuth (Google, etc.)
 *
 * After successful sign-in, redirects to /dashboard which handles smart routing.
 */
export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0" hideCloseButton>
        <ModalHeader title="Welcome Back" onClose={() => onOpenChange(false)} />

        <div className="px-6 py-6">
          <ClerkErrorBoundary>
            <Suspense
              fallback={
                <div className="flex justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground mx-auto mb-4" />
                    <p className="text-sm text-foreground/60">Loading sign-in...</p>
                  </div>
                </div>
              }
            >
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
                    formResendCodeLink: 'text-foreground hover:text-foreground/80',
                    otpCodeFieldInput: 'bg-background border-border text-foreground',
                  },
                }}
                routing="virtual"
                afterSignInUrl="/dashboard"
                redirectUrl="/dashboard"
              />
            </Suspense>
          </ClerkErrorBoundary>
        </div>
      </DialogContent>
    </Dialog>
  )
}
