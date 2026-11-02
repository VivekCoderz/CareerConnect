import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../../api/api'
import { renderWithProviders } from '../../test/renderWithProviders'
import JobDetailPage from './JobDetailPage'

// Only the HTTP client is mocked: jobService, applicationService and opportunityApply run as
// in the app, so the test checks the request the Apply button really sends.
vi.mock('../../api/api', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }))

const JOB_ID = '64b000000000000000000001'
const JOB = {
  _id: JOB_ID,
  title: 'Junior React Developer',
  companyName: 'Flow Labs',
  description: 'Build React apps with a small team.',
  location: 'Bangalore',
  status: 'Published',
  employmentType: 'Full-time',
}
const STUDENT = { _id: 'u1', fullName: 'Asha Rao', role: 'user', userType: 'student' }
const EMPLOYER = { _id: 'e1', fullName: 'Pat HR', role: 'employer', userType: 'employer' }

// Answers GET requests by URL, like the server would.
const serve = ({ job = JOB, appliedJobIds = [] } = {}) => {
  api.get.mockImplementation(async (url) => {
    if (url === `/jobs/${JOB_ID}`) return { data: { success: true, job } }
    if (url === '/applications/me/applied-ids') return { data: { jobIds: appliedJobIds, internshipIds: [] } }
    throw new Error(`unexpected GET ${url}`)
  })
}

const openJob = (user) => renderWithProviders(<JobDetailPage />, { path: '/jobs/:id', route: `/jobs/${JOB_ID}`, user })
const applyButton = () => screen.findByRole('button', { name: 'Apply Now' })

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('student apply to job flow', () => {
  it('shows the job to a signed-in student, applies, and marks it Applied', async () => {
    serve()
    api.post.mockResolvedValue({ data: { success: true, message: 'Application submitted successfully' } })
    openJob(STUDENT)

    expect(await screen.findByRole('heading', { name: 'Junior React Developer' })).toBeInTheDocument()
    expect(screen.getAllByText('Flow Labs').length).toBeGreaterThan(0)

    fireEvent.click(await applyButton())

    expect(await screen.findByText('✓ Applied')).toBeInTheDocument()
    expect(api.post).toHaveBeenCalledTimes(1)
    expect(api.post).toHaveBeenCalledWith(`/applications/job/${JOB_ID}`, {})
    expect(screen.getByRole('status')).toHaveTextContent('Application submitted successfully')
    expect(screen.queryByRole('button', { name: 'Apply Now' })).not.toBeInTheDocument()
  })

  it('disables the button while the application is being sent', async () => {
    serve()
    let finish
    api.post.mockReturnValue(new Promise((resolve) => { finish = resolve }))
    openJob(STUDENT)

    fireEvent.click(await applyButton())

    const busy = await screen.findByRole('button', { name: 'Applying…' })
    expect(busy).toBeDisabled()
    fireEvent.click(busy)
    expect(api.post).toHaveBeenCalledTimes(1)
    finish({ data: { success: true } })
    expect(await screen.findByText('✓ Applied')).toBeInTheDocument()
  })

  it('shows Applied instead of the button for a job the student already applied to', async () => {
    serve({ appliedJobIds: [JOB_ID] })
    openJob(STUDENT)

    expect(await screen.findByText('✓ Applied')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Apply Now' })).not.toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('marks the job Applied when the server says the student already applied', async () => {
    serve()
    api.post.mockRejectedValue({
      response: { status: 409, data: { success: false, message: 'You have already applied for this position.' } },
    })
    openJob(STUDENT)

    fireEvent.click(await applyButton())

    expect(await screen.findByText('✓ Applied')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('You have already applied for this position.')
  })

  it('keeps the Apply button and shows the error when applying fails', async () => {
    serve()
    api.post.mockRejectedValue({ response: { status: 400, data: { message: 'Applications for this listing are closed.' } } })
    openJob(STUDENT)

    fireEvent.click(await applyButton())

    expect(await screen.findByRole('status')).toHaveTextContent('Applications for this listing are closed.')
    expect(screen.getByRole('button', { name: 'Apply Now' })).toBeEnabled()
    expect(screen.queryByText('✓ Applied')).not.toBeInTheDocument()
  })

  it('sends a signed-out visitor to log in and back to this job', async () => {
    serve()
    openJob(null)

    fireEvent.click(await screen.findByRole('button', { name: 'Log in to Apply' }))

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(`/login?redirect=${encodeURIComponent(`/jobs/${JOB_ID}`)}`))
    expect(api.post).not.toHaveBeenCalled()
  })

  it('does not offer Apply to an employer', async () => {
    serve()
    openJob(EMPLOYER)

    expect(await screen.findByRole('heading', { name: 'Junior React Developer' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /apply/i })).not.toBeInTheDocument()
  })

  it('does not offer Apply on a closed job', async () => {
    serve({ job: { ...JOB, status: 'Closed' } })
    openJob(STUDENT)

    await waitFor(() => expect(api.get).toHaveBeenCalledWith(`/jobs/${JOB_ID}`))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Junior React Developer' })).not.toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Apply Now' })).not.toBeInTheDocument()
  })
})
