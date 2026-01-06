import type { Mock } from 'vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PUT, DELETE } from './route'

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

describe('GET /api/courses/[id]', () => {
  const mockSingle = vi.fn()
  const mockEq = vi.fn(() => ({ single: mockSingle }))
  const mockSelect = vi.fn(() => ({ eq: mockEq }))
  const mockFrom = vi.fn(() => ({ select: mockSelect }))
  const mockSupabase = { from: mockFrom }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(createServiceClient as Mock).mockReturnValue(mockSupabase)
  })

  it('returns 401 if user is not authenticated', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: null })

    const request = new NextRequest('http://localhost:3000/api/courses/course-123')
    const routeParams = { params: Promise.resolve({ id: 'course-123' }) }

    const response = await GET(request, routeParams)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 200 with course data on success', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const mockCourse = {
      id: 'course-123',
      institution_id: 'inst-123',
      faculty_id: 'faculty-123',
      campus_id: 'campus-123',
      name: 'Computer Science',
      code: 'CS101',
      requirements: { math: 'Level 5' },
      status: 'active',
      created_at: '2024-01-01T00:00:00Z',
    }

    mockSingle.mockResolvedValue({ data: mockCourse, error: null })

    const request = new NextRequest('http://localhost:3000/api/courses/course-123')
    const routeParams = { params: Promise.resolve({ id: 'course-123' }) }

    const response = await GET(request, routeParams)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.course).toEqual(mockCourse)
    expect(mockFrom).toHaveBeenCalledWith('courses')
    expect(mockSelect).toHaveBeenCalledWith('*')
    expect(mockEq).toHaveBeenCalledWith('id', 'course-123')
  })

  it('returns 404 when course is not found', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

    const request = new NextRequest('http://localhost:3000/api/courses/nonexistent')
    const routeParams = { params: Promise.resolve({ id: 'nonexistent' }) }

    const response = await GET(request, routeParams)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Course not found')
  })
})

describe('PUT /api/courses/[id]', () => {
  const mockSingle = vi.fn()
  const mockSelect = vi.fn(() => ({ single: mockSingle }))
  const mockEq = vi.fn(() => ({ select: mockSelect }))
  const mockUpdate = vi.fn(() => ({ eq: mockEq }))
  const mockFrom = vi.fn(() => ({ update: mockUpdate }))
  const mockSupabase = { from: mockFrom }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(createServiceClient as Mock).mockReturnValue(mockSupabase)
  })

  it('returns 401 if user is not authenticated', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: null })

    const request = new NextRequest('http://localhost:3000/api/courses/course-123', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated Course' }),
    })
    const routeParams = { params: Promise.resolve({ id: 'course-123' }) }

    const response = await PUT(request, routeParams)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 200 with updated course on success', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const mockCourse = {
      id: 'course-123',
      institution_id: 'inst-123',
      faculty_id: 'faculty-123',
      campus_id: 'campus-123',
      name: 'Updated Course',
      code: 'CS101',
      requirements: { math: 'Level 5' },
      status: 'active',
      updated_at: '2024-01-02T00:00:00Z',
    }

    mockSingle.mockResolvedValue({ data: mockCourse, error: null })

    const request = new NextRequest('http://localhost:3000/api/courses/course-123', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated Course' }),
    })
    const routeParams = { params: Promise.resolve({ id: 'course-123' }) }

    const response = await PUT(request, routeParams)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.course).toEqual(mockCourse)
    expect(mockFrom).toHaveBeenCalledWith('courses')
    expect(mockEq).toHaveBeenCalledWith('id', 'course-123')
  })

  it('updates multiple fields correctly', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const mockCourse = {
      id: 'course-123',
      institution_id: 'inst-123',
      faculty_id: 'faculty-123',
      campus_id: 'campus-123',
      name: 'Advanced Computer Science',
      code: 'CS201',
      level: 'Honours',
      description: 'Advanced topics in computer science',
      duration_years: 4,
      requirements: { math: 'Level 6', physics: 'Level 5' },
      status: 'active',
      programme_type: 'undergraduate',
      updated_at: '2024-01-02T00:00:00Z',
    }

    mockSingle.mockResolvedValue({ data: mockCourse, error: null })

    const request = new NextRequest('http://localhost:3000/api/courses/course-123', {
      method: 'PUT',
      body: JSON.stringify({
        name: 'Advanced Computer Science',
        code: 'CS201',
        level: 'Honours',
        description: 'Advanced topics in computer science',
        duration_years: 4,
        requirements: { math: 'Level 6', physics: 'Level 5' },
        status: 'active',
        programme_type: 'undergraduate',
      }),
    })
    const routeParams = { params: Promise.resolve({ id: 'course-123' }) }

    const response = await PUT(request, routeParams)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.course.name).toBe('Advanced Computer Science')
    expect(data.course.code).toBe('CS201')
    expect(data.course.level).toBe('Honours')
    expect(data.course.description).toBe('Advanced topics in computer science')
    expect(data.course.duration_years).toBe(4)
    expect(data.course.programme_type).toBe('undergraduate')
  })

  it('returns 404 when course is not found', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    mockSingle.mockResolvedValue({ data: null, error: null })

    const request = new NextRequest('http://localhost:3000/api/courses/nonexistent', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated Course' }),
    })
    const routeParams = { params: Promise.resolve({ id: 'nonexistent' }) }

    const response = await PUT(request, routeParams)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Course not found')
  })

  it('returns 500 when Supabase update fails', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Database error', code: 'PGRST116' },
    })

    const request = new NextRequest('http://localhost:3000/api/courses/course-123', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated Course' }),
    })
    const routeParams = { params: Promise.resolve({ id: 'course-123' }) }

    const response = await PUT(request, routeParams)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to update course')
  })
})

describe('DELETE /api/courses/[id]', () => {
  const mockEq = vi.fn()
  const mockDelete = vi.fn(() => ({ eq: mockEq }))
  const mockFrom = vi.fn(() => ({ delete: mockDelete }))
  const mockSupabase = { from: mockFrom }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(createServiceClient as Mock).mockReturnValue(mockSupabase)
  })

  it('returns 401 if user is not authenticated', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: null })

    const request = new NextRequest('http://localhost:3000/api/courses/course-123', {
      method: 'DELETE',
    })
    const routeParams = { params: Promise.resolve({ id: 'course-123' }) }

    const response = await DELETE(request, routeParams)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 200 with success on successful deletion', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    mockEq.mockResolvedValue({ error: null })

    const request = new NextRequest('http://localhost:3000/api/courses/course-123', {
      method: 'DELETE',
    })
    const routeParams = { params: Promise.resolve({ id: 'course-123' }) }

    const response = await DELETE(request, routeParams)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockFrom).toHaveBeenCalledWith('courses')
    expect(mockEq).toHaveBeenCalledWith('id', 'course-123')
  })

  it('returns 500 when Supabase delete fails', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    mockEq.mockResolvedValue({
      error: { message: 'Database error', code: 'PGRST116' },
    })

    const request = new NextRequest('http://localhost:3000/api/courses/course-123', {
      method: 'DELETE',
    })
    const routeParams = { params: Promise.resolve({ id: 'course-123' }) }

    const response = await DELETE(request, routeParams)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to delete course')
  })
})
