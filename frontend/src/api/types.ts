export type RuleType = 'AMOUNT_THRESHOLD' | 'VELOCITY' | 'NEW_PAYEE' | 'DAILY_LIMIT'

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH'

export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'CLOSED' | 'DISMISSED'

export interface TransactionResponse {
  id: number
  accountId: string
  payeeId: string
  amount: number
  currency: string
  occurredAt: string | null
  description: string | null
}

export interface TransactionCreateRequest {
  accountId: string
  payeeId: string
  amount: number
  currency: string
  occurredAt?: string | null
  description?: string | null
}

export interface AlertResponse {
  id: number
  transactionId: number
  accountId: string
  ruleId: number
  ruleName: string
  ruleType: RuleType
  severity: Severity
  status: AlertStatus
  message: string
  lifecycleNote: string | null
  createdAt: string
  acknowledgedAt: string | null
  investigatingAt: string | null
  closedAt: string | null
  dismissedAt: string | null
}

export interface AlertStatusUpdateRequest {
  status: AlertStatus
  note?: string
}

export interface MonitoringRuleResponse {
  id: number
  name: string
  type: RuleType
  severity: Severity
  active: boolean
  amountThreshold: number | null
  velocityCount: number | null
  velocityWindowMinutes: number | null
  dailyLimit: number | null
}

export interface MonitoringRuleRequest {
  name: string
  type: RuleType
  severity: Severity
  active: boolean
  amountThreshold?: number | null
  velocityCount?: number | null
  velocityWindowMinutes?: number | null
  dailyLimit?: number | null
}

