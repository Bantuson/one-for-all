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

describe('GET /api/campuses/[id]', () => {
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

    const request = new NextRequest('http://localhost:3000/api/campuses/campus-123')
    const routeParams = { params: Promise.resolve({ id: 'campus-123' }) }

    const response = await GET(request, routeParams)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 200 with campus data on success', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const mockCampus = {
      id: 'campus-123',
      institution_id: 'inst-123',
      name: 'Main Campus',
      code: 'MAIN',
      address: { city: 'Pretoria' },
      created_at: '2024-01-01T00:00:00Z',
    }

    mockSingle.mockResolvedValue({ data: mockCampus, error: null })

    const request = new NextRequest('http://localhost:3000/api/campuses/campus-123')
    const routeParams = { params: Promise.resolve({ id: 'campus-123' }) }

    const response = await GET(request, routeParams)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.campus).toEqual(mockCampus)
    expect(mockFrom).toHaveBeenCalledWith('campuses')
    expect(mockSelect).toHaveBeenCalledWith('*')
    expect(mockEq).toHaveBeenCalledWith('id', 'campus-123')
  })

  it('returns 404 when campus is not found', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

    const request = new NextRequest('http://localhost:3000/api/campuses/nonexistent')
    const routeParams = { params: Promise.resolve({ id: 'nonexistent' }) }

    const response = await GET(request, routeParams)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Campus not found')
  })
})

describe('PUT /api/campuses/[id]', () => {
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

    const request = new NextRequest('http://localhost:3000/api/campuses/campus-123', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated Campus' }),
    })
    const routeParams = { params: Promise.resolve({ id: 'campus-123' }) }

    const response = await PUT(request, routeParams)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 200 with updated campus on success', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const mockCampus = {
      id: 'campus-123',
      institution_id: 'inst-123',
      name: 'Updated Campus',
      code: 'MAIN',
      address: { city: 'Pretoria' },
      updated_at: '2024-01-02T00:00:00Z',
    }

    mockSingle.mockResolvedValue({ data: mockCampus, error: null })

    const request = new NextRequest('http://localhost:3000/api/campuses/campus-123', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated Campus' }),
    })
    const routeParams = { params: Promise.resolve({ id: 'campus-123' }) }

    const response = await PUT(request, routeParams)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.campus).toEqual(mockCampus)
    expect(mockFrom).toHaveBeenCalledWith('campuses')
    expect(mockEq).toHaveBeenCalledWith('id', 'campus-123')
  })

  it('updates multiple fields correctly', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    const mockCampus = {
      id: 'campus-123',
      institution_id: 'inst-123',
      name: 'New Name',
      code: 'NEW',
      is_main: true,
      address: { city: 'Johannesburg' },
      updated_at: '2024-01-02T00:00:00Z',
    }

    mockSingle.mockResolvedValue({ data: mockCampus, error: null })

    const request = new NextRequest('http://localhost:3000/api/campuses/campus-123', {
      method: 'PUT',
      body: JSON.stringify({
        name: 'New Name',
        code: 'NEW',
        is_main: true,
        address: { city: 'Johannesburg' },
      }),
    })
    const routeParams = { params: Promise.resolve({ id: 'campus-123' }) }

    const response = await PUT(request, routeParams)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.campus.name).toBe('New Name')
    expect(data.campus.code).toBe('NEW')
    expect(data.campus.is_main).toBe(true)
  })

  it('returns 404 when campus is not found', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    mockSingle.mockResolvedValue({ data: null, error: null })

    const request = new NextRequest('http://localhost:3000/api/campuses/nonexistent', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated Campus' }),
    })
    const routeParams = { params: Promise.resolve({ id: 'nonexistent' }) }

    const response = await PUT(request, routeParams)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Campus not found')
  })

  it('returns 500 when Supabase update fails', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    mockSingle.mockResolvedValue({
      data: null,
      error: { message: 'Database error', code: 'PGRST116' },
    })

    const request = new NextRequest('http://localhost:3000/api/campuses/campus-123', {
      method: 'PUT',
      body: JSON.stringify({ name: 'Updated Campus' }),
    })
    const routeParams = { params: Promise.resolve({ id: 'campus-123' }) }

    const response = await PUT(request, routeParams)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to update campus')
  })
})

describe('DELETE /api/campuses/[id]', () => {
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

    const request = new NextRequest('http://localhost:3000/api/campuses/campus-123', {
      method: 'DELETE',
    })
    const routeParams = { params: Promise.resolve({ id: 'campus-123' }) }

    const response = await DELETE(request, routeParams)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('returns 200 with success on successful deletion', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    mockEq.mockResolvedValue({ error: null })

    const request = new NextRequest('http://localhost:3000/api/campuses/campus-123', {
      method: 'DELETE',
    })
    const routeParams = { params: Promise.resolve({ id: 'campus-123' }) }

    const response = await DELETE(request, routeParams)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockFrom).toHaveBeenCalledWith('campuses')
    expect(mockEq).toHaveBeenCalledWith('id', 'campus-123')
  })

  it('returns 500 when Supabase delete fails', async () => {
    ;(auth as unknown as Mock).mockResolvedValue({ userId: 'test-user-id' })

    mockEq.mockResolvedValue({
      error: { message: 'Database error', code: 'PGRST116' },
    })

    const request = new NextRequest('http://localhost:3000/api/campuses/campus-123', {
      method: 'DELETE',
    })
    const routeParams = { params: Promise.resolve({ id: 'campus-123' }) }

    const response = await DELETE(request, routeParams)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to delete campus')
  })
})
