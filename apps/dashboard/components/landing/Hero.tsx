'use client'

import { useEffect, useRef, useState } from 'react'
import { Logo } from '../branding/Logo'
import { Button } from '../ui/Button'
import { RegistrationModal } from '../modals/RegistrationModal'
import { LoginModal } from '../modals/LoginModal'
import { TrafficLights } from '../ui/TrafficLights'

interface HeroProps {
  showRegistrationModal?: boolean
}

export function Hero({ showRegistrationModal: initialShowRegistration }: HeroProps) {
  const cardsRef = useRef<(HTMLDivElement | null)[]>([])
  const [showRegistrationModal, setShowRegistrationModal] = useState(
    initialShowRegistration || false
  )
  const [showLoginModal, setShowLoginModal] = useState(false)

  // Open registration modal if URL param is set
  useEffect(() => {
    if (initialShowRegistration) {
      setShowRegistrationModal(true)
    }
  }, [initialShowRegistration])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
          } else {
            entry.target.classList.remove('visible')
          }
        })
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -100px 0px',
      }
    )

    cardsRef.current.forEach((card) => {
      if (card) {
        card.classList.add('slide-card')
        observer.observe(card)
      }
    })

    return () => observer.disconnect()
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      {/* Header with terminal styling */}
      <div className="mb-12 text-center">
        <h1 className="font-mono text-xl sm:text-2xl">
          <span className="text-syntax-export">export</span>
          <span className="text-syntax-key ml-2">AdmissionsManagement</span>
        </h1>
        <p className="mt-2 font-mono text-sm text-muted-foreground">
          <span className="text-traffic-green">//</span> Streamlined admissions processing
        </p>
      </div>

      {/* Logo */}
      <div className="mb-16">
        <Logo />
      </div>

      {/* CTA Buttons - Command style */}
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        <Button
          size="lg"
          className="min-w-[180px] font-mono"
          onClick={() => setShowRegistrationModal(true)}
        >
          <span className="text-traffic-green mr-1">$</span> register
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="min-w-[180px] font-mono"
          onClick={() => setShowLoginModal(true)}
        >
          <span className="text-traffic-green mr-1">$</span> sign-in
        </Button>
      </div>

      {/* Modals */}
      <RegistrationModal
        open={showRegistrationModal}
        onOpenChange={setShowRegistrationModal}
      />
      <LoginModal open={showLoginModal} onOpenChange={setShowLoginModal} />

      {/* Feature Description */}
      <div className="mt-12 max-w-4xl text-center">
        <p className="font-mono text-base leading-relaxed text-muted-foreground sm:text-lg">
          <span className="text-traffic-green">/*</span> Streamline your admissions process with AI-powered application
          processing. Our intelligent system analyzes, categorizes, and manages
          applications automatically, giving you more time to focus on finding
          the right candidates. <span className="text-traffic-green">*/</span>
        </p>

        {/* Feature Highlights - Terminal styled cards */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div
            ref={(el) => {
              cardsRef.current[0] = el
            }}
            className="min-h-[180px] rounded-lg border border-border bg-card/80 backdrop-blur-sm overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
              <TrafficLights status="active" size="sm" />
              <span className="font-mono text-xs text-muted-foreground">ai-processing.ts</span>
            </div>
            <div className="p-6 text-left">
              <h3 className="mb-2 font-mono text-base">
                <span className="text-syntax-export">export</span>
                <span className="text-syntax-key ml-1">AIProcessing</span>
              </h3>
              <p className="font-mono text-sm text-muted-foreground">
                <span className="text-traffic-green">//</span> Automated document analysis and categorization
              </p>
            </div>
          </div>

          <div
            ref={(el) => {
              cardsRef.current[1] = el
            }}
            className="delay-100 min-h-[180px] rounded-lg border border-border bg-card/80 backdrop-blur-sm overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
              <TrafficLights status="active" size="sm" />
              <span className="font-mono text-xs text-muted-foreground">institutions.ts</span>
            </div>
            <div className="p-6 text-left">
              <h3 className="mb-2 font-mono text-base">
                <span className="text-syntax-export">export</span>
                <span className="text-syntax-key ml-1">MultiInstitution</span>
              </h3>
              <p className="font-mono text-sm text-muted-foreground">
                <span className="text-traffic-green">//</span> Universities, NSFAS, colleges, and bursary providers
              </p>
            </div>
          </div>

          <div
            ref={(el) => {
              cardsRef.current[2] = el
            }}
            className="delay-200 min-h-[180px] rounded-lg border border-border bg-card/80 backdrop-blur-sm overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
              <TrafficLights status="active" size="sm" />
              <span className="font-mono text-xs text-muted-foreground">tracking.ts</span>
            </div>
            <div className="p-6 text-left">
              <h3 className="mb-2 font-mono text-base">
                <span className="text-syntax-export">export</span>
                <span className="text-syntax-key ml-1">RealtimeTracking</span>
              </h3>
              <p className="font-mono text-sm text-muted-foreground">
                <span className="text-traffic-green">//</span> Application status updates and notifications
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
