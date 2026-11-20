import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../../api/api'
import Jobs from './Jobs'

vi.mock('../../api/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }))

// An external listing synced into E2Job: it has a database id, isExternal and the
// employer's applyUrl (not applyLink), so the card shows "Apply Now".
const EXTERNAL_JOB = {
  _id: '64b000000000000000000001',
  title: 'Full-Stack Developer',
  companyName: 'Fluence International, Inc.',
  isExternal: true,
  applyUrl: 'https://careers.example.com/full-stack',
  status: 'Published',
}
const E2JOB_JOB = { _id: '64b000000000000000000002', title: 'React Developer', companyName: 'Flow Labs', status: 'Published' }

const renderJobs = (jobs, onApply) => {
  api.get.mockResolvedValue({ data: { jobs } })
  return render(
    <MemoryRouter>
      <Jobs embedded onApply={onApply} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(window, 'open').mockImplementation(() => null)
})

describe('applying from an embedded job list (dashboards pass onApply)', () => {
  it('sends an external job to the company site instead of opening the E2Job apply form', async () => {
    const onApply = vi.fn()
    renderJobs([EXTERNAL_JOB], onApply)

    fireEvent.click(await screen.findByRole('button', { name: 'Apply Now' }))

    expect(window.open).toHaveBeenCalledWith('https://careers.example.com/full-stack', '_blank', 'noopener,noreferrer')
    expect(onApply).not.toHaveBeenCalled()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('tells the user when an external job has no apply link', async () => {
    const onApply = vi.fn()
    renderJobs([{ ...EXTERNAL_JOB, applyUrl: '' }], onApply)

    fireEvent.click(await screen.findByRole('button', { name: 'Apply Now' }))

    expect(await screen.findByText('This listing has no apply link.')).toBeInTheDocument()
    expect(onApply).not.toHaveBeenCalled()
  })

  it('still hands an E2Job listing to the dashboard apply form', async () => {
    const onApply = vi.fn()
    renderJobs([E2JOB_JOB], onApply)

    fireEvent.click(await screen.findByRole('button', { name: 'Apply Now' }))

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ _id: E2JOB_JOB._id }))
    expect(window.open).not.toHaveBeenCalled()
  })
})
