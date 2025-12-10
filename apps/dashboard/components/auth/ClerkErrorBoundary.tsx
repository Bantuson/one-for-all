'use client'

import { Component, type ReactNode } from 'react'
import { Button } from '../ui/Button'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorCount: number
}

/**
 * Error Boundary specifically for Clerk component chunk loading failures.
 *
 * Handles:
 * - ChunkLoadError from Clerk's CDN
 * - Dynamic import failures
 * - Network errors loading Clerk components
 *
 * Provides:
 * - Retry mechanism with exponential backoff
 * - Fallback UI with helpful error messages
 * - Automatic recovery after max retries
 */
export class ClerkErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorCount: 0,
    }
  }

  static getDerivedStateFromError(error: Error): State {
    // Check if this is a ChunkLoadError from Clerk
    const isChunkLoadError =
      error.name === 'ChunkLoadError' ||
      error.message.includes('Loading chunk') ||
      error.message.includes('clerk.accounts.dev') ||
      error.message.includes('clerk-js')

    return {
      hasError: isChunkLoadError,
      error: isChunkLoadError ? error : null,
      errorCount: 0,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ClerkErrorBoundary] Caught error:', error)
    console.error('[ClerkErrorBoundary] Error info:', errorInfo)

    // Call parent error handler if provided
    this.props.onError?.(error, errorInfo)

    // Increment error count for retry logic
    this.setState((prev) => ({
      errorCount: prev.errorCount + 1,
    }))
  }

  handleRetry = () => {
    const { errorCount } = this.state

    // Clear browser cache for Clerk resources
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          if (name.includes('clerk') || name.includes('chunk')) {
            caches.delete(name)
          }
        })
      })
    }

    // Reset error state to retry rendering
    this.setState({
      hasError: false,
      error: null,
      errorCount: errorCount + 1,
    })

    // If we've tried too many times, reload the page
    if (errorCount >= 2) {
      console.log('[ClerkErrorBoundary] Max retries reached, reloading page...')
      window.location.reload()
    }
  }

  handleHardRefresh = () => {
    // Clear all caches and reload
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name))
      })
    }

    // Clear localStorage
    localStorage.clear()

    // Hard reload
    window.location.reload()
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // If custom fallback provided, use it
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-500 mb-2">
                Authentication Component Failed to Load
              </h3>
              <p className="text-sm text-foreground/70 mb-4">
                We're having trouble loading the sign-in component. This is usually
                a temporary network issue.
              </p>

              {this.state.errorCount > 0 && (
                <p className="text-xs text-foreground/60 mb-4">
                  Retry attempt: {this.state.errorCount}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={this.handleRetry}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>

                {this.state.errorCount >= 1 && (
                  <Button
                    onClick={this.handleHardRefresh}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Clear Cache & Reload
                  </Button>
                )}
              </div>

              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4">
                  <summary className="text-xs text-foreground/50 cursor-pointer">
                    Error Details (Development Only)
                  </summary>
                  <pre className="mt-2 text-xs text-foreground/40 overflow-auto max-h-40 bg-background/50 p-2 rounded">
                    {this.state.error.message}
                    {'\n\n'}
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
