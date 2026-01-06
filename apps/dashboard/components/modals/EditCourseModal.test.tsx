import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { EditCourseModal } from './EditCourseModal'

// Mock the toast library
vi.mock('@/lib/toast', () => ({
  notify: {
    loading: vi.fn(() => 1),
    success: vi.fn(),
    error: vi.fn(),
    dismiss: vi.fn(),
  },
}))

// Mock fetch for API calls
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('EditCourseModal', () => {
  const mockOnClose = vi.fn()
  const mockOnSave = vi.fn()
  const mockCourse = {
    id: 'course-1',
    name: 'Computer Science',
    code: 'CS101',
    level: 'undergraduate' as const,
    description: 'Introduction to CS',
    durationYears: 4,
    requirements: {
      minimumAps: 30,
      requiredSubjects: ['Mathematics', 'Physical Science'],
    },
    status: 'open' as const,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    })
  })

  it('renders nothing when course is null', () => {
    render(
      <EditCourseModal
        isOpen={true}
        onClose={mockOnClose}
        course={null}
        onSave={mockOnSave}
      />
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders nothing when isOpen is false', () => {
    render(
      <EditCourseModal
        isOpen={false}
        onClose={mockOnClose}
        course={mockCourse}
        onSave={mockOnSave}
      />
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders modal with course data when open', () => {
    render(
      <EditCourseModal
        isOpen={true}
        onClose={mockOnClose}
        course={mockCourse}
        onSave={mockOnSave}
      />
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Computer Science')).toBeInTheDocument()
    expect(screen.getByDisplayValue('undergraduate')).toBeInTheDocument()
    expect(screen.getByDisplayValue('4')).toBeInTheDocument()
    expect(screen.getByDisplayValue('30')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Mathematics, Physical Science')).toBeInTheDocument()
  })

  it('renders course code in title', () => {
    render(
      <EditCourseModal
        isOpen={true}
        onClose={mockOnClose}
        course={mockCourse}
        onSave={mockOnSave}
      />
    )
    expect(screen.getByText('edit CS101')).toBeInTheDocument()
  })

  it('calls onClose when Cancel button is clicked', async () => {
    render(
      <EditCourseModal
        isOpen={true}
        onClose={mockOnClose}
        course={mockCourse}
        onSave={mockOnSave}
      />
    )
    fireEvent.click(screen.getByText('Cancel'))
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('updates form fields when user types', async () => {
    const user = userEvent.setup()
    render(
      <EditCourseModal
        isOpen={true}
        onClose={mockOnClose}
        course={mockCourse}
        onSave={mockOnSave}
      />
    )

    const nameInput = screen.getByDisplayValue('Computer Science')
    await user.clear(nameInput)
    await user.type(nameInput, 'Data Science')
    expect(nameInput).toHaveValue('Data Science')
  })

  it('calls onSave with updated course data when Save is clicked (useApi=false)', async () => {
    const user = userEvent.setup()
    render(
      <EditCourseModal
        isOpen={true}
        onClose={mockOnClose}
        course={mockCourse}
        onSave={mockOnSave}
        useApi={false}
      />
    )

    const nameInput = screen.getByDisplayValue('Computer Science')
    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Course')

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledTimes(1)
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Updated Course',
          code: 'CS101',
          level: 'undergraduate',
        })
      )
    })
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('makes API call when useApi=true', async () => {
    render(
      <EditCourseModal
        isOpen={true}
        onClose={mockOnClose}
        course={mockCourse}
        onSave={mockOnSave}
        useApi={true}
      />
    )

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        `/api/courses/${mockCourse.id}`,
        expect.objectContaining({
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })
  })

  it('changes level via dropdown', async () => {
    const user = userEvent.setup()
    render(
      <EditCourseModal
        isOpen={true}
        onClose={mockOnClose}
        course={mockCourse}
        onSave={mockOnSave}
        useApi={false}
      />
    )

    const levelSelect = screen.getByDisplayValue('undergraduate')
    await user.selectOptions(levelSelect, 'masters')
    expect(levelSelect).toHaveValue('masters')
  })

  it('changes status via dropdown', async () => {
    const user = userEvent.setup()
    render(
      <EditCourseModal
        isOpen={true}
        onClose={mockOnClose}
        course={mockCourse}
        onSave={mockOnSave}
        useApi={false}
      />
    )

    const statusSelect = screen.getByDisplayValue('open')
    await user.selectOptions(statusSelect, 'closed')
    expect(statusSelect).toHaveValue('closed')
  })

  it('parses subjects from comma-separated string', async () => {
    const user = userEvent.setup()
    render(
      <EditCourseModal
        isOpen={true}
        onClose={mockOnClose}
        course={mockCourse}
        onSave={mockOnSave}
        useApi={false}
      />
    )

    const subjectsInput = screen.getByDisplayValue('Mathematics, Physical Science')
    await user.clear(subjectsInput)
    await user.type(subjectsInput, 'English, Maths, Science')

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          requirements: expect.objectContaining({
            requiredSubjects: ['English', 'Maths', 'Science'],
          }),
        })
      )
    })
  })

  it('displays all course levels in dropdown', () => {
    render(
      <EditCourseModal
        isOpen={true}
        onClose={mockOnClose}
        course={mockCourse}
        onSave={mockOnSave}
      />
    )

    const levelSelect = screen.getByDisplayValue('undergraduate')
    const options = levelSelect.querySelectorAll('option')

    const expectedLevels = [
      'undergraduate',
      'honours',
      'postgraduate',
      'masters',
      'doctoral',
      'diploma',
      'advanced-diploma',
      'btech',
      'mtech',
      'dtech',
      'certificate',
      'short-course',
    ]

    expectedLevels.forEach((level) => {
      expect(Array.from(options).some((o) => o.value === level)).toBe(true)
    })
  })

  it('shows saving state on the Save button', async () => {
    // Make fetch hang to test loading state
    mockFetch.mockImplementation(() => new Promise(() => {}))

    render(
      <EditCourseModal
        isOpen={true}
        onClose={mockOnClose}
        course={mockCourse}
        onSave={mockOnSave}
        useApi={true}
      />
    )

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument()
    })
  })

  it('handles API error gracefully', async () => {
    const { notify } = await import('@/lib/toast')
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Database error' }),
    })

    render(
      <EditCourseModal
        isOpen={true}
        onClose={mockOnClose}
        course={mockCourse}
        onSave={mockOnSave}
        useApi={true}
      />
    )

    fireEvent.click(screen.getByText('Save'))

    await waitFor(() => {
      expect(notify.error).toHaveBeenCalledWith('Database error')
    })
    expect(mockOnClose).not.toHaveBeenCalled()
  })
})
