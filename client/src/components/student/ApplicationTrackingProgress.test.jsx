import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ApplicationTrackingProgress from './ApplicationTrackingProgress'

const STAGES = [
  { _id: 's1', name: 'Resume Screening', type: 'Resume Screening', order: 0 },
  { _id: 's2', name: 'HR Round', type: 'HR Round', order: 1 },
]

// A candidate the employer has just moved to the HR round. The server writes an
// "In Progress" history entry for the round even though nothing is booked yet.
const atHrRound = (activeInterview = null) => ({
  _id: 'a1',
  status: 'Shortlisted',
  overallStatus: 'In Progress',
  appliedAt: '2026-10-20T09:00:00',
  currentStageIndex: 1,
  jobId: { title: 'Full-Stack Developer', recruitmentStages: STAGES },
  stageHistory: [
    { stageIndex: 0, stageName: 'Resume Screening', status: 'Passed' },
    { stageIndex: 1, stageName: 'HR Round', status: 'In Progress' },
  ],
  activeInterview,
})

const roundCard = (name) => screen.getByRole('heading', { name }).closest('div.rounded-2xl')

describe('application tracker: HR round status (bug 8)', () => {
  it('shows "Not started" for an HR round with no interview booked', () => {
    render(<ApplicationTrackingProgress application={atHrRound()} />)

    const card = within(roundCard('HR Round'))
    expect(card.getByText('NOT STARTED')).toBeInTheDocument()
    expect(card.queryByText('IN PROGRESS')).not.toBeInTheDocument()
    expect(card.queryByText(/^Scheduled:/)).not.toBeInTheDocument()
  })

  it('shows "Scheduled" with the date and time once the interview is booked', () => {
    render(<ApplicationTrackingProgress application={atHrRound({
      roundNumber: 2, status: 'scheduled', scheduledDate: '2026-11-20T00:00:00', scheduledTime: '10:30 am',
    })} />)

    const card = within(roundCard('HR Round'))
    expect(card.getByText('SCHEDULED')).toBeInTheDocument()
    expect(card.getByText('Scheduled: 20/11/26, 10:30 am')).toBeInTheDocument()
  })

  it('treats a rescheduled interview as scheduled', () => {
    render(<ApplicationTrackingProgress application={atHrRound({
      roundNumber: 2, status: 'Rescheduled', scheduledDate: '2026-11-22T00:00:00', scheduledTime: '4:00 pm',
    })} />)

    const card = within(roundCard('HR Round'))
    expect(card.getByText('SCHEDULED')).toBeInTheDocument()
    expect(card.getByText('Scheduled: 22/11/26, 4:00 pm')).toBeInTheDocument()
  })

  it('still shows "In progress" for a screening round being reviewed', () => {
    render(<ApplicationTrackingProgress application={{
      ...atHrRound(),
      status: 'Applied',
      currentStageIndex: 0,
      stageHistory: [{ stageIndex: 0, stageName: 'Resume Screening', status: 'In Progress' }],
    }} />)

    expect(within(roundCard('Resume Screening')).getByText('IN PROGRESS')).toBeInTheDocument()
  })
})
