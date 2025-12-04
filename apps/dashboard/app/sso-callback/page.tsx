'use client'

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'

export default function SSOCallback() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center">
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/dashboard"
        signUpFallbackRedirectUrl="/dashboard"
        afterSignInUrl="/dashboard"
        afterSignUpUrl="/dashboard"
      />
    </div>
  )
}
