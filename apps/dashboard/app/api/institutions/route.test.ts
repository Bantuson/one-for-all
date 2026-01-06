import type { Mock } from 'vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'

// Mock Clerk auth and client
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
}))

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}))

import { auth, clerkClient } from '@clerk/nextjs/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

describe('GET /api/institutions', () => {
  const mockSingle = vi.fn()
  const mockEq = vi.fn()
  const mockSelect = vi.fn()
  const mockFrom = vi.fn()
  const mockSupabase = { from: mockFrom }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(createClient as unknown as Mock).mockResolvedValue(mockSupabase)
  })

  it('returns 401 if user is not authenticated', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: null })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 404 if user is not found in Supabase', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
    mockEq.mockReturnValue({ single: mockSingle })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('User not found')
  })

  it('returns 200 with institutions on success', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const mockUser = { id: 'user-uuid-123' }
    const mockInstitutions = [
      {
        id: 'inst-123',
        name: 'Test University',
        slug: 'test-university',
        type: 'university',
        contact_email: 'admin@test.edu',
        institution_members: [{ role: 'admin' }],
      },
      {
        id: 'inst-456',
        name: 'Test College',
        slug: 'test-college',
        type: 'college',
        contact_email: 'admin@college.edu',
        institution_members: [{ role: 'member' }],
      },
    ]

    // First call - get user
    const mockUserSingle = vi.fn().mockResolvedValue({ data: mockUser, error: null })
    const mockUserEq = vi.fn().mockReturnValue({ single: mockUserSingle })
    const mockUserSelect = vi.fn().mockReturnValue({ eq: mockUserEq })

    // Second call - get institutions
    const mockInstEq = vi.fn().mockResolvedValue({ data: mockInstitutions, error: null })
    const mockInstSelect = vi.fn().mockReturnValue({ eq: mockInstEq })

    let _callCount = 0
    mockFrom.mockImplementation((table: string) => {
      _callCount++
      if (table === 'users') {
        return { select: mockUserSelect }
      }
      if (table === 'institutions') {
        return { select: mockInstSelect }
      }
      return { select: mockSelect }
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.institutions).toEqual(mockInstitutions)
    expect(mockFrom).toHaveBeenCalledWith('users')
    expect(mockFrom).toHaveBeenCalledWith('institutions')
  })

  it('returns 500 when fetching institutions fails', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const mockUser = { id: 'user-uuid-123' }

    // First call - get user
    const mockUserSingle = vi.fn().mockResolvedValue({ data: mockUser, error: null })
    const mockUserEq = vi.fn().mockReturnValue({ single: mockUserSingle })
    const mockUserSelect = vi.fn().mockReturnValue({ eq: mockUserEq })

    // Second call - get institutions with error
    const mockInstEq = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Database error' },
    })
    const mockInstSelect = vi.fn().mockReturnValue({ eq: mockInstEq })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return { select: mockUserSelect }
      }
      if (table === 'institutions') {
        return { select: mockInstSelect }
      }
      return { select: mockSelect }
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch institutions')
  })
})

