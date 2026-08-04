import { describe, expect, it } from 'vitest'
import { formatDate, riskBucket, toIsoFromLocalDateTime } from './format'

describe('format utilities', () => {
  it('returns placeholder for empty date', () => {
    expect(formatDate(null)).toBe('--')
  })

  it('converts local datetime to ISO', () => {
    const iso = toIsoFromLocalDateTime('2026-08-02T10:30')
    expect(iso).toContain('2026-08-02T')
    expect(iso?.endsWith('Z')).toBe(true)
  })

  it('buckets risk scores into low/medium/high/critical', () => {
    expect(riskBucket(0)).toBe('low')
    expect(riskBucket(24)).toBe('low')
    expect(riskBucket(25)).toBe('medium')
    expect(riskBucket(59)).toBe('medium')
    expect(riskBucket(60)).toBe('high')
    expect(riskBucket(84)).toBe('high')
    expect(riskBucket(85)).toBe('critical')
    expect(riskBucket(100)).toBe('critical')
  })
})

