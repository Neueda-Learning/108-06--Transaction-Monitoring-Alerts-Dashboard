export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '--'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return '--'
  }

  return parsed.toLocaleString()
}

export function toIsoFromLocalDateTime(value: string): string | null {
  if (!value) {
    return null
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }
  return parsed.toISOString()
}

export function riskBucket(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 85) {
    return 'critical'
  }
  if (score >= 60) {
    return 'high'
  }
  if (score >= 25) {
    return 'medium'
  }
  return 'low'
}

