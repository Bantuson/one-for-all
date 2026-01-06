import type { Mock } from 'vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@supabase/supabase-js'

describe('GET /api/invitations/validate', () => {
  const mockSingle = vi.fn()
  const mockEq = vi.fn(() => ({ single: mockSingle }))
  const mockSelect = vi.fn(() => ({ eq: mockEq }))
  const mockFrom = vi.fn(() => ({ select: mockSelect }))
  const mockSupabase = { from: mockFrom }

  const validInvitation = {
    id: 'inv-123',
    institution_id: 'inst-456',
    invited_email: 'invitee@example.com',
    permissions: ['view_applications', 'manage_team'],
    role: 'admin',
    invited_by: 'user-789',
    invitation_status: 'pending',
    invitation_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    institutions: {
      id: 'inst-456',
      name: 'Test University',
      slug: 'test-university',
    },
    users: {
      first_name: 'John',
      last_name: 'Doe',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(createClient as unknown as Mock).mockReturnValue(mockSupabase)
    // Set environment variables
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key')
  })

  it('returns 400 if token is not provided', async () => {
    const request = new NextRequest('http://localhost:3000/api/invitations/validate')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.valid).toBe(false)
    expect(data.error).toBe('Token is required')
  })

  it('returns 404 if invitation is not found', async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'No rows found', code: 'PGRST116' },
    })

    const request = new NextRequest(
      'http://localhost:3000/api/invitations/validate?token=invalid-token'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.valid).toBe(false)
    expect(data.error).toBe('Invitation not found')
  })

  it('returns 400 if invitation has already been accepted', async () => {
    mockSingle.mockResolvedValue({
      data: {
        ...validInvitation,
        invitation_status: 'accepted',
      },
      error: null,
    })

    const request = new NextRequest(
      'http://localhost:3000/api/invitations/validate?token=valid-token'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.valid).toBe(false)
    expect(data.error).toBe('This invitation has already been used')
  })

  it('returns 400 if invitation has expired', async () => {
    mockSingle.mockResolvedValue({
      data: {
        ...validInvitation,
        invitation_expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      },
      error: null,
    })

    const request = new NextRequest(
      'http://localhost:3000/api/invitations/validate?token=valid-token'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.valid).toBe(false)
    expect(data.error).toBe('This invitation has expired')
  })

  it('returns valid invitation details on success', async () => {
    mockSingle.mockResolvedValue({
      data: validInvitation,
      error: null,
    })

    const request = new NextRequest(
      'http://localhost:3000/api/invitations/validate?token=valid-token'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.valid).toBe(true)
    expect(data.invitation).toEqual({
      id: 'inv-123',
      institution_id: 'inst-456',
      institution_name: 'Test University',
      institution_slug: 'test-university',
      invited_email: 'invitee@example.com',
      permissions: ['view_applications', 'manage_team'],
      role: 'admin',
      inviter_name: 'John Doe',
      expires_at: validInvitation.invitation_expires_at,
      status: 'valid',
    })
  })

  it('queries Supabase with correct parameters', async () => {
    mockSingle.mockResolvedValue({
      data: validInvitation,
      error: null,
    })

    const request = new NextRequest(
      'http://localhost:3000/api/invitations/validate?token=test-token-123'
    )

    await GET(request)

    expect(mockFrom).toHaveBeenCalledWith('institution_members')
    expect(mockSelect).toHaveBeenCalledWith(
      expect.stringContaining('id')
    )
    expect(mockEq).toHaveBeenCalledWith('invitation_token', 'test-token-123')
  })

  it('handles invitation without expiry date', async () => {
    mockSingle.mockResolvedValue({
      data: {
        ...validInvitation,
        invitation_expires_at: null,
      },
      error: null,
    })

    const request = new NextRequest(
      'http://localhost:3000/api/invitations/validate?token=valid-token'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.valid).toBe(true)
    expect(data.invitation.expires_at).toBeNull()
  })

  it('handles invitation without inviter details', async () => {
    mockSingle.mockResolvedValue({
      data: {
        ...validInvitation,
        users: null,
      },
      error: null,
    })

    const request = new NextRequest(
      'http://localhost:3000/api/invitations/validate?token=valid-token'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.valid).toBe(true)
    expect(data.invitation.inviter_name).toBeNull()
  })

  it('handles invitation with partial inviter name (first name only)', async () => {
    mockSingle.mockResolvedValue({
      data: {
        ...validInvitation,
        users: {
          first_name: 'Jane',
          last_name: null,
        },
      },
      error: null,
    })

    const request = new NextRequest(
      'http://localhost:3000/api/invitations/validate?token=valid-token'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.invitation.inviter_name).toBe('Jane')
  })

  it('handles invitation with null permissions', async () => {
    mockSingle.mockResolvedValue({
      data: {
        ...validInvitation,
        permissions: null,
      },
      error: null,
    })

    const request = new NextRequest(
      'http://localhost:3000/api/invitations/validate?token=valid-token'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.invitation.permissions).toEqual([])
  })

  it('returns 500 on internal server error', async () => {
    ;(createClient as unknown as Mock).mockImplementation(() => {
      throw new Error('Database connection failed')
    })

    const request = new NextRequest(
      'http://localhost:3000/api/invitations/validate?token=valid-token'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.valid).toBe(false)
    expect(data.error).toBe('Internal server error')
  })

  it('handles institution with missing slug', async () => {
    mockSingle.mockResolvedValue({
      data: {
        ...validInvitation,
        institutions: {
          id: 'inst-456',
          name: 'Test University',
          slug: null,
        },
      },
      error: null,
    })

    const request = new NextRequest(
      'http://localhost:3000/api/invitations/validate?token=valid-token'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.invitation.institution_slug).toBe('unknown')
  })

  it('handles invitation with empty institution', async () => {
    mockSingle.mockResolvedValue({
      data: {
        ...validInvitation,
        institutions: null,
      },
      error: null,
    })

    const request = new NextRequest(
      'http://localhost:3000/api/invitations/validate?token=valid-token'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.invitation.institution_name).toBe('Unknown Institution')
    expect(data.invitation.institution_slug).toBe('unknown')
  })
})
