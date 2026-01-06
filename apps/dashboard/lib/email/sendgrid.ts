import sgMail from '@sendgrid/mail'

// Initialize SendGrid with API key
const apiKey = process.env.SENDGRID_API_KEY
if (apiKey) {
  sgMail.setApiKey(apiKey)
}

export interface SendEmailParams {
  to: string
  subject: string
  html: string
  text?: string // Plain text version of the email (optional)
  from?: string // default to process.env.SENDGRID_FROM_EMAIL or 'noreply@oneforall.app'
}

export interface SendEmailResult {
  success: boolean
  error?: string
  messageId?: string // SendGrid message ID for tracking
}

/**
 * Send an email using SendGrid
 *
 * @param params - Email parameters including to, subject, html, and optional from address
 * @returns Promise with success status and optional error message
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { to, subject, html, text, from } = params

  // Validate API key is configured
  if (!apiKey) {
    const error = 'SendGrid API key is not configured. Set SENDGRID_API_KEY environment variable.'
    console.error('[SendGrid] Error:', error)
    return { success: false, error }
  }

  // Determine sender email
  const fromEmail = from || process.env.SENDGRID_FROM_EMAIL || 'noreply@oneforall.app'

  // Validate required parameters
  if (!to) {
    const error = 'Recipient email address (to) is required'
    console.error('[SendGrid] Validation error:', error)
    return { success: false, error }
  }

  if (!subject) {
    const error = 'Email subject is required'
    console.error('[SendGrid] Validation error:', error)
    return { success: false, error }
  }

  if (!html) {
    const error = 'Email HTML content is required'
    console.error('[SendGrid] Validation error:', error)
    return { success: false, error }
  }

  try {
    console.log('[SendGrid] Sending email:', {
      to,
      from: fromEmail,
      subject,
    })

    const [response] = await sgMail.send({
      to,
      from: fromEmail,
      subject,
      html,
      ...(text && { text }),
    })

    // Extract message ID from response headers
    const messageId = response.headers['x-message-id'] as string | undefined

    console.log('[SendGrid] Email sent successfully to:', to, messageId ? `(messageId: ${messageId})` : '')
    return { success: true, messageId }
  } catch (err: unknown) {
    // Handle SendGrid-specific errors
    const error = err as {
      response?: {
        body?: {
          errors?: Array<{ message: string }>
        }
      }
      message?: string
    }

    let errorMessage = 'Failed to send email'

    if (error.response?.body?.errors) {
      // Extract detailed error messages from SendGrid response
      const sgErrors = error.response.body.errors
      errorMessage = sgErrors.map((e) => e.message).join(', ')
    } else if (error.message) {
      errorMessage = error.message
    }

    console.error('[SendGrid] Error sending email:', {
      to,
      subject,
      error: errorMessage,
    })

    return { success: false, error: errorMessage }
  }
}
