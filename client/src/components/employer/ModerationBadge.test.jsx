import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ModerationBadge from './ModerationBadge'

describe('ModerationBadge', () => {
  it.each([
    ['Pending Approval', 'Pending approval'],
    ['Rejected', 'Rejected'],
    ['Draft', 'Draft'],
  ])('shows %s to the employer as "%s"', (status, label) => {
    render(<ModerationBadge status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('shows nothing for a published listing', () => {
    const { container } = render(<ModerationBadge status="Published" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('adds extra classes from the parent', () => {
    render(<ModerationBadge status="Draft" className="ml-2" />)
    expect(screen.getByText('Draft')).toHaveClass('ml-2')
  })
})
