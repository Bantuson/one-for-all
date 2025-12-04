import type { ReactNode } from 'react'
import { ThemeToggle } from '../ui/ThemeToggle'
import { Footer } from '../landing/Footer'

export function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      {/* Header with Theme Toggle */}
      <header className="fixed right-0 top-0 z-50 p-4">
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="pb-20">{children}</main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
