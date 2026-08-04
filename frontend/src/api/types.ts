export type RuleType = 'AMOUNT_THRESHOLD' | 'VELOCITY' | 'NEW_PAYEE' | 'DAILY_LIMIT' | 'SDN_MATCH'

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'CLOSED' | 'DISMISSED'

export type TransactionStatus = 'PENDING' | 'APPROVED' | 'FLAGGED' | 'BLOCKED'

export interface TransactionResponse {
  id: number
  accountId: string
  payeeId: string
  payeeName: string | null
  amount: number
  currency: string
  country: string | null
  status: TransactionStatus
  occurredAt: string | null
  description: string | null
}

export interface TransactionCreateRequest {
  accountId: string
  payeeId: string
  payeeName?: string | null
  amount: number
  currency: string
  country?: string | null
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

export interface SimulatorScenario {
  scenario: string
  description: string
}

export interface SimulationResult {
  scenario: string
  description: string
  transactions: TransactionResponse[]
  alerts: AlertResponse[]
}

