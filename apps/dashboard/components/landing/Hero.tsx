'use client'

import { useEffect, useRef, useState } from 'react'
import { Logo } from '../branding/Logo'
import { Button } from '../ui/Button'
import { RegistrationModal } from '../modals/RegistrationModal'
import { LoginModal } from '../modals/LoginModal'

export function Hero() {
  const cardsRef = useRef<(HTMLDivElement | null)[]>([])
  const [showRegistrationModal, setShowRegistrationModal] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)

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
      {/* Header */}
      <h1 className="mb-12 text-center text-xl font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100 sm:text-2xl">
        ADMISSIONS MANAGEMENT CENTER
      </h1>

      {/* Logo */}
      <div className="mb-16">
        <Logo />
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        <Button
          size="lg"
          className="min-w-[160px]"
          onClick={() => setShowRegistrationModal(true)}
        >
          Register
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="min-w-[160px]"
          onClick={() => setShowLoginModal(true)}
        >
          Sign in
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
        <p className="text-base leading-relaxed text-gray-600 dark:text-gray-400 sm:text-lg">
          Streamline your admissions process with AI-powered application
          processing. Our intelligent system analyzes, categorizes, and manages
          applications automatically, giving you more time to focus on finding
          the right candidates.
        </p>

        {/* Feature Highlights */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div
            ref={(el) => {
              cardsRef.current[0] = el
            }}
            className="min-h-[180px] rounded-lg border border-gray-200 bg-white/50 p-8 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/50"
          >
            <h3 className="mb-3 text-lg font-bold text-gray-900 dark:text-gray-100">
              AI-Assisted Processing
            </h3>
            <p className="text-base leading-relaxed text-gray-600 dark:text-gray-400">
              Automated document analysis and categorization
            </p>
          </div>

          <div
            ref={(el) => {
              cardsRef.current[1] = el
            }}
            className="delay-100 min-h-[180px] rounded-lg border border-gray-200 bg-white/50 p-8 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/50"
          >
            <h3 className="mb-3 text-lg font-bold text-gray-900 dark:text-gray-100">
              Multi-Institution Support
            </h3>
            <p className="text-base leading-relaxed text-gray-600 dark:text-gray-400">
              Universities, NSFAS, colleges, and bursary providers
            </p>
          </div>

          <div
            ref={(el) => {
              cardsRef.current[2] = el
            }}
            className="delay-200 min-h-[180px] rounded-lg border border-gray-200 bg-white/50 p-8 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/50"
          >
            <h3 className="mb-3 text-lg font-bold text-gray-900 dark:text-gray-100">
              Real-time Tracking
            </h3>
            <p className="text-base leading-relaxed text-gray-600 dark:text-gray-400">
              Application status updates and notifications
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
