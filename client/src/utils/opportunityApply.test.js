import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../api/api'
import { applyToOpportunity, openExternalApply } from './opportunityApply'

vi.mock('../api/api', () => ({ default: { post: vi.fn() } }))

const E2JOB_ID = '64b000000000000000000001'
const EXTERNAL_JOB = { _id: E2JOB_ID, title: 'Full-Stack Developer', isExternal: true, applyUrl: 'https://careers.example.com/123' }

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(window, 'open').mockImplementation(() => null)
})

describe('openExternalApply', () => {
  it('opens the company apply link for an external listing stored in E2Job', () => {
    expect(openExternalApply(EXTERNAL_JOB)).toEqual({ opened: true })
    expect(window.open).toHaveBeenCalledWith('https://careers.example.com/123', '_blank', 'noopener,noreferrer')
  })

  it('treats a scraped listing without a database id as external', () => {
    expect(openExternalApply({ id: 'remotive-42', applyLink: 'https://remotive.com/jobs/42' })).toEqual({ opened: true })
    expect(window.open).toHaveBeenCalledWith('https://remotive.com/jobs/42', '_blank', 'noopener,noreferrer')
  })

  it('reports an external listing that has no usable apply link', () => {
    expect(openExternalApply({ ...EXTERNAL_JOB, applyUrl: 'javascript:alert(1)' })).toEqual({ opened: false })
    expect(window.open).not.toHaveBeenCalled()
  })

  it('returns null for an E2Job listing, which is applied to through E2Job', () => {
    expect(openExternalApply({ _id: E2JOB_ID, title: 'React Developer' })).toBeNull()
    expect(window.open).not.toHaveBeenCalled()
  })
})

describe('applyToOpportunity', () => {
  it('opens the link and sends no application for an external listing', async () => {
    expect(await applyToOpportunity(EXTERNAL_JOB, 'Job')).toEqual({ external: true, opened: true })
    expect(api.post).not.toHaveBeenCalled()
  })

  it('applies through E2Job for an E2Job listing', async () => {
    api.post.mockResolvedValue({ data: { success: true } })
    expect(await applyToOpportunity({ _id: E2JOB_ID }, 'Job')).toEqual({ external: false, success: true })
    expect(api.post).toHaveBeenCalledWith(`/applications/job/${E2JOB_ID}`, {})
  })
})
