import type { Mock } from 'vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}))

import { auth } from '@clerk/nextjs/server'
import { createServiceClient } from '@/lib/supabase/server'

describe('POST /api/faculties', () => {
  const mockSingle = vi.fn()
  const mockSelect = vi.fn(() => ({ single: mockSingle }))
  const mockInsert = vi.fn(() => ({ select: mockSelect }))
  const mockFrom = vi.fn(() => ({ insert: mockInsert }))
  const mockSupabase = { from: mockFrom }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(createServiceClient as Mock).mockReturnValue(mockSupabase)
  })

  it('returns 401 if user is not authenticated', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: null })

    const request = new NextRequest('http://localhost:3000/api/faculties', {
      method: 'POST',
      body: JSON.stringify({
        institution_id: 'inst-123',
        campus_id: 'campus-123',
        name: 'Faculty of Science',
        code: 'SCI',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 400 if missing required field: institution_id', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const request = new NextRequest('http://localhost:3000/api/faculties', {
      method: 'POST',
      body: JSON.stringify({
        campus_id: 'campus-123',
        name: 'Faculty of Science',
        code: 'SCI',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing required fields: institution_id, campus_id, name, code')
  })

  it('returns 400 if missing required field: campus_id', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const request = new NextRequest('http://localhost:3000/api/faculties', {
      method: 'POST',
      body: JSON.stringify({
        institution_id: 'inst-123',
        name: 'Faculty of Science',
        code: 'SCI',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing required fields: institution_id, campus_id, name, code')
  })

  it('returns 400 if missing required field: name', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const request = new NextRequest('http://localhost:3000/api/faculties', {
      method: 'POST',
      body: JSON.stringify({
        institution_id: 'inst-123',
        campus_id: 'campus-123',
        code: 'SCI',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing required fields: institution_id, campus_id, name, code')
  })

  it('returns 400 if missing required field: code', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const request = new NextRequest('http://localhost:3000/api/faculties', {
      method: 'POST',
      body: JSON.stringify({
        institution_id: 'inst-123',
        campus_id: 'campus-123',
        name: 'Faculty of Science',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing required fields: institution_id, campus_id, name, code')
  })

  it('returns 201 with created faculty on success', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const mockFaculty = {
      id: 'faculty-123',
      institution_id: 'inst-123',
      campus_id: 'campus-123',
      name: 'Faculty of Science',
      code: 'SCI',
      description: '',
      created_at: '2024-01-01T00:00:00Z',
    }

    mockSingle.mockResolvedValue({ data: mockFaculty, error: null })

    const request = new NextRequest('http://localhost:3000/api/faculties', {
      method: 'POST',
      body: JSON.stringify({
        institution_id: 'inst-123',
        campus_id: 'campus-123',
        name: 'Faculty of Science',
        code: 'SCI',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.faculty).toEqual(mockFaculty)
    expect(mockFrom).toHaveBeenCalledWith('faculties')
    expect(mockInsert).toHaveBeenCalledWith({
      institution_id: 'inst-123',
      campus_id: 'campus-123',
      name: 'Faculty of Science',
      code: 'SCI',
      description: '',
    })
  })

  it('returns 201 with description when provided', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const mockFaculty = {
      id: 'faculty-123',
      institution_id: 'inst-123',
      campus_id: 'campus-123',
      name: 'Faculty of Science',
      code: 'SCI',
      description: 'The Faculty of Science offers undergraduate and postgraduate programs.',
      created_at: '2024-01-01T00:00:00Z',
    }

    mockSingle.mockResolvedValue({ data: mockFaculty, error: null })

    const request = new NextRequest('http://localhost:3000/api/faculties', {
      method: 'POST',
      body: JSON.stringify({
        institution_id: 'inst-123',
        campus_id: 'campus-123',
        name: 'Faculty of Science',
        code: 'SCI',
        description: 'The Faculty of Science offers undergraduate and postgraduate programs.',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.faculty.description).toBe(
      'The Faculty of Science offers undergraduate and postgraduate programs.'
    )
  })

  it('returns 500 when Supabase insert fails', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Database error', code: 'PGRST116' },
    })

    const request = new NextRequest('http://localhost:3000/api/faculties', {
      method: 'POST',
      body: JSON.stringify({
        institution_id: 'inst-123',
        campus_id: 'campus-123',
        name: 'Faculty of Science',
        code: 'SCI',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to create faculty')
  })

  it('returns 500 when request body is invalid JSON', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const request = new NextRequest('http://localhost:3000/api/faculties', {
      method: 'POST',
      body: 'invalid json',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})
