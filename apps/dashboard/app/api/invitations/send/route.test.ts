import type { Mock } from 'vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, PUT } from './route'

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

// Mock SendGrid email
vi.mock('@/lib/email/sendgrid', () => ({
  sendEmail: vi.fn(),
}))

// Mock email templates
vi.mock('@/lib/email/templates/invitation', () => ({
  getInvitationEmailHtml: vi.fn(() => '<html>Invitation Email</html>'),
  getInvitationEmailText: vi.fn(() => 'Invitation Email'),
}))

import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email/sendgrid'

describe('POST /api/invitations/send', () => {
  const mockEq = vi.fn().mockReturnValue({ data: null, error: null })
  const mockUpdate = vi.fn(() => ({ eq: mockEq }))
  const mockFrom = vi.fn(() => ({ update: mockUpdate }))
  const mockSupabase = { from: mockFrom }

  const validRequestBody = {
    invitation_id: 'inv-123',
    email: 'test@example.com',
    token: 'valid-token-123',
    institution_name: 'Test University',
    inviter_name: 'John Doe',
    permissions: ['view_applications', 'manage_team'],
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(createClient as unknown as Mock).mockReturnValue(mockSupabase)
    // Set environment variables
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
  })

  it('returns 401 if user is not authenticated', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: null })

    const request = new NextRequest('http://localhost:3000/api/invitations/send', {
      method: 'POST',
      body: JSON.stringify(validRequestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 400 if missing required field: invitation_id', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const { invitation_id: _invitation_id, ...bodyWithoutInvitationId } = validRequestBody

    const request = new NextRequest('http://localhost:3000/api/invitations/send', {
      method: 'POST',
      body: JSON.stringify(bodyWithoutInvitationId),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing required fields')
  })

  it('returns 400 if missing required field: email', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const { email: _email, ...bodyWithoutEmail } = validRequestBody

    const request = new NextRequest('http://localhost:3000/api/invitations/send', {
      method: 'POST',
      body: JSON.stringify(bodyWithoutEmail),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing required fields')
  })

  it('returns 400 if missing required field: token', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const { token: _token, ...bodyWithoutToken } = validRequestBody

    const request = new NextRequest('http://localhost:3000/api/invitations/send', {
      method: 'POST',
      body: JSON.stringify(bodyWithoutToken),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing required fields')
  })

  it('returns 400 if missing required field: institution_name', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const { institution_name: _institution_name, ...bodyWithoutInstitutionName } = validRequestBody

    const request = new NextRequest('http://localhost:3000/api/invitations/send', {
      method: 'POST',
      body: JSON.stringify(bodyWithoutInstitutionName),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing required fields')
  })

  it('returns 400 if missing required field: inviter_name', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const { inviter_name: _inviter_name, ...bodyWithoutInviterName } = validRequestBody

    const request = new NextRequest('http://localhost:3000/api/invitations/send', {
      method: 'POST',
      body: JSON.stringify(bodyWithoutInviterName),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing required fields')
  })

  it('returns 400 if email format is invalid', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const request = new NextRequest('http://localhost:3000/api/invitations/send', {
      method: 'POST',
      body: JSON.stringify({
        ...validRequestBody,
        email: 'invalid-email',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid email format')
  })

  it('returns 200 with success message when email is sent successfully', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })
    ;(sendEmail as unknown as Mock).mockResolvedValue({
      success: true,
      messageId: 'msg-123',
    })

    const request = new NextRequest('http://localhost:3000/api/invitations/send', {
      method: 'POST',
      body: JSON.stringify(validRequestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBe('Invitation email sent successfully')
    expect(data.messageId).toBe('msg-123')
    expect(sendEmail).toHaveBeenCalledWith({
      to: validRequestBody.email,
      subject: `You're invited to join ${validRequestBody.institution_name} on One For All`,
      html: '<html>Invitation Email</html>',
      text: 'Invitation Email',
    })
  })

  it('updates invitation record with email_sent_at timestamp after successful send', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })
    ;(sendEmail as unknown as Mock).mockResolvedValue({
      success: true,
      messageId: 'msg-123',
    })

    const request = new NextRequest('http://localhost:3000/api/invitations/send', {
      method: 'POST',
      body: JSON.stringify(validRequestBody),
    })

    await POST(request)

    expect(mockFrom).toHaveBeenCalledWith('institution_members')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        email_sent_at: expect.any(String),
        updated_at: expect.any(String),
      })
    )
    expect(mockEq).toHaveBeenCalledWith('id', validRequestBody.invitation_id)
  })

  it('returns 500 when email send fails', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })
    ;(sendEmail as unknown as Mock).mockResolvedValue({
      success: false,
      error: 'SMTP connection failed',
    })

    const request = new NextRequest('http://localhost:3000/api/invitations/send', {
      method: 'POST',
      body: JSON.stringify(validRequestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to send email: SMTP connection failed')
  })

  it('returns 500 when request body is invalid JSON', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const request = new NextRequest('http://localhost:3000/api/invitations/send', {
      method: 'POST',
      body: 'invalid json',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('handles email without permissions array', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })
    ;(sendEmail as unknown as Mock).mockResolvedValue({
      success: true,
      messageId: 'msg-456',
    })

    const { permissions: _permissions, ...bodyWithoutPermissions } = validRequestBody

    const request = new NextRequest('http://localhost:3000/api/invitations/send', {
      method: 'POST',
      body: JSON.stringify(bodyWithoutPermissions),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('handles email without expires_at', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })
    ;(sendEmail as unknown as Mock).mockResolvedValue({
      success: true,
      messageId: 'msg-789',
    })

    const { expires_at: _expires_at, ...bodyWithoutExpiry } = validRequestBody

    const request = new NextRequest('http://localhost:3000/api/invitations/send', {
      method: 'POST',
      body: JSON.stringify(bodyWithoutExpiry),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })
})

describe('PUT /api/invitations/send (resend)', () => {
  const validRequestBody = {
    invitation_id: 'inv-123',
    email: 'test@example.com',
    token: 'valid-token-123',
    institution_name: 'Test University',
    inviter_name: 'John Doe',
    permissions: ['view_applications'],
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')

    const mockEq = vi.fn().mockReturnValue({ data: null, error: null })
    const mockUpdate = vi.fn(() => ({ eq: mockEq }))
    const mockFrom = vi.fn(() => ({ update: mockUpdate }))
    const mockSupabase = { from: mockFrom }
    ;(createClient as unknown as Mock).mockReturnValue(mockSupabase)
  })

  it('uses same logic as POST for resending', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })
    ;(sendEmail as unknown as Mock).mockResolvedValue({
      success: true,
      messageId: 'msg-resend-123',
    })

    const request = new NextRequest('http://localhost:3000/api/invitations/send', {
      method: 'PUT',
      body: JSON.stringify(validRequestBody),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.messageId).toBe('msg-resend-123')
  })
})
