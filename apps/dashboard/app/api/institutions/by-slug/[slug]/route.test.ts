import type { Mock } from 'vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

describe('GET /api/institutions/by-slug/[slug]', () => {
  const mockSingle = vi.fn()
  const mockEq = vi.fn()
  const mockSelect = vi.fn()
  const mockFrom = vi.fn()
  const mockSupabase = { from: mockFrom }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(createClient as unknown as Mock).mockReturnValue(mockSupabase)
    // Mock environment variables
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key')
  })

  it('returns 401 if user is not authenticated', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: null })

    const request = new NextRequest(
      'http://localhost:3000/api/institutions/by-slug/test-university'
    )
    const routeParams = { params: Promise.resolve({ slug: 'test-university' }) }

    const response = await GET(request, routeParams)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 404 when institution is not found', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
    mockEq.mockReturnValue({ single: mockSingle })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })

    const request = new NextRequest(
      'http://localhost:3000/api/institutions/by-slug/nonexistent'
    )
    const routeParams = { params: Promise.resolve({ slug: 'nonexistent' }) }

    const response = await GET(request, routeParams)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Institution not found')
  })

  it('returns 404 when user is not found in Supabase', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const mockInstitution = {
      id: 'inst-123',
      name: 'Test University',
      slug: 'test-university',
      type: 'university',
      contact_email: 'admin@test.edu',
      website: 'https://test.edu',
      created_by: 'other-user-uuid',
      clerk_org_id: null,
    }

    // First call - institution lookup succeeds
    const mockInstSingle = vi.fn().mockResolvedValue({ data: mockInstitution, error: null })
    const mockInstEq = vi.fn().mockReturnValue({ single: mockInstSingle })
    const mockInstSelect = vi.fn().mockReturnValue({ eq: mockInstEq })

    // Second call - user lookup fails
    const mockUserSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const mockUserEq = vi.fn().mockReturnValue({ single: mockUserSingle })
    const mockUserSelect = vi.fn().mockReturnValue({ eq: mockUserEq })

    let _callCount = 0
    mockFrom.mockImplementation((table: string) => {
      _callCount++
      if (table === 'institutions') {
        return { select: mockInstSelect }
      }
      if (table === 'users') {
        return { select: mockUserSelect }
      }
      return { select: mockSelect }
    })

    const request = new NextRequest(
      'http://localhost:3000/api/institutions/by-slug/test-university'
    )
    const routeParams = { params: Promise.resolve({ slug: 'test-university' }) }

    const response = await GET(request, routeParams)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('User not found')
  })

  it('returns 200 with institution when user is the owner', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const mockInstitution = {
      id: 'inst-123',
      name: 'Test University',
      slug: 'test-university',
      type: 'university',
      contact_email: 'admin@test.edu',
      website: 'https://test.edu',
      created_by: 'user-uuid-123',
      clerk_org_id: null,
    }

    const mockUser = { id: 'user-uuid-123' }

    // Institution lookup
    const mockInstSingle = vi.fn().mockResolvedValue({ data: mockInstitution, error: null })
    const mockInstEq = vi.fn().mockReturnValue({ single: mockInstSingle })
    const mockInstSelect = vi.fn().mockReturnValue({ eq: mockInstEq })

    // User lookup
    const mockUserSingle = vi.fn().mockResolvedValue({ data: mockUser, error: null })
    const mockUserEq = vi.fn().mockReturnValue({ single: mockUserSingle })
    const mockUserSelect = vi.fn().mockReturnValue({ eq: mockUserEq })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'institutions') {
        return { select: mockInstSelect }
      }
      if (table === 'users') {
        return { select: mockUserSelect }
      }
      return { select: mockSelect }
    })

    const request = new NextRequest(
      'http://localhost:3000/api/institutions/by-slug/test-university'
    )
    const routeParams = { params: Promise.resolve({ slug: 'test-university' }) }

    const response = await GET(request, routeParams)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockInstitution)
    expect(mockFrom).toHaveBeenCalledWith('institutions')
    expect(mockInstEq).toHaveBeenCalledWith('slug', 'test-university')
  })

  it('returns 200 with institution when user is an accepted member', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const mockInstitution = {
      id: 'inst-123',
      name: 'Test University',
      slug: 'test-university',
      type: 'university',
      contact_email: 'admin@test.edu',
      website: 'https://test.edu',
      created_by: 'other-user-uuid',
      clerk_org_id: null,
    }

    const mockUser = { id: 'user-uuid-123' }
    const mockMembership = { id: 'member-123' }

    // Institution lookup
    const mockInstSingle = vi.fn().mockResolvedValue({ data: mockInstitution, error: null })
    const mockInstEq = vi.fn().mockReturnValue({ single: mockInstSingle })
    const mockInstSelect = vi.fn().mockReturnValue({ eq: mockInstEq })

    // User lookup
    const mockUserSingle = vi.fn().mockResolvedValue({ data: mockUser, error: null })
    const mockUserEq = vi.fn().mockReturnValue({ single: mockUserSingle })
    const mockUserSelect = vi.fn().mockReturnValue({ eq: mockUserEq })

    // Membership lookup
    const mockMemberSingle = vi.fn().mockResolvedValue({ data: mockMembership, error: null })
    const mockMemberEq3 = vi.fn().mockReturnValue({ single: mockMemberSingle })
    const mockMemberEq2 = vi.fn().mockReturnValue({ eq: mockMemberEq3 })
    const mockMemberEq1 = vi.fn().mockReturnValue({ eq: mockMemberEq2 })
    const mockMemberSelect = vi.fn().mockReturnValue({ eq: mockMemberEq1 })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'institutions') {
        return { select: mockInstSelect }
      }
      if (table === 'users') {
        return { select: mockUserSelect }
      }
      if (table === 'institution_members') {
        return { select: mockMemberSelect }
      }
      return { select: mockSelect }
    })

    const request = new NextRequest(
      'http://localhost:3000/api/institutions/by-slug/test-university'
    )
    const routeParams = { params: Promise.resolve({ slug: 'test-university' }) }

    const response = await GET(request, routeParams)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockInstitution)
    expect(mockFrom).toHaveBeenCalledWith('institution_members')
    expect(mockMemberEq1).toHaveBeenCalledWith('institution_id', 'inst-123')
    expect(mockMemberEq2).toHaveBeenCalledWith('user_id', 'user-uuid-123')
    expect(mockMemberEq3).toHaveBeenCalledWith('invitation_status', 'accepted')
  })

  it('returns 403 when user is not owner or member', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const mockInstitution = {
      id: 'inst-123',
      name: 'Test University',
      slug: 'test-university',
      type: 'university',
      contact_email: 'admin@test.edu',
      website: 'https://test.edu',
      created_by: 'other-user-uuid',
      clerk_org_id: null,
    }

    const mockUser = { id: 'user-uuid-123' }

    // Institution lookup
    const mockInstSingle = vi.fn().mockResolvedValue({ data: mockInstitution, error: null })
    const mockInstEq = vi.fn().mockReturnValue({ single: mockInstSingle })
    const mockInstSelect = vi.fn().mockReturnValue({ eq: mockInstEq })

    // User lookup
    const mockUserSingle = vi.fn().mockResolvedValue({ data: mockUser, error: null })
    const mockUserEq = vi.fn().mockReturnValue({ single: mockUserSingle })
    const mockUserSelect = vi.fn().mockReturnValue({ eq: mockUserEq })

    // Membership lookup - no membership found
    const mockMemberSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const mockMemberEq3 = vi.fn().mockReturnValue({ single: mockMemberSingle })
    const mockMemberEq2 = vi.fn().mockReturnValue({ eq: mockMemberEq3 })
    const mockMemberEq1 = vi.fn().mockReturnValue({ eq: mockMemberEq2 })
    const mockMemberSelect = vi.fn().mockReturnValue({ eq: mockMemberEq1 })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'institutions') {
        return { select: mockInstSelect }
      }
      if (table === 'users') {
        return { select: mockUserSelect }
      }
      if (table === 'institution_members') {
        return { select: mockMemberSelect }
      }
      return { select: mockSelect }
    })

    const request = new NextRequest(
      'http://localhost:3000/api/institutions/by-slug/test-university'
    )
    const routeParams = { params: Promise.resolve({ slug: 'test-university' }) }

    const response = await GET(request, routeParams)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Access denied')
  })

  it('returns 500 on internal server error', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    // Simulate error by throwing
    mockFrom.mockImplementation(() => {
      throw new Error('Database connection error')
    })

    const request = new NextRequest(
      'http://localhost:3000/api/institutions/by-slug/test-university'
    )
    const routeParams = { params: Promise.resolve({ slug: 'test-university' }) }

    const response = await GET(request, routeParams)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('correctly queries institution with the provided slug', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const mockInstitution = {
      id: 'inst-456',
      name: 'Another University',
      slug: 'another-university',
      type: 'college',
      contact_email: 'admin@another.edu',
      website: null,
      created_by: 'user-uuid-123',
      clerk_org_id: 'org_123',
    }

    const mockUser = { id: 'user-uuid-123' }

    // Institution lookup
    const mockInstSingle = vi.fn().mockResolvedValue({ data: mockInstitution, error: null })
    const mockInstEq = vi.fn().mockReturnValue({ single: mockInstSingle })
    const mockInstSelect = vi.fn().mockReturnValue({ eq: mockInstEq })

    // User lookup
    const mockUserSingle = vi.fn().mockResolvedValue({ data: mockUser, error: null })
    const mockUserEq = vi.fn().mockReturnValue({ single: mockUserSingle })
    const mockUserSelect = vi.fn().mockReturnValue({ eq: mockUserEq })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'institutions') {
        return { select: mockInstSelect }
      }
      if (table === 'users') {
        return { select: mockUserSelect }
      }
      return { select: mockSelect }
    })

    const request = new NextRequest(
      'http://localhost:3000/api/institutions/by-slug/another-university'
    )
    const routeParams = { params: Promise.resolve({ slug: 'another-university' }) }

    const response = await GET(request, routeParams)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.slug).toBe('another-university')
    expect(data.type).toBe('college')
    expect(data.clerk_org_id).toBe('org_123')
    expect(mockInstSelect).toHaveBeenCalledWith(
      'id, name, slug, type, contact_email, website, created_by, clerk_org_id'
    )
    expect(mockInstEq).toHaveBeenCalledWith('slug', 'another-university')
  })
})
