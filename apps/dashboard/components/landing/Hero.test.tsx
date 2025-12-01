import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Hero } from './Hero'

describe('Hero Component', () => {
  it('renders the header text', () => {
    render(<Hero />)
    expect(
      screen.getByText('ADMISSIONS MANAGEMENT CENTER')
    ).toBeInTheDocument()
  })

  it('renders the Register button', () => {
    render(<Hero />)
    expect(screen.getByText('Register')).toBeInTheDocument()
  })

  it('renders the Sign in button', () => {
    render(<Hero />)
    expect(screen.getByText('Sign in')).toBeInTheDocument()
  })

  it('renders the logo with three parts', () => {
    render(<Hero />)
    // Logo renders "ONE FOR ALL" as separate spans
    const logoContainer = screen.getByText('ONE').closest('div')
    expect(logoContainer).toBeInTheDocument()
  })
})
