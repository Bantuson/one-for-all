import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { Hero } from './Hero'

// Mock IntersectionObserver for JSDOM environment
beforeAll(() => {
  const mockIntersectionObserver = vi.fn()
  mockIntersectionObserver.mockReturnValue({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })
  window.IntersectionObserver = mockIntersectionObserver as unknown as typeof IntersectionObserver
})

// Mock LoginModal to avoid complex dependencies
vi.mock('../modals/LoginModal', () => ({
  LoginModal: () => null,
}))

// Mock Logo component
vi.mock('../branding/Logo', () => ({
  Logo: () => <div data-testid="logo">Logo</div>,
}))

// Mock TrafficLights component
vi.mock('../ui/TrafficLights', () => ({
  TrafficLights: () => <div data-testid="traffic-lights" />,
}))

describe('Hero Component', () => {
  it('renders the header with export keyword', () => {
    render(<Hero />)
    // Multiple "export" keywords exist on the page (header + feature cards)
    const exportElements = screen.getAllByText('export')
    expect(exportElements.length).toBeGreaterThan(0)
  })

  it('renders the AdmissionsManagement text', () => {
    render(<Hero />)
    expect(screen.getByText('AdmissionsManagement')).toBeInTheDocument()
  })

  it('renders the register button', () => {
    render(<Hero />)
    expect(screen.getByText('register')).toBeInTheDocument()
  })

  it('renders the sign-in button', () => {
    render(<Hero />)
    expect(screen.getByText('sign-in')).toBeInTheDocument()
  })

  it('renders the logo', () => {
    render(<Hero />)
    expect(screen.getByTestId('logo')).toBeInTheDocument()
  })

  it('renders feature cards', () => {
    render(<Hero />)
    expect(screen.getByText('AIProcessing')).toBeInTheDocument()
    expect(screen.getByText('MultiInstitution')).toBeInTheDocument()
    expect(screen.getByText('RealtimeTracking')).toBeInTheDocument()
  })
})
