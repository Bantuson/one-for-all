'use client'

import { Dialog, DialogContent } from '@/components/ui/Dialog'
import { ModalHeader } from '@/components/ui/ModalHeader'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormField } from '@/components/ui/FormField'
import { Button } from '@/components/ui/Button'
import { useState } from 'react'
import { useSignIn } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

// Official Google Logo SVG
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}

interface LoginModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { signIn, setActive } = useSignIn()
  const router = useRouter()

  const methods = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const {
    handleSubmit,
    formState: { errors },
  } = methods

  const onSubmit = async (data: LoginFormData) => {
    if (!signIn) return

    setIsSubmitting(true)
    setError(null)

    try {
      // Sign in with Clerk
      const result = await signIn.create({
        identifier: data.email,
        password: data.password,
      })

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })

        // Fetch user's institutions from Supabase
        const response = await fetch('/api/institutions')
        const institutionsData = await response.json()

        // Close modal
        onOpenChange(false)

        // Navigate to first institution dashboard or general dashboard
        if (institutionsData.institutions?.length > 0) {
          router.push(`/dashboard/${institutionsData.institutions[0].slug}`)
        } else {
          router.push('/dashboard')
        }
      } else {
        setError('Sign-in failed. Please try again.')
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Failed to sign in')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (!signIn) return

    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/dashboard',
      })
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Failed to sign in with Google')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0" hideCloseButton>
        <ModalHeader title="Welcome Back" onClose={() => onOpenChange(false)} />

        <div className="px-6 py-6">
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                name="email"
                label="Email"
                type="email"
                placeholder="your.email@example.com"
                error={errors.email?.message}
              />

              <FormField
                name="password"
                label="Password"
                type="password"
                placeholder="Enter your password"
                error={errors.password?.message}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-foreground/60 hover:text-foreground transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-foreground/60">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border transition-colors bg-white text-gray-900 border-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:text-white dark:border-gray-700 dark:hover:bg-gray-800"
                disabled={isSubmitting}
              >
                <GoogleLogo />
                <span className="font-medium">Continue with Google</span>
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-foreground/60">Don't have an account? </span>
            <button
              onClick={() => {
                onOpenChange(false)
                // TODO: Open registration modal
              }}
              className="text-foreground hover:underline"
            >
              Sign up
            </button>
          </div>
        </FormProvider>
        </div>
      </DialogContent>
    </Dialog>
  )
}
