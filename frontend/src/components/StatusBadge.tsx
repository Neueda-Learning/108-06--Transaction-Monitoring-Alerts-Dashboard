import type { AlertStatus, Severity } from '../api/types'

interface StatusBadgeProps {
  value: AlertStatus | Severity | string
}

export function StatusBadge({ value }: StatusBadgeProps) {
  const normalized = value.toLowerCase().replace('_', '-')

  return <span className={`badge badge-${normalized}`}>{value.replace('_', ' ')}</span>
}