describe('POST /api/institutions', () => {
  const _mockServiceSingle = vi.fn()
  const _mockServiceSelect = vi.fn()
  const _mockServiceInsert = vi.fn()
  const _mockServiceEq = vi.fn()
  const mockServiceRpc = vi.fn()
  const mockServiceFrom = vi.fn()
  const mockServiceSupabase = {
    from: mockServiceFrom,
    rpc: mockServiceRpc,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(createServiceClient as unknown as Mock).mockReturnValue(mockServiceSupabase)
  })

  it('returns 401 if user is not authenticated', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: null })

    const request = new NextRequest('http://localhost:3000/api/institutions', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test University',
        type: 'university',
        contact_email: 'admin@test.edu',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 400 if missing required field: name', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const request = new NextRequest('http://localhost:3000/api/institutions', {
      method: 'POST',
      body: JSON.stringify({
        type: 'university',
        contact_email: 'admin@test.edu',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing required fields: name, type, contact_email')
  })

  it('returns 400 if missing required field: type', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const request = new NextRequest('http://localhost:3000/api/institutions', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test University',
        contact_email: 'admin@test.edu',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing required fields: name, type, contact_email')
  })

  it('returns 400 if missing required field: contact_email', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const request = new NextRequest('http://localhost:3000/api/institutions', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test University',
        type: 'university',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing required fields: name, type, contact_email')
  })

  it('returns 400 if institution type is invalid', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const request = new NextRequest('http://localhost:3000/api/institutions', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test University',
        type: 'invalid_type',
        contact_email: 'admin@test.edu',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe(
      'Invalid type. Must be one of: university, college, nsfas, bursary_provider'
    )
  })

  it('returns 201 with created institution on success', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const mockUser = { id: 'user-uuid-123' }
    const mockInstitution = {
      id: 'inst-123',
      name: 'Test University',
      slug: 'test-university',
      type: 'university',
      contact_email: 'admin@test.edu',
      contact_phone: null,
      website: null,
      created_by: 'user-uuid-123',
      created_at: '2024-01-01T00:00:00Z',
    }

    // Mock user lookup
    const mockUserSingle = vi.fn().mockResolvedValue({ data: mockUser, error: null })
    const mockUserEq = vi.fn().mockReturnValue({ single: mockUserSingle })
    const mockUserSelect = vi.fn().mockReturnValue({ eq: mockUserEq })

    // Mock institution creation
    const mockInstSingle = vi.fn().mockResolvedValue({ data: mockInstitution, error: null })
    const mockInstSelect = vi.fn().mockReturnValue({ single: mockInstSingle })
    const mockInstInsert = vi.fn().mockReturnValue({ select: mockInstSelect })

    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return { select: mockUserSelect }
      }
      if (table === 'institutions') {
        return { insert: mockInstInsert }
      }
      return {}
    })

    const request = new NextRequest('http://localhost:3000/api/institutions', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test University',
        type: 'university',
        contact_email: 'admin@test.edu',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.institution).toEqual(mockInstitution)
    expect(mockServiceFrom).toHaveBeenCalledWith('institutions')
    expect(mockInstInsert).toHaveBeenCalledWith({
      name: 'Test University',
      slug: 'test-university',
      type: 'university',
      contact_email: 'admin@test.edu',
      contact_phone: null,
      website: null,
      created_by: 'user-uuid-123',
    })
  })

  it('returns 201 with optional fields when provided', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const mockUser = { id: 'user-uuid-123' }
    const mockInstitution = {
      id: 'inst-123',
      name: 'Test University',
      slug: 'test-university',
      type: 'university',
      contact_email: 'admin@test.edu',
      contact_phone: '+27123456789',
      website: 'https://test.edu',
      created_by: 'user-uuid-123',
      created_at: '2024-01-01T00:00:00Z',
    }

    // Mock user lookup
    const mockUserSingle = vi.fn().mockResolvedValue({ data: mockUser, error: null })
    const mockUserEq = vi.fn().mockReturnValue({ single: mockUserSingle })
    const mockUserSelect = vi.fn().mockReturnValue({ eq: mockUserEq })

    // Mock institution creation
    const mockInstSingle = vi.fn().mockResolvedValue({ data: mockInstitution, error: null })
    const mockInstSelect = vi.fn().mockReturnValue({ single: mockInstSingle })
    const mockInstInsert = vi.fn().mockReturnValue({ select: mockInstSelect })

    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return { select: mockUserSelect }
      }
      if (table === 'institutions') {
        return { insert: mockInstInsert }
      }
      return {}
    })

    const request = new NextRequest('http://localhost:3000/api/institutions', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test University',
        type: 'university',
        contact_email: 'admin@test.edu',
        contact_phone: '+27123456789',
        website: 'https://test.edu',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.institution.contact_phone).toBe('+27123456789')
    expect(data.institution.website).toBe('https://test.edu')
  })

  it('returns 409 when institution with same name already exists', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const mockUser = { id: 'user-uuid-123' }

    // Mock user lookup
    const mockUserSingle = vi.fn().mockResolvedValue({ data: mockUser, error: null })
    const mockUserEq = vi.fn().mockReturnValue({ single: mockUserSingle })
    const mockUserSelect = vi.fn().mockReturnValue({ eq: mockUserEq })

    // Mock institution creation with duplicate error
    const mockInstSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    })
    const mockInstSelect = vi.fn().mockReturnValue({ single: mockInstSingle })
    const mockInstInsert = vi.fn().mockReturnValue({ select: mockInstSelect })

    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return { select: mockUserSelect }
      }
      if (table === 'institutions') {
        return { insert: mockInstInsert }
      }
      return {}
    })

    const request = new NextRequest('http://localhost:3000/api/institutions', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test University',
        type: 'university',
        contact_email: 'admin@test.edu',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toBe('An institution with this name already exists')
  })

  it('returns 500 when Supabase insert fails', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const mockUser = { id: 'user-uuid-123' }

    // Mock user lookup
    const mockUserSingle = vi.fn().mockResolvedValue({ data: mockUser, error: null })
    const mockUserEq = vi.fn().mockReturnValue({ single: mockUserSingle })
    const mockUserSelect = vi.fn().mockReturnValue({ eq: mockUserEq })

    // Mock institution creation with generic error
    const mockInstSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST500', message: 'Database error' },
    })
    const mockInstSelect = vi.fn().mockReturnValue({ single: mockInstSingle })
    const mockInstInsert = vi.fn().mockReturnValue({ select: mockInstSelect })

    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return { select: mockUserSelect }
      }
      if (table === 'institutions') {
        return { insert: mockInstInsert }
      }
      return {}
    })

    const request = new NextRequest('http://localhost:3000/api/institutions', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test University',
        type: 'university',
        contact_email: 'admin@test.edu',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to create institution')
  })

  it('syncs user from Clerk when not found in Supabase', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const mockClerkUser = {
      id: 'test-user-id',
      firstName: 'John',
      lastName: 'Doe',
      imageUrl: 'https://example.com/avatar.jpg',
      primaryEmailAddressId: 'email-1',
      primaryPhoneNumberId: 'phone-1',
      emailAddresses: [{ id: 'email-1', emailAddress: 'john@example.com' }],
      phoneNumbers: [{ id: 'phone-1', phoneNumber: '+27123456789' }],
    }

    const mockGetUser = vi.fn().mockResolvedValue(mockClerkUser)
    ;(clerkClient as unknown as Mock).mockResolvedValue({
      users: { getUser: mockGetUser },
    })

    const mockUser = { id: 'user-uuid-123' }
    const mockInstitution = {
      id: 'inst-123',
      name: 'Test University',
      slug: 'test-university',
      type: 'university',
      contact_email: 'admin@test.edu',
      created_by: 'user-uuid-123',
    }

    // First user lookup fails
    const mockUserSingleFail = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST116' },
    })
    const mockUserEqFail = vi.fn().mockReturnValue({ single: mockUserSingleFail })
    const mockUserSelectFail = vi.fn().mockReturnValue({ eq: mockUserEqFail })

    // RPC sync succeeds
    mockServiceRpc.mockResolvedValue({ data: 'user-uuid-123', error: null })

    // Second user lookup succeeds
    const mockUserSingleSuccess = vi.fn().mockResolvedValue({ data: mockUser, error: null })
    const mockUserEqSuccess = vi.fn().mockReturnValue({ single: mockUserSingleSuccess })
    const mockUserSelectSuccess = vi.fn().mockReturnValue({ eq: mockUserEqSuccess })

    // Institution creation succeeds
    const mockInstSingle = vi.fn().mockResolvedValue({ data: mockInstitution, error: null })
    const mockInstSelect = vi.fn().mockReturnValue({ single: mockInstSingle })
    const mockInstInsert = vi.fn().mockReturnValue({ select: mockInstSelect })

    let userCallCount = 0
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        userCallCount++
        if (userCallCount === 1) {
          return { select: mockUserSelectFail }
        }
        return { select: mockUserSelectSuccess }
      }
      if (table === 'institutions') {
        return { insert: mockInstInsert }
      }
      return {}
    })

    const request = new NextRequest('http://localhost:3000/api/institutions', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test University',
        type: 'university',
        contact_email: 'admin@test.edu',
      }),
    })

    const response = await POST(request)
    const _data = await response.json()

    expect(response.status).toBe(201)
    expect(mockServiceRpc).toHaveBeenCalledWith('sync_clerk_user', {
      p_clerk_user_id: 'test-user-id',
      p_email: 'john@example.com',
      p_first_name: 'John',
      p_last_name: 'Doe',
      p_avatar_url: 'https://example.com/avatar.jpg',
      p_phone: '+27123456789',
    })
  })

  it('returns 500 when request body is invalid JSON', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const request = new NextRequest('http://localhost:3000/api/institutions', {
      method: 'POST',
      body: 'invalid json',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('generates correct slug from institution name', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const mockUser = { id: 'user-uuid-123' }
    const mockInstitution = {
      id: 'inst-123',
      name: 'University of Pretoria (UP)',
      slug: 'university-of-pretoria-up',
      type: 'university',
      contact_email: 'admin@up.ac.za',
      created_by: 'user-uuid-123',
    }

    // Mock user lookup
    const mockUserSingle = vi.fn().mockResolvedValue({ data: mockUser, error: null })
    const mockUserEq = vi.fn().mockReturnValue({ single: mockUserSingle })
    const mockUserSelect = vi.fn().mockReturnValue({ eq: mockUserEq })

    // Mock institution creation
    const mockInstSingle = vi.fn().mockResolvedValue({ data: mockInstitution, error: null })
    const mockInstSelect = vi.fn().mockReturnValue({ single: mockInstSingle })
    const mockInstInsert = vi.fn().mockReturnValue({ select: mockInstSelect })

    mockServiceFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return { select: mockUserSelect }
      }
      if (table === 'institutions') {
        return { insert: mockInstInsert }
      }
      return {}
    })

    const request = new NextRequest('http://localhost:3000/api/institutions', {
      method: 'POST',
      body: JSON.stringify({
        name: 'University of Pretoria (UP)',
        type: 'university',
        contact_email: 'admin@up.ac.za',
      }),
    })

    const response = await POST(request)
    const _data = await response.json()

    expect(response.status).toBe(201)
    expect(mockInstInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'university-of-pretoria-up',
      })
    )
  })
})
