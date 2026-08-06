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

// Compliance SLA target: unresolved alerts should be reviewed within 4 hours.
export const ALERT_SLA_BREACH_MINUTES = 4 * 60

export function getAlertAgeMinutes(createdAt: string): number {
  const created = new Date(createdAt).getTime()
  if (Number.isNaN(created)) {
    return 0
  }
  return Math.max(0, Math.floor((Date.now() - created) / 60000))
}

export function formatAlertAge(ageMinutes: number): string {
  if (ageMinutes < 60) {
    return `${ageMinutes}m`
  }
  const hours = Math.floor(ageMinutes / 60)
  const minutes = ageMinutes % 60
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`
}


