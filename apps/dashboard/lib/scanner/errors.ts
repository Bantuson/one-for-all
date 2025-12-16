/**
 * Error Types and Classes for Web Scraper
 *
 * Provides typed errors for better error handling and retry logic.
 */

export enum ErrorType {
  // Retryable errors - temporary issues that might resolve
  RETRYABLE_TIMEOUT = 'RETRYABLE_TIMEOUT',
  RETRYABLE_NETWORK = 'RETRYABLE_NETWORK',
  RETRYABLE_RATE_LIMIT = 'RETRYABLE_RATE_LIMIT',
  RETRYABLE_SERVER_ERROR = 'RETRYABLE_SERVER_ERROR',

  // Permanent errors - won't resolve with retry
  PERMANENT_NOT_FOUND = 'PERMANENT_NOT_FOUND',
  PERMANENT_FORBIDDEN = 'PERMANENT_FORBIDDEN',
  PERMANENT_BAD_REQUEST = 'PERMANENT_BAD_REQUEST',
  PERMANENT_INVALID_URL = 'PERMANENT_INVALID_URL',
  PERMANENT_UNSUPPORTED = 'PERMANENT_UNSUPPORTED',
}

export class ScraperError extends Error {
  constructor(
    message: string,
    public type: ErrorType,
    public url: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'ScraperError'
  }

  /**
   * Check if this error is retryable
   */
  isRetryable(): boolean {
    return this.type.startsWith('RETRYABLE_')
  }
}

/**
 * Track error metrics for monitoring
 */
export class ErrorMetrics {
  private metrics = {
    retryable: 0,
    permanent: 0,
    recovered: 0,
    totalRetries: 0,
  }

  recordRetryableError() {
    this.metrics.retryable++
  }

  recordPermanentError() {
    this.metrics.permanent++
  }

  recordRecovery() {
    this.metrics.recovered++
  }

  recordRetry() {
    this.metrics.totalRetries++
  }

  getMetrics() {
    return { ...this.metrics }
  }

  reset() {
    this.metrics = {
      retryable: 0,
      permanent: 0,
      recovered: 0,
      totalRetries: 0,
    }
  }
}

/**
 * Classify an error into ErrorType
 */
export function classifyError(error: Error, url: string): ScraperError {
  const errorMessage = error.message.toLowerCase()

  // Timeout errors
  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('timed out') ||
    errorMessage.includes('etimedout')
  ) {
    return new ScraperError(
      `Timeout error for ${url}: ${error.message}`,
      ErrorType.RETRYABLE_TIMEOUT,
      url,
      error
    )
  }

  // Network errors
  if (
    errorMessage.includes('econnreset') ||
    errorMessage.includes('econnrefused') ||
    errorMessage.includes('network') ||
    errorMessage.includes('socket') ||
    errorMessage.includes('fetch failed')
  ) {
    return new ScraperError(
      `Network error for ${url}: ${error.message}`,
      ErrorType.RETRYABLE_NETWORK,
      url,
      error
    )
  }

  // Rate limiting
  if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
    return new ScraperError(
      `Rate limited for ${url}: ${error.message}`,
      ErrorType.RETRYABLE_RATE_LIMIT,
      url,
      error
    )
  }

  // Server errors (5xx)
  if (errorMessage.includes('503') || errorMessage.includes('500') || errorMessage.includes('502')) {
    return new ScraperError(
      `Server error for ${url}: ${error.message}`,
      ErrorType.RETRYABLE_SERVER_ERROR,
      url,
      error
    )
  }

  // Not found (404)
  if (errorMessage.includes('404') || errorMessage.includes('not found')) {
    return new ScraperError(
      `Page not found: ${url}`,
      ErrorType.PERMANENT_NOT_FOUND,
      url,
      error
    )
  }

  // Forbidden (403)
  if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
    return new ScraperError(
      `Access forbidden for ${url}: ${error.message}`,
      ErrorType.PERMANENT_FORBIDDEN,
      url,
      error
    )
  }

  // Bad request (400)
  if (errorMessage.includes('400') || errorMessage.includes('bad request')) {
    return new ScraperError(
      `Bad request for ${url}: ${error.message}`,
      ErrorType.PERMANENT_BAD_REQUEST,
      url,
      error
    )
  }

  // Invalid URL
  if (errorMessage.includes('invalid url') || errorMessage.includes('malformed')) {
    return new ScraperError(
      `Invalid URL: ${url}`,
      ErrorType.PERMANENT_INVALID_URL,
      url,
      error
    )
  }

  // Default to network error (retryable) for unknown errors
  return new ScraperError(
    `Unknown error for ${url}: ${error.message}`,
    ErrorType.RETRYABLE_NETWORK,
    url,
    error
  )
}
