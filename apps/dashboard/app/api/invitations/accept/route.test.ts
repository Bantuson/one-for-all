import type { Mock } from 'vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

// Mock Clerk client
vi.mock('@clerk/nextjs/server', () => ({
  clerkClient: vi.fn(),
}))

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

import { clerkClient } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

describe('POST /api/invitations/accept', () => {
  // Mock Supabase chain methods
  const mockRpc = vi.fn()
  const mockUpdateEq = vi.fn()
  const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }))
  const mockSelectSingle = vi.fn()
  const mockSelectEq = vi.fn(() => ({ single: mockSelectSingle }))
  const mockSelect = vi.fn(() => ({ eq: mockSelectEq }))
  const mockFrom = vi.fn((table: string) => {
    if (table === 'institution_members') {
      return { select: mockSelect, update: mockUpdate }
    }
    if (table === 'users') {
      return { select: mockSelect }
    }
    return { select: mockSelect }
  })
  const mockSupabase = {
    from: mockFrom,
    rpc: mockRpc,
  }

  // Mock Clerk user
  const mockClerkUser = {
    id: 'clerk-user-123',
    firstName: 'Jane',
    lastName: 'Smith',
    imageUrl: 'https://example.com/avatar.jpg',
    emailAddresses: [
      {
        id: 'email-123',
        emailAddress: 'invitee@example.com',
      },
    ],
    primaryEmailAddressId: 'email-123',
    phoneNumbers: [
      {
        id: 'phone-123',
        phoneNumber: '+27123456789',
      },
    ],
    primaryPhoneNumberId: 'phone-123',
  }

  const mockGetUser = vi.fn()
  const mockCreateOrganizationMembership = vi.fn()
  const mockClerkClientInstance = {
    users: { getUser: mockGetUser },
    organizations: { createOrganizationMembership: mockCreateOrganizationMembership },
  }

  const validInvitation = {
    id: 'inv-123',
    institution_id: 'inst-456',
    invited_email: 'invitee@example.com',
    permissions: ['view_applications', 'admin_access'],
    role: 'admin',
    invitation_status: 'pending',
    invitation_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    institutions: {
      id: 'inst-456',
      name: 'Test University',
      slug: 'test-university',
      clerk_org_id: 'org_123',
    },
  }

  const validRequestBody = {
    token: 'valid-token-123',
    clerk_user_id: 'clerk-user-123',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(createClient as unknown as Mock).mockReturnValue(mockSupabase)
    ;(clerkClient as Mock).mockResolvedValue(mockClerkClientInstance)
    mockGetUser.mockResolvedValue(mockClerkUser)
    // Set environment variables
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key')
  })

  it('returns 400 if token is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify({ clerk_user_id: 'user-123' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Token and clerk_user_id are required')
  })

  it('returns 400 if clerk_user_id is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify({ token: 'valid-token' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Token and clerk_user_id are required')
  })

  it('returns 404 if invitation is not found', async () => {
    mockSelectSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'No rows found', code: 'PGRST116' },
    })

    const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify(validRequestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Invitation not found')
  })

  it('returns 400 if invitation has already been accepted', async () => {
    mockSelectSingle.mockResolvedValueOnce({
      data: {
        ...validInvitation,
        invitation_status: 'accepted',
      },
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify(validRequestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Invitation already accepted')
  })

  it('returns 400 if invitation has expired', async () => {
    mockSelectSingle.mockResolvedValueOnce({
      data: {
        ...validInvitation,
        invitation_expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
      },
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify(validRequestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Invitation has expired')
  })

  it('returns 403 if email does not match invitation', async () => {
    mockSelectSingle.mockResolvedValueOnce({
      data: {
        ...validInvitation,
        invited_email: 'different@example.com',
      },
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify(validRequestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Email does not match invitation')
  })

  it('returns 200 on successful acceptance with existing user', async () => {
    // First call: get invitation
    mockSelectSingle.mockResolvedValueOnce({
      data: validInvitation,
      error: null,
    })
    // Second call: get existing user
    mockSelectSingle.mockResolvedValueOnce({
      data: { id: 'db-user-123' },
      error: null,
    })
    // Update call
    mockUpdateEq.mockResolvedValueOnce({
      data: null,
      error: null,
    })
    // Clerk org membership
    mockCreateOrganizationMembership.mockResolvedValueOnce({})

    const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify(validRequestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.institution).toEqual({
      id: 'inst-456',
      name: 'Test University',
      slug: 'test-university',
    })
  })

  it('creates new user in Supabase if user does not exist', async () => {
    // First call: get invitation
    mockSelectSingle.mockResolvedValueOnce({
      data: validInvitation,
      error: null,
    })
    // Second call: user not found
    mockSelectSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'No rows found', code: 'PGRST116' },
    })
    // RPC sync user
    mockRpc.mockResolvedValueOnce({
      data: 'db-user-new',
      error: null,
    })
    // Third call: get synced user
    mockSelectSingle.mockResolvedValueOnce({
      data: { id: 'db-user-new' },
      error: null,
    })
    // Update call
    mockUpdateEq.mockResolvedValueOnce({
      data: null,
      error: null,
    })
    // Clerk org membership
    mockCreateOrganizationMembership.mockResolvedValueOnce({})

    const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify(validRequestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('sync_clerk_user', {
      p_clerk_user_id: 'clerk-user-123',
      p_email: 'invitee@example.com',
      p_first_name: 'Jane',
      p_last_name: 'Smith',
      p_avatar_url: 'https://example.com/avatar.jpg',
      p_phone: '+27123456789',
    })
  })

  it('returns 500 if user sync fails', async () => {
    // First call: get invitation
    mockSelectSingle.mockResolvedValueOnce({
      data: validInvitation,
      error: null,
    })
    // Second call: user not found
    mockSelectSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'No rows found', code: 'PGRST116' },
    })
    // RPC sync user fails
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'RPC error' },
    })

    const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify(validRequestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to sync user')
  })

  it('returns 500 if invitation update fails', async () => {
    // First call: get invitation
    mockSelectSingle.mockResolvedValueOnce({
      data: validInvitation,
      error: null,
    })
    // Second call: get existing user
    mockSelectSingle.mockResolvedValueOnce({
      data: { id: 'db-user-123' },
      error: null,
    })
    // Update fails
    mockUpdateEq.mockResolvedValueOnce({
      data: null,
      error: { message: 'Update failed' },
    })

    const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify(validRequestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to accept invitation')
  })

  it('adds user to Clerk organization with admin role if admin_access permission', async () => {
    // First call: get invitation
    mockSelectSingle.mockResolvedValueOnce({
      data: validInvitation, // Has admin_access permission
      error: null,
    })
    // Second call: get existing user
    mockSelectSingle.mockResolvedValueOnce({
      data: { id: 'db-user-123' },
      error: null,
    })
    // Update call
    mockUpdateEq.mockResolvedValueOnce({
      data: null,
      error: null,
    })
    // Clerk org membership
    mockCreateOrganizationMembership.mockResolvedValueOnce({})

    const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify(validRequestBody),
    })

    await POST(request)

    expect(mockCreateOrganizationMembership).toHaveBeenCalledWith({
      organizationId: 'org_123',
      userId: 'clerk-user-123',
      role: 'org:admin',
    })
  })

  it('adds user to Clerk organization with member role if no admin_access permission', async () => {
    // First call: get invitation without admin_access
    mockSelectSingle.mockResolvedValueOnce({
      data: {
        ...validInvitation,
        permissions: ['view_applications'], // No admin_access
      },
      error: null,
    })
    // Second call: get existing user
    mockSelectSingle.mockResolvedValueOnce({
      data: { id: 'db-user-123' },
      error: null,
    })
    // Update call
    mockUpdateEq.mockResolvedValueOnce({
      data: null,
      error: null,
    })
    // Clerk org membership
    mockCreateOrganizationMembership.mockResolvedValueOnce({})

    const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify(validRequestBody),
    })

    await POST(request)

    expect(mockCreateOrganizationMembership).toHaveBeenCalledWith({
      organizationId: 'org_123',
      userId: 'clerk-user-123',
      role: 'org:member',
    })
  })

  it('succeeds even if Clerk org membership creation fails', async () => {
    // First call: get invitation
    mockSelectSingle.mockResolvedValueOnce({
      data: validInvitation,
      error: null,
    })
    // Second call: get existing user
    mockSelectSingle.mockResolvedValueOnce({
      data: { id: 'db-user-123' },
      error: null,
    })
    // Update call
    mockUpdateEq.mockResolvedValueOnce({
      data: null,
      error: null,
    })
    // Clerk org membership fails
    mockCreateOrganizationMembership.mockRejectedValueOnce(new Error('Clerk API error'))

    const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify(validRequestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    // Should still succeed since DB was updated
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('skips Clerk org membership if no clerk_org_id', async () => {
    // First call: get invitation without clerk_org_id
    mockSelectSingle.mockResolvedValueOnce({
      data: {
        ...validInvitation,
        institutions: {
          ...validInvitation.institutions,
          clerk_org_id: null,
        },
      },
      error: null,
    })
    // Second call: get existing user
    mockSelectSingle.mockResolvedValueOnce({
      data: { id: 'db-user-123' },
      error: null,
    })
    // Update call
    mockUpdateEq.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify(validRequestBody),
    })

    await POST(request)

    expect(mockCreateOrganizationMembership).not.toHaveBeenCalled()
  })

  it('returns 500 on invalid JSON body', async () => {
    const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
      method: 'POST',
      body: 'invalid json',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Internal server error')
  })

  it('handles invitation without expiry date', async () => {
    // First call: get invitation without expiry
    mockSelectSingle.mockResolvedValueOnce({
      data: {
        ...validInvitation,
        invitation_expires_at: null,
      },
      error: null,
    })
    // Second call: get existing user
    mockSelectSingle.mockResolvedValueOnce({
      data: { id: 'db-user-123' },
      error: null,
    })
    // Update call
    mockUpdateEq.mockResolvedValueOnce({
      data: null,
      error: null,
    })
    // Clerk org membership
    mockCreateOrganizationMembership.mockResolvedValueOnce({})

    const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify(validRequestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('updates invitation record with correct fields on accept', async () => {
    // First call: get invitation
    mockSelectSingle.mockResolvedValueOnce({
      data: validInvitation,
      error: null,
    })
    // Second call: get existing user
    mockSelectSingle.mockResolvedValueOnce({
      data: { id: 'db-user-123' },
      error: null,
    })
    // Update call
    mockUpdateEq.mockResolvedValueOnce({
      data: null,
      error: null,
    })
    // Clerk org membership
    mockCreateOrganizationMembership.mockResolvedValueOnce({})

    const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify(validRequestBody),
    })

    await POST(request)

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'db-user-123',
        invitation_status: 'accepted',
        invitation_accepted_at: expect.any(String),
        updated_at: expect.any(String),
      })
    )
    expect(mockUpdateEq).toHaveBeenCalledWith('id', 'inv-123')
  })

  it('returns 500 if fetching synced user fails', async () => {
    // First call: get invitation
    mockSelectSingle.mockResolvedValueOnce({
      data: validInvitation,
      error: null,
    })
    // Second call: user not found
    mockSelectSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'No rows found', code: 'PGRST116' },
    })
    // RPC sync user succeeds
    mockRpc.mockResolvedValueOnce({
      data: 'db-user-new',
      error: null,
    })
    // Third call: fetching synced user fails
    mockSelectSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Fetch failed' },
    })

    const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify(validRequestBody),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to create user record')
  })
})
