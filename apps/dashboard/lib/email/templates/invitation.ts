/**
 * Invitation Email Template
 *
 * Generates HTML and plain text email content for team invitations.
 * Uses "One For All" branding with dark theme terminal aesthetic.
 */

export interface InvitationEmailParams {
  inviterName: string
  institutionName: string
  acceptUrl: string
  expiresAt: Date
  permissions: string[]
}

/**
 * Formats the expiration date for display
 */
function formatExpirationDate(date: Date): string {
  return date.toLocaleDateString('en-ZA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Formats the number of days until expiration
 */
function getDaysUntilExpiration(expiresAt: Date): number {
  const now = new Date()
  const diffTime = expiresAt.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Generates the HTML email content for an invitation
 */
export function getInvitationEmailHtml(params: InvitationEmailParams): string {
  const { inviterName, institutionName, acceptUrl, expiresAt, permissions } = params
  const daysUntilExpiration = getDaysUntilExpiration(expiresAt)
  const formattedExpiration = formatExpirationDate(expiresAt)

  const permissionsList = permissions
    .map(
      (permission) => `
        <tr>
          <td style="padding: 8px 0; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 13px; color: #4ade80;">
            <span style="color: #c9a76c;">$</span> ${permission}
          </td>
        </tr>
      `
    )
    .join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>You've been invited to join ${institutionName}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <!-- Wrapper Table -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">

        <!-- Main Container -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">

          <!-- Header with Logo -->
          <tr>
            <td align="center" style="padding: 30px 40px; background-color: #141414; border: 1px solid #333; border-bottom: none; border-radius: 12px 12px 0 0;">
              <!-- Terminal Header Bar -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-bottom: 20px;">
                    <!-- Traffic lights -->
                    <span style="display: inline-block; width: 12px; height: 12px; background-color: #ef4444; border-radius: 50%; margin-right: 8px;"></span>
                    <span style="display: inline-block; width: 12px; height: 12px; background-color: #facc15; border-radius: 50%; margin-right: 8px;"></span>
                    <span style="display: inline-block; width: 12px; height: 12px; background-color: #22c55e; border-radius: 50%;"></span>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="margin: 0; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 28px; font-weight: 700; color: #c9a76c; letter-spacing: -0.5px;">
                      One For All
                    </h1>
                    <p style="margin: 8px 0 0 0; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 12px; color: #666; letter-spacing: 2px; text-transform: uppercase;">
                      Admissions Management Platform
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px; background-color: #141414; border-left: 1px solid #333; border-right: 1px solid #333;">

              <!-- Invitation Message -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-bottom: 30px;">
                    <p style="margin: 0 0 16px 0; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 13px; color: #666;">
                      <span style="color: #4ade80;">></span> incoming_invitation
                    </p>
                    <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #fafafa; line-height: 1.3;">
                      You've been invited to join<br>
                      <span style="color: #c9a76c;">${institutionName}</span>
                    </h2>
                    <p style="margin: 0; font-size: 16px; color: #a3a3a3; line-height: 1.6;">
                      <strong style="color: #fafafa;">${inviterName}</strong> has invited you to collaborate on the ${institutionName} dashboard.
                    </p>
                  </td>
                </tr>

                <!-- Permissions Section -->
                <tr>
                  <td style="padding: 24px; background-color: #0a0a0a; border: 1px solid #333; border-radius: 8px; margin-bottom: 30px;">
                    <p style="margin: 0 0 16px 0; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px;">
                      <span style="color: #e879f9;">const</span> <span style="color: #c9a76c;">permissions</span> = [
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding-left: 20px;">
                      ${permissionsList}
                    </table>
                    <p style="margin: 8px 0 0 0; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 12px; color: #666;">
                      ];
                    </p>
                  </td>
                </tr>

                <!-- CTA Button -->
                <tr>
                  <td align="center" style="padding: 30px 0;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="border-radius: 8px; background: linear-gradient(135deg, #c9a76c 0%, #a88b4a 100%);">
                          <a href="${acceptUrl}" target="_blank" style="display: inline-block; padding: 16px 40px; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 14px; font-weight: 600; color: #0a0a0a; text-decoration: none; letter-spacing: 0.5px;">
                            <span style="color: #0a0a0a;">$</span> accept_invitation
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Expiration Notice -->
                <tr>
                  <td style="padding: 20px; background-color: rgba(250, 204, 21, 0.1); border: 1px solid #facc15; border-radius: 8px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td width="24" valign="top" style="padding-right: 12px;">
                          <span style="font-size: 18px;">&#9888;</span>
                        </td>
                        <td>
                          <p style="margin: 0; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 13px; color: #facc15;">
                            // Invitation expires in ${daysUntilExpiration} day${daysUntilExpiration !== 1 ? 's' : ''}
                          </p>
                          <p style="margin: 4px 0 0 0; font-size: 13px; color: #a3a3a3;">
                            Valid until: ${formattedExpiration}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #0a0a0a; border: 1px solid #333; border-top: none; border-radius: 0 0 12px 12px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <p style="margin: 0 0 8px 0; font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 12px; color: #666;">
                      <span style="color: #4ade80;">$</span> echo "Powered by One For All"
                    </p>
                    <p style="margin: 0 0 16px 0; font-size: 12px; color: #525252;">
                      Multi-tenant admissions management for South African institutions
                    </p>
                    <p style="margin: 0; font-size: 11px; color: #404040;">
                      If you didn't expect this invitation, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
`.trim()
}

/**
 * Generates the plain text email content for an invitation
 */
export function getInvitationEmailText(params: InvitationEmailParams): string {
  const { inviterName, institutionName, acceptUrl, expiresAt, permissions } = params
  const daysUntilExpiration = getDaysUntilExpiration(expiresAt)
  const formattedExpiration = formatExpirationDate(expiresAt)

  const permissionsList = permissions.map((p) => `  - ${p}`).join('\n')

  return `
================================================================================
                              ONE FOR ALL
              Admissions Management Platform for SA Institutions
================================================================================

You've been invited to join ${institutionName}
--------------------------------------------------------------------------------

${inviterName} has invited you to collaborate on the ${institutionName} dashboard.

Your Permissions:
${permissionsList}

--------------------------------------------------------------------------------

To accept this invitation, visit:
${acceptUrl}

--------------------------------------------------------------------------------

IMPORTANT: This invitation expires in ${daysUntilExpiration} day${daysUntilExpiration !== 1 ? 's' : ''}
Valid until: ${formattedExpiration}

--------------------------------------------------------------------------------

Powered by One For All
Multi-tenant admissions management for South African institutions

If you didn't expect this invitation, you can safely ignore this email.

================================================================================
`.trim()
}
