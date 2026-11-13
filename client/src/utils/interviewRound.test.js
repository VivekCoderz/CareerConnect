import { describe, expect, it } from 'vitest'
import { isBookedInterview, isInterviewRound, openRoundStatus } from './interviewRound'

describe('interview round status (bug 8)', () => {
  it('recognises interview rounds by type or name', () => {
    expect(isInterviewRound({ name: 'HR Round', type: 'HR Round' })).toBe(true)
    expect(isInterviewRound({ name: 'Final', type: 'Technical Interview' })).toBe(true)
    expect(isInterviewRound({ name: 'Resume Screening', type: 'Resume Screening' })).toBe(false)
    expect(isInterviewRound({ name: 'Aptitude Test', type: 'Online Test' })).toBe(false)
    // "hr" inside another word is not an HR round.
    expect(isInterviewRound({ name: 'Threshold Test', type: 'Online Test' })).toBe(false)
  })

  it('counts scheduled and rescheduled interviews as booked', () => {
    expect(isBookedInterview({ status: 'scheduled' })).toBe(true)
    expect(isBookedInterview({ status: 'Rescheduled' })).toBe(true)
    expect(isBookedInterview({ status: 'cancelled' })).toBe(false)
    expect(isBookedInterview({ status: 'completed' })).toBe(false)
    expect(isBookedInterview(null)).toBe(false)
  })

  it('gives an open round "not started", "scheduled" or "in progress"', () => {
    const hr = { name: 'HR Round', type: 'HR Round' }
    expect(openRoundStatus(hr, null)).toBe('not started')
    expect(openRoundStatus(hr, { status: 'cancelled' })).toBe('not started')
    expect(openRoundStatus(hr, { status: 'scheduled' })).toBe('scheduled')
    expect(openRoundStatus({ name: 'Resume Screening', type: 'Resume Screening' }, null)).toBe('in progress')
  })
})
