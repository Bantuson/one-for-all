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

describe('POST /api/courses', () => {
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

    const request = new NextRequest('http://localhost:3000/api/courses', {
      method: 'POST',
      body: JSON.stringify({
        institution_id: 'inst-123',
        faculty_id: 'faculty-123',
        name: 'Computer Science',
        code: 'CS101',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 400 if missing required field: institution_id', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const request = new NextRequest('http://localhost:3000/api/courses', {
      method: 'POST',
      body: JSON.stringify({
        faculty_id: 'faculty-123',
        name: 'Computer Science',
        code: 'CS101',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing required fields: institution_id, faculty_id, name, code')
  })

  it('returns 400 if missing required field: faculty_id', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const request = new NextRequest('http://localhost:3000/api/courses', {
      method: 'POST',
      body: JSON.stringify({
        institution_id: 'inst-123',
        name: 'Computer Science',
        code: 'CS101',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing required fields: institution_id, faculty_id, name, code')
  })

  it('returns 400 if missing required field: name', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const request = new NextRequest('http://localhost:3000/api/courses', {
      method: 'POST',
      body: JSON.stringify({
        institution_id: 'inst-123',
        faculty_id: 'faculty-123',
        code: 'CS101',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing required fields: institution_id, faculty_id, name, code')
  })

  it('returns 400 if missing required field: code', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const request = new NextRequest('http://localhost:3000/api/courses', {
      method: 'POST',
      body: JSON.stringify({
        institution_id: 'inst-123',
        faculty_id: 'faculty-123',
        name: 'Computer Science',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing required fields: institution_id, faculty_id, name, code')
  })

  it('returns 201 with created course on success', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const mockCourse = {
      id: 'course-123',
      institution_id: 'inst-123',
      faculty_id: 'faculty-123',
      campus_id: undefined,
      name: 'Computer Science',
      code: 'CS101',
      requirements: {},
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
    }

    mockSingle.mockResolvedValue({ data: mockCourse, error: null })

    const request = new NextRequest('http://localhost:3000/api/courses', {
      method: 'POST',
      body: JSON.stringify({
        institution_id: 'inst-123',
        faculty_id: 'faculty-123',
        name: 'Computer Science',
        code: 'CS101',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.course).toEqual(mockCourse)
    expect(mockFrom).toHaveBeenCalledWith('courses')
    expect(mockInsert).toHaveBeenCalledWith({
      institution_id: 'inst-123',
      faculty_id: 'faculty-123',
      campus_id: undefined,
      name: 'Computer Science',
      code: 'CS101',
      requirements: {},
      status: 'active',
    })
  })

  it('returns 201 with optional fields when provided', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const mockCourse = {
      id: 'course-123',
      institution_id: 'inst-123',
      faculty_id: 'faculty-123',
      campus_id: 'campus-123',
      name: 'Computer Science',
      code: 'CS101',
      requirements: { math: 'Level 5', english: 'Level 4' },
      status: 'draft',
      created_at: '2024-01-01T00:00:00Z',
    }

    mockSingle.mockResolvedValue({ data: mockCourse, error: null })

    const request = new NextRequest('http://localhost:3000/api/courses', {
      method: 'POST',
      body: JSON.stringify({
        institution_id: 'inst-123',
        faculty_id: 'faculty-123',
        campus_id: 'campus-123',
        name: 'Computer Science',
        code: 'CS101',
        requirements: { math: 'Level 5', english: 'Level 4' },
        status: 'draft',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.course.campus_id).toBe('campus-123')
    expect(data.course.requirements).toEqual({ math: 'Level 5', english: 'Level 4' })
    expect(data.course.status).toBe('draft')
  })

  it('returns 500 when Supabase insert fails', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Database error', code: 'PGRST116' },
    })

    const request = new NextRequest('http://localhost:3000/api/courses', {
      method: 'POST',
      body: JSON.stringify({
        institution_id: 'inst-123',
        faculty_id: 'faculty-123',
        name: 'Computer Science',
        code: 'CS101',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to create course')
  })

  it('returns 500 when request body is invalid JSON', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const request = new NextRequest('http://localhost:3000/api/courses', {
      method: 'POST',
      body: 'invalid json',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})
