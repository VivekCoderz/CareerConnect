import { configureStore } from '@reduxjs/toolkit'
import { render, screen, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../../api/api'
import authReducer from '../../redux/features/authSlice'
import StudentApplicationTrackingPage from './StudentApplicationTrackingPage'

vi.mock('../../api/api', () => ({ default: { get: vi.fn(), patch: vi.fn() } }))

const STAGES = [
  { _id: 's1', name: 'Resume Screening', type: 'Resume Screening', order: 0 },
  { _id: 's2', name: 'HR Round', type: 'HR Round', order: 1 },
]
// The employer just moved the candidate to the HR round; the server wrote an
// "In Progress" history entry for it.
const application = (interviews) => ({
  _id: 'a1',
  status: 'Shortlisted',
  overallStatus: 'In Progress',
  appliedAt: '2026-10-20T09:00:00',
  currentStageIndex: 1,
  opportunityTitle: 'Full-Stack Developer',
  jobId: { _id: 'j1', title: 'Full-Stack Developer', recruitmentStages: STAGES },
  stageHistory: [
    { stageIndex: 0, stageName: 'Resume Screening', status: 'Passed' },
    { stageIndex: 1, stageName: 'HR Round', status: 'In Progress' },
  ],
  interviews,
})

const openTracking = (app) => {
  api.get.mockResolvedValue({ data: { success: true, application: app } })
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { user: { _id: 'u1', userType: 'fresher', role: 'user' }, loading: false, isInitialized: true, error: null, success: null, sessionExpired: false } },
  })
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/student/applications/a1']}>
        <Routes>
          <Route path="/student/applications/:applicationId" element={<StudentApplicationTrackingPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )
}

// The timeline lists each round as a heading with its status badge next to it.
const roundStatus = async (name) => {
  const heading = await screen.findByRole('heading', { name, level: 4 })
  return within(heading.parentElement)
}

beforeEach(() => vi.clearAllMocks())

describe('application tracking page: HR round (bug 8)', () => {
  it('shows "Not Started" for the HR round when no interview is booked', async () => {
    openTracking(application([]))

    const hr = await roundStatus('HR Round')
    expect(hr.getByText('Not Started')).toBeInTheDocument()
    expect(hr.queryByText('In Progress')).not.toBeInTheDocument()
  })

  it('shows "Scheduled" with the time once the HR interview is booked', async () => {
    openTracking(application([
      { roundName: 'HR Round', roundNumber: 2, status: 'cancelled', scheduledDate: '2026-11-18', startTime: '09:00' },
      { roundName: 'HR Round', roundNumber: 2, status: 'scheduled', scheduledDate: '2026-11-20', startTime: '10:30' },
    ]))

    const hr = await roundStatus('HR Round')
    expect(hr.getByText('Scheduled')).toBeInTheDocument()
    expect(screen.getAllByText('10:30').length).toBeGreaterThan(0)
    expect(screen.queryByText('09:00')).not.toBeInTheDocument()
  })
})
