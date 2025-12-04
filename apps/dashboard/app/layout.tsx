import type { Metadata } from 'next'
import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import { Providers } from './providers'

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
        </body>
      </html>
    </ClerkProvider>
  )
}
