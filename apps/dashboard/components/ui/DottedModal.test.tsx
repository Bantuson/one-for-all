import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { DottedModal, DottedModalContent, DottedModalFooter } from './DottedModal'

describe('DottedModal', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('renders nothing when isOpen is false', () => {
    render(
      <DottedModal isOpen={false} onClose={mockOnClose} title="Test Modal">
        <p>Modal content</p>
      </DottedModal>
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders modal when isOpen is true', () => {
    render(
      <DottedModal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <p>Modal content</p>
      </DottedModal>
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('renders title in the header', () => {
    render(
      <DottedModal isOpen={true} onClose={mockOnClose} title="Test Title">
        <p>Content</p>
      </DottedModal>
    )
    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('calls onClose when overlay is clicked', () => {
    render(
      <DottedModal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <p>Content</p>
      </DottedModal>
    )
    // Click the overlay (first child with aria-hidden)
    const overlay = document.querySelector('[aria-hidden="true"]')
    if (overlay) {
      fireEvent.click(overlay)
    }
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('does not close when modal content is clicked', () => {
    render(
      <DottedModal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <p>Click me</p>
      </DottedModal>
    )
    fireEvent.click(screen.getByText('Click me'))
    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('calls onClose when Escape key is pressed', () => {
    render(
      <DottedModal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <p>Content</p>
      </DottedModal>
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('prevents body scroll when open', () => {
    render(
      <DottedModal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <p>Content</p>
      </DottedModal>
    )
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('restores body scroll when closed', () => {
    const { rerender } = render(
      <DottedModal isOpen={true} onClose={mockOnClose} title="Test Modal">
        <p>Content</p>
      </DottedModal>
    )
    expect(document.body.style.overflow).toBe('hidden')

    rerender(
      <DottedModal isOpen={false} onClose={mockOnClose} title="Test Modal">
        <p>Content</p>
      </DottedModal>
    )
    expect(document.body.style.overflow).toBe('')
  })

  it('applies custom className', () => {
    render(
      <DottedModal isOpen={true} onClose={mockOnClose} title="Test" className="custom-class">
        <p>Content</p>
      </DottedModal>
    )
    expect(screen.getByRole('dialog')).toHaveClass('custom-class')
  })
})

describe('DottedModalContent', () => {
  it('renders children with padding', () => {
    render(
      <DottedModalContent>
        <p>Content text</p>
      </DottedModalContent>
    )
    const content = screen.getByText('Content text').parentElement
    expect(content).toHaveClass('p-6')
  })

  it('applies custom className', () => {
    render(
      <DottedModalContent className="custom-content">
        <p>Content</p>
      </DottedModalContent>
    )
    const content = screen.getByText('Content').parentElement
    expect(content).toHaveClass('custom-content')
  })
})

describe('DottedModalFooter', () => {
  it('renders children with correct styling', () => {
    render(
      <DottedModalFooter>
        <button>Save</button>
      </DottedModalFooter>
    )
    const footer = screen.getByRole('button').parentElement
    expect(footer).toHaveClass('px-6', 'py-4', 'border-t', 'bg-muted/50')
  })

  it('applies custom className', () => {
    render(
      <DottedModalFooter className="custom-footer">
        <button>Action</button>
      </DottedModalFooter>
    )
    const footer = screen.getByRole('button').parentElement
    expect(footer).toHaveClass('custom-footer')
  })
})
