import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../../api/api'
import { bulkUpdateApplicationStatus } from '../../services/recruitmentService'
import ATSPipelineView from './ATSPipelineView'

vi.mock('../../api/api', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }))

const JOB = { _id: 'job1', title: 'Junior React Developer' }
const applicant = (id, name, college) => ({
  _id: id,
  studentName: name,
  studentEmail: `${name.split(' ')[0].toLowerCase()}@example.com`,
  status: 'Applied',
  jobId: JOB,
  opportunityTitle: JOB.title,
  opportunityType: 'Job',
  applicationData: { college },
  appliedAt: '2026-10-20T10:00:00.000Z',
})
const APPLICATIONS = [
  applicant('a1', 'Asha Rao', 'Geeta University'),
  applicant('a2', 'Ravi Kumar', 'Delhi University'),
  applicant('a3', 'Meera Shah', 'Geeta University'),
]

// The employer dashboard passes onBulkStatus, which saves and returns true on success.
const renderPipeline = (onBulkStatus) =>
  render(
    <MemoryRouter>
      <ATSPipelineView applications={APPLICATIONS} jobs={[JOB]} onBulkStatus={onBulkStatus} />
    </MemoryRouter>,
  )

const tick = (name) => fireEvent.click(screen.getByRole('checkbox', { name: `Select ${name}` }))
// Candidate cards have their own Reject buttons, so bulk actions are found inside the bar.
const bulkBar = () => screen.getByRole('checkbox', { name: /select all shown/i }).closest('label').parentElement
const button = (name) => within(bulkBar()).getByRole('button', { name })

beforeEach(() => vi.clearAllMocks())

describe('employer bulk shortlist / reject flow', () => {
  it('shortlists only the candidates the employer ticked, then clears the selection', async () => {
    const onBulkStatus = vi.fn().mockResolvedValue(true)
    renderPipeline(onBulkStatus)

    expect(screen.getByText('Select all shown (3)')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Shortlist' })).not.toBeInTheDocument()

    tick('Asha Rao')
    tick('Meera Shah')
    expect(screen.getByText('2 selected')).toBeInTheDocument()

    fireEvent.click(button('Shortlist'))

    await waitFor(() => expect(onBulkStatus).toHaveBeenCalledTimes(1))
    expect(onBulkStatus).toHaveBeenCalledWith(['a1', 'a3'], 'Shortlisted')
    await waitFor(() => expect(screen.queryByText('2 selected')).not.toBeInTheDocument())
    expect(screen.getByRole('checkbox', { name: 'Select Asha Rao' })).not.toBeChecked()
  })

  it('asks for confirmation before rejecting, and rejects only after "Yes, reject"', async () => {
    const onBulkStatus = vi.fn().mockResolvedValue(true)
    renderPipeline(onBulkStatus)
    tick('Ravi Kumar')
    tick('Meera Shah')

    fireEvent.click(button('Reject'))

    expect(screen.getByText('Reject 2?')).toBeInTheDocument()
    expect(onBulkStatus).not.toHaveBeenCalled()

    fireEvent.click(button('Yes, reject'))

    await waitFor(() => expect(onBulkStatus).toHaveBeenCalledWith(['a2', 'a3'], 'Rejected'))
    await waitFor(() => expect(screen.queryByText('2 selected')).not.toBeInTheDocument())
  })

  it('cancelling the reject confirmation sends nothing and keeps the selection', () => {
    const onBulkStatus = vi.fn().mockResolvedValue(true)
    renderPipeline(onBulkStatus)
    tick('Asha Rao')

    fireEvent.click(button('Reject'))
    fireEvent.click(button('Cancel'))

    expect(onBulkStatus).not.toHaveBeenCalled()
    expect(screen.queryByText('Reject 1?')).not.toBeInTheDocument()
    expect(screen.getByText('1 selected')).toBeInTheDocument()
  })

  it('selects every candidate shown and acts on all of them', async () => {
    const onBulkStatus = vi.fn().mockResolvedValue(true)
    renderPipeline(onBulkStatus)

    fireEvent.click(screen.getByRole('checkbox', { name: /select all shown/i }))
    expect(screen.getByText('3 selected')).toBeInTheDocument()
    fireEvent.click(button('Shortlist'))

    await waitFor(() => expect(onBulkStatus).toHaveBeenCalledWith(['a1', 'a2', 'a3'], 'Shortlisted'))
  })

  it('"select all" covers only the candidates left after a search', async () => {
    const onBulkStatus = vi.fn().mockResolvedValue(true)
    renderPipeline(onBulkStatus)

    fireEvent.change(screen.getByPlaceholderText('Search candidate, skill, college...'), { target: { value: 'Geeta' } })
    expect(screen.getByText('Select all shown (2)')).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Select Ravi Kumar' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('checkbox', { name: /select all shown/i }))
    fireEvent.click(button('Reject'))
    fireEvent.click(button('Yes, reject'))

    await waitFor(() => expect(onBulkStatus).toHaveBeenCalledWith(['a1', 'a3'], 'Rejected'))
  })

  it('locks the buttons while saving and keeps the selection when saving fails', async () => {
    let finish
    const onBulkStatus = vi.fn().mockReturnValue(new Promise((resolve) => { finish = resolve }))
    renderPipeline(onBulkStatus)
    tick('Asha Rao')
    tick('Ravi Kumar')

    fireEvent.click(button('Shortlist'))

    await waitFor(() => expect(button('Shortlist')).toBeDisabled())
    expect(button('Reject')).toBeDisabled()
    fireEvent.click(button('Shortlist'))
    expect(onBulkStatus).toHaveBeenCalledTimes(1)

    finish(false)

    await waitFor(() => expect(button('Shortlist')).toBeEnabled())
    expect(screen.getByText('2 selected')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Select Asha Rao' })).toBeChecked()
  })

  it('opening a candidate is not the same as ticking them', () => {
    renderPipeline(vi.fn())
    const card = screen.getByRole('checkbox', { name: 'Select Asha Rao' }).closest('div.cursor-pointer')

    fireEvent.click(within(card).getAllByText('Asha Rao')[0].closest('div'))

    expect(screen.queryByText(/selected$/)).not.toBeInTheDocument()
  })
})

describe('bulk status service', () => {
  it('sends the selected ids and status to the bulk endpoint', async () => {
    api.patch.mockResolvedValue({ data: { success: true, updated: 2, skipped: 0, notFound: 0 } })

    const res = await bulkUpdateApplicationStatus(['a1', 'a3'], 'Shortlisted')

    expect(api.patch).toHaveBeenCalledWith('/applications/bulk-status', { applicationIds: ['a1', 'a3'], status: 'Shortlisted' })
    expect(res).toEqual({ success: true, updated: 2, skipped: 0, notFound: 0 })
  })
})
