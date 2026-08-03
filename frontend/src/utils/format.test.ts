import { describe, expect, it } from 'vitest'
import { formatDate, toIsoFromLocalDateTime } from './format'

describe('format utilities', () => {
  it('returns placeholder for empty date', () => {
    expect(formatDate(null)).toBe('--')
  })

  it('converts local datetime to ISO', () => {
    const iso = toIsoFromLocalDateTime('2026-08-02T10:30')
    expect(iso).toContain('2026-08-02T')
    expect(iso?.endsWith('Z')).toBe(true)
  })
})

