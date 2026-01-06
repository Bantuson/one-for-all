import type { Metadata } from 'next'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import { Providers } from './providers'
import { Toaster } from 'sonner'

export const metadata: Metadata = {
  title: 'One For All - Admissions Management Center',
  description:
    'Multi-tenant admissions management platform powered by AI agents',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      signInUrl="/register"
      signUpUrl="/register"
      signInFallbackRedirectUrl="/register"
      signUpFallbackRedirectUrl="/register"
      appearance={{
        variables: {
          colorPrimary: 'hsl(var(--foreground))',
          colorBackground: 'hsl(var(--background))',
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body className="font-sans antialiased">
          <Providers>{children}</Providers>
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: 'bg-zinc-800 text-white border-zinc-700',
              style: {
                background: '#27272a',
                color: '#ffffff',
                border: '1px solid #3f3f46',
              },
            }}
          />
        </body>
      </html>
    </ClerkProvider>
  )
}
