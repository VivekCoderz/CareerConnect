import { describe, expect, it } from 'vitest'
import { EXPERIENCE_OPTIONS, experienceForType, experienceOptionsFor } from './experience'

describe('experience choices (bug 4: freshers have at most 2 years)', () => {
  it('offers freshers 0 to 2 years only', () => {
    expect(experienceOptionsFor('fresher')).toEqual(['0 years', '1 year', '2 years'])
  })

  it('offers working professionals every choice', () => {
    expect(experienceOptionsFor('professional')).toEqual(EXPERIENCE_OPTIONS)
    expect(experienceOptionsFor('professional')).toContain('5+ years')
  })

  it('resets an answer the new type does not offer, and keeps one it does', () => {
    expect(experienceForType('fresher', '4 years')).toBe('0 years')
    expect(experienceForType('fresher', '5+ years')).toBe('0 years')
    expect(experienceForType('fresher', '2 years')).toBe('2 years')
    expect(experienceForType('professional', '4 years')).toBe('4 years')
  })
})
