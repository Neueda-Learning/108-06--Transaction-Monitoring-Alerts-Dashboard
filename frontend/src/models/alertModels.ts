export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type WorkflowStatus = 'OPEN' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'CLOSED' | 'DISMISSED'
export type RuleType =
  | 'AMOUNT_THRESHOLD'
  | 'VELOCITY'
  | 'NEW_PAYEE'
  | 'DAILY_LIMIT'
  | 'SDN_MATCH'

export interface Alert {
  id: number
  alertRef: string
  accountId: string
  ruleId: number
  ruleName: string
  ruleType: RuleType
  severity: Severity
  status: WorkflowStatus
  message: string
  createdAt: string
  acknowledgedAt: string | null
  investigatingAt: string | null
  closedAt: string | null
  dismissedAt: string | null
}

export interface Transaction {
  id: number
  transactionRef: string
  payeeId: string
  payeeName: string | null
  amount: number
  currency: string
  type: 'DEBIT' | 'CREDIT'
  occurredAt: string | null
  status: string
  description: string | null
}

export interface InvestigationNote {
  id: number
  alertId: number
  operatorName: string
  content: string
  createdAt: string
}

export type AuditEventType =
  | 'ALERT_CREATED'
  | 'STATUS_CHANGED'
  | 'NOTE_ADDED'
  | 'ALERT_CLOSED'
  | 'ALERT_DISMISSED'
  | 'ALERT_ACKNOWLEDGED'
  | 'ALERT_INVESTIGATING'

export interface AuditEvent {
  id: number
  alertId: number
  eventType: AuditEventType
  description: string
  operatorName: string | null
  occurredAt: string
}

