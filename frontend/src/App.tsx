import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  Bell,
  Bot,
  Clock3,
  Copy,
  Download,
  FileCode2,
  LayoutDashboard,
  Moon,
  PlaySquare,
  Plus,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Sun,
  UserCheck,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'react-hot-toast'
import { getAlerts, investigateWithAi, updateAlertStatus } from './api/alerts'
import { apiRequest } from './api/client'
import { generateAiDashboardSummary } from './api/dashboard'
import { createRule, deleteRule, getRules, updateRule } from './api/rules'
import { runSimulatorScenario as runSimulatorScenarioRequest } from './api/simulator'
import { createTransaction, getTransactions } from './api/transactions'
import { InvestigationDialog } from './components/InvestigationDialog'
import { Modal } from './components/Modal'
import type {
  AiDashboardSummaryResponse,
  AiInvestigationResponse,
  AlertResponse,
  AlertStatus,
  MonitoringRuleRequest,
  MonitoringRuleResponse,
  RuleType,
  Severity,
  SimulationResult,
  TransactionResponse,
} from './api/types'
import type { InvestigationNote } from './models/alertModels'
import { formatCurrency, formatDate, riskBucket } from './utils/format'

type TabType =
  | 'dashboard'
  | 'transactions'
  | 'alerts'
  | 'rules'
  | 'simulator'
  | 'apidocs'

const TABS: Array<{ id: TabType; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'alerts', label: 'Alerts', icon: ShieldAlert },
  { id: 'rules', label: 'Monitoring Rules', icon: SlidersHorizontal },
  { id: 'simulator', label: 'Simulator', icon: PlaySquare },
  { id: 'apidocs', label: 'API Docs', icon: FileCode2 },
]

const STATUSES: AlertStatus[] = ['OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'CLOSED', 'DISMISSED']
const RULE_TYPES: RuleType[] = ['AMOUNT_THRESHOLD', 'VELOCITY', 'NEW_PAYEE', 'DAILY_LIMIT']
const SEVERITIES: Severity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

const API_DOCS = [
  { method: 'GET', path: '/api/transactions' },
  { method: 'POST', path: '/api/transactions' },
  { method: 'GET', path: '/api/alerts' },
  { method: 'GET', path: '/api/alerts/{id}' },
  { method: 'PATCH', path: '/api/alerts/{id}/status' },
  { method: 'GET', path: '/api/rules' },
  { method: 'GET', path: '/api/rules/{id}' },
  { method: 'POST', path: '/api/rules' },
  { method: 'PUT', path: '/api/rules/{id}' },
  { method: 'DELETE', path: '/api/rules/{id}' },
  { method: 'GET', path: '/api/sdn/search?name={name}&threshold=0.80' },
  { method: 'GET', path: '/api/sdn/count' },
]

const TX_CREATE_PLACEHOLDERS = {
  accountId: 'ACC-001',
  payeeId: 'PAYEE-008',
  amount: '5000',
  currency: 'USD',
}

const DEFAULT_TX_FILTERS = {
  search: '',
  status: 'ALL' as const,
  minAmount: '',
  maxAmount: '',
  sortBy: 'TIME_DESC' as const,
}

type DashboardSummary = AiDashboardSummaryResponse

type AlertSortColumn = 'id' | 'transactionId' | 'accountId' | 'severity' | 'status' | 'createdAt'
type AlertSortDirection = 'desc' | 'asc'

function getAlertCreatedToastMessage(count: number) {
  return count === 1 ? 'Alert created' : `${count} alerts created`
}

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [darkMode, setDarkMode] = useState(false)

  const [transactions, setTransactions] = useState<TransactionResponse[]>([])
  const [alerts, setAlerts] = useState<AlertResponse[]>([])
  const [rules, setRules] = useState<MonitoringRuleResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [alertFilterStatus, setAlertFilterStatus] = useState<AlertStatus | ''>('')
  const [alertFilterSeverity, setAlertFilterSeverity] = useState<Severity | ''>('')
  const [alertFilterRuleType, setAlertFilterRuleType] = useState<RuleType | ''>('')
  const [alertFilterStatusDraft, setAlertFilterStatusDraft] = useState<AlertStatus | ''>('')
  const [alertFilterSeverityDraft, setAlertFilterSeverityDraft] = useState<Severity | ''>('')
  const [alertFilterRuleTypeDraft, setAlertFilterRuleTypeDraft] = useState<RuleType | ''>('')
  const [alertSearchAlertIdDraft, setAlertSearchAlertIdDraft] = useState('')
  const [alertSearchTransactionIdDraft, setAlertSearchTransactionIdDraft] = useState('')
  const [alertSearchAccountIdDraft, setAlertSearchAccountIdDraft] = useState('')
  const [appliedAlertSearchAlertId, setAppliedAlertSearchAlertId] = useState('')
  const [appliedAlertSearchTransactionId, setAppliedAlertSearchTransactionId] = useState('')
  const [appliedAlertSearchAccountId, setAppliedAlertSearchAccountId] = useState('')
  const [alertSortColumn, setAlertSortColumn] = useState<AlertSortColumn>('createdAt')
  const [alertSortDirection, setAlertSortDirection] = useState<AlertSortDirection>('desc')
  const [selectedAlertId, setSelectedAlertId] = useState<number | null>(null)
  const [openInvestigation, setOpenInvestigation] = useState(false)
  const [notesByAlertId, setNotesByAlertId] = useState<Record<number, InvestigationNote[]>>({})
  const [pendingAlertStatus, setPendingAlertStatus] = useState<AlertStatus | null>(null)
  const [aiResult, setAiResult] = useState<AiInvestigationResponse | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const [txSearch, setTxSearch] = useState(DEFAULT_TX_FILTERS.search)
  const [txStatusFilter, setTxStatusFilter] = useState<'ALL' | 'APPROVED' | 'FLAGGED' | 'BLOCKED'>(DEFAULT_TX_FILTERS.status)
  const [txMinAmount, setTxMinAmount] = useState(DEFAULT_TX_FILTERS.minAmount)
  const [txMaxAmount, setTxMaxAmount] = useState(DEFAULT_TX_FILTERS.maxAmount)
  const [txSortBy, setTxSortBy] = useState<'TIME_DESC' | 'AMOUNT_DESC' | 'AMOUNT_ASC'>(DEFAULT_TX_FILTERS.sortBy)

  const [appliedTxSearch, setAppliedTxSearch] = useState(DEFAULT_TX_FILTERS.search)
  const [appliedTxStatusFilter, setAppliedTxStatusFilter] = useState<'ALL' | 'APPROVED' | 'FLAGGED' | 'BLOCKED'>(DEFAULT_TX_FILTERS.status)
  const [appliedTxMinAmount, setAppliedTxMinAmount] = useState(DEFAULT_TX_FILTERS.minAmount)
  const [appliedTxMaxAmount, setAppliedTxMaxAmount] = useState(DEFAULT_TX_FILTERS.maxAmount)
  const [appliedTxSortBy, setAppliedTxSortBy] = useState<'TIME_DESC' | 'AMOUNT_DESC' | 'AMOUNT_ASC'>(DEFAULT_TX_FILTERS.sortBy)
  const [selectedTxId, setSelectedTxId] = useState<number | null>(null)
  const [createdTxId, setCreatedTxId] = useState<number | null>(null)
  const [isCreateTxModalOpen, setIsCreateTxModalOpen] = useState(false)
  const ledgerTableWrapRef = useRef<HTMLDivElement | null>(null)

  const [ruleForm, setRuleForm] = useState<MonitoringRuleRequest>({
    name: '',
    type: 'AMOUNT_THRESHOLD',
    severity: 'MEDIUM',
    active: true,
    amountThreshold: 10000,
  })
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null)
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false)

  const [transactionForm, setTransactionForm] = useState({
    accountId: '',
    payeeId: '',
    amount: '',
    currency: '',
    description: '',
  })

  const [apiEndpoint, setApiEndpoint] = useState(API_DOCS[0].path)
  const [apiMethod, setApiMethod] = useState(API_DOCS[0].method)
  const [apiBody, setApiBody] = useState('{\n  "accountId": "ACC-001",\n  "payeeId": "PAYEE-009",\n  "amount": 500,\n  "currency": "GBP"\n}')
  const [apiResponse, setApiResponse] = useState('')

  const [simulatorRunning, setSimulatorRunning] = useState<string | null>(null)
  const [simulatorResult, setSimulatorResult] = useState<SimulationResult | null>(null)

  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null)
  const [showDashboardSummary, setShowDashboardSummary] = useState(false)
  const [dashboardSummaryLoading, setDashboardSummaryLoading] = useState(false)
  const [dashboardSummaryError, setDashboardSummaryError] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [transactionResult, alertResult, ruleResult] = await Promise.all([
        getTransactions(),
        getAlerts(),
        getRules(),
      ])
      setTransactions(transactionResult)
      setAlerts(alertResult)
      setRules(ruleResult)
      return {
        transactions: transactionResult,
        alerts: alertResult,
        rules: ruleResult,
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load data from backend')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const showSuccessToast = useCallback((message: string) => {
    toast.success(message, { duration: 2500 })
  }, [])

  const alertsByTransaction = useMemo(() => {
    const map = new Map<number, AlertResponse[]>()
    alerts.forEach((entry) => {
      const list = map.get(entry.transactionId) ?? []
      list.push(entry)
      map.set(entry.transactionId, list)
    })
    return map
  }, [alerts])

  const metrics = useMemo(() => {
    const openAlerts = alerts.filter((entry) => !['CLOSED', 'DISMISSED'].includes(entry.status)).length
    const highSeverity = alerts.filter((entry) => entry.severity === 'HIGH').length
    const alertsToday = alerts.filter((entry) => {
      const created = new Date(entry.createdAt)
      return created.toDateString() === new Date().toDateString()
    }).length
    const txToday = transactions.filter((entry) => {
      const occurred = entry.occurredAt ? new Date(entry.occurredAt) : null
      return occurred ? occurred.toDateString() === new Date().toDateString() : false
    }).length
    const totalVolume = transactions.reduce((sum, entry) => sum + Number(entry.amount), 0)
    return {
      openAlerts,
      highSeverity,
      alertsToday,
      txToday,
      totalTransactions: transactions.length,
      activeRules: rules.filter((entry) => entry.active).length,
      totalVolume,
    }
  }, [alerts, rules, transactions])

  const weekTrend = useMemo(
    () => ({
      transactions: metrics.totalTransactions ? 8 : 0,
      alerts: metrics.openAlerts ? -4 : 0,
      volume: metrics.totalVolume ? 12 : 0,
      rules: metrics.activeRules ? 0 : 0,
    }),
    [metrics],
  )

  const filteredAlerts = useMemo(() => {
    return alerts.filter((entry) => {
      const statusMatch = alertFilterStatus ? entry.status === alertFilterStatus : true
      const severityMatch = alertFilterSeverity ? entry.severity === alertFilterSeverity : true
      const ruleTypeMatch = alertFilterRuleType ? entry.ruleType === alertFilterRuleType : true
      const alertIdMatch = appliedAlertSearchAlertId
        ? `${entry.id}`.toLowerCase().includes(appliedAlertSearchAlertId.trim().toLowerCase())
        : true
      const transactionIdMatch = appliedAlertSearchTransactionId
        ? `${entry.transactionId}`.toLowerCase().includes(appliedAlertSearchTransactionId.trim().toLowerCase())
        : true
      const accountIdMatch = appliedAlertSearchAccountId
        ? entry.accountId.toLowerCase().includes(appliedAlertSearchAccountId.trim().toLowerCase())
        : true
      return statusMatch && severityMatch && ruleTypeMatch && alertIdMatch && transactionIdMatch && accountIdMatch
    })
  }, [
    alertFilterSeverity,
    alertFilterStatus,
    alertFilterRuleType,
    alerts,
    appliedAlertSearchAlertId,
    appliedAlertSearchTransactionId,
    appliedAlertSearchAccountId,
  ])

  const sortedAlerts = useMemo(() => {
    const severityRank: Record<Severity, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
    return [...filteredAlerts].sort((left, right) => {
      let compareValue: number

      if (alertSortColumn === 'id') {
        compareValue = left.id - right.id
      } else if (alertSortColumn === 'transactionId') {
        compareValue = left.transactionId - right.transactionId
      } else if (alertSortColumn === 'accountId') {
        compareValue = left.accountId.localeCompare(right.accountId)
      } else if (alertSortColumn === 'severity') {
        compareValue = severityRank[left.severity] - severityRank[right.severity]
      } else if (alertSortColumn === 'status') {
        compareValue = left.status.localeCompare(right.status)
      } else {
        compareValue = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
      }

      return alertSortDirection === 'desc' ? -compareValue : compareValue
    })
  }, [alertSortColumn, alertSortDirection, filteredAlerts])

  const selectedAlert = useMemo(
    () => alerts.find((entry) => entry.id === selectedAlertId) ?? null,
    [alerts, selectedAlertId],
  )

  const selectedAlertForDialog = useMemo(() => {
    if (!selectedAlert) {
      return null
    }
    if (!pendingAlertStatus || pendingAlertStatus === selectedAlert.status) {
      return selectedAlert
    }
    return {
      ...selectedAlert,
      status: pendingAlertStatus,
    }
  }, [pendingAlertStatus, selectedAlert])

  const chartData = useMemo(() => {
    const txBuckets = Array.from({ length: 8 }, (_, index) => ({ label: `${index * 3}h`, count: 0 }))
    transactions.forEach((entry) => {
      if (!entry.occurredAt) {
        return
      }
      const hour = new Date(entry.occurredAt).getHours()
      const bucketIndex = Math.min(7, Math.floor(hour / 3))
      txBuckets[bucketIndex].count += 1
    })

    const severityCount: Record<Severity, number> = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }
    const statusCount: Record<AlertStatus, number> = {
      OPEN: 0,
      ACKNOWLEDGED: 0,
      INVESTIGATING: 0,
      CLOSED: 0,
      DISMISSED: 0,
    }
    const ruleCount: Record<RuleType, number> = {
      AMOUNT_THRESHOLD: 0,
      VELOCITY: 0,
      NEW_PAYEE: 0,
      DAILY_LIMIT: 0,
      SDN_MATCH: 0,
    }
    alerts.forEach((entry) => {
      severityCount[entry.severity] += 1
      statusCount[entry.status] += 1
      ruleCount[entry.ruleType] += 1
    })

    return {
      txOverTime: txBuckets,
      bySeverity: [
        { key: 'LOW', label: 'LOW', count: severityCount.LOW, color: '#3b82f6' },
        { key: 'MEDIUM', label: 'MEDIUM', count: severityCount.MEDIUM, color: '#f59e0b' },
        { key: 'HIGH', label: 'HIGH', count: severityCount.HIGH, color: '#dc2626' },
        { key: 'CRITICAL', label: 'CRITICAL', count: severityCount.CRITICAL, color: '#6d28d9' },
      ],
      byStatus: [
        { key: 'OPEN', label: 'OPEN', count: statusCount.OPEN, color: '#dc2626' },
        { key: 'ACKNOWLEDGED', label: 'ACK', count: statusCount.ACKNOWLEDGED, color: '#f59e0b' },
        { key: 'INVESTIGATING', label: 'INV', count: statusCount.INVESTIGATING, color: '#7c3aed' },
        { key: 'CLOSED', label: 'CLOSED', count: statusCount.CLOSED, color: '#059669' },
        { key: 'DISMISSED', label: 'DISMISSED', count: statusCount.DISMISSED, color: '#64748b' },
      ],
      byRule: [
        { label: 'AMOUNT_THRESHOLD', count: ruleCount.AMOUNT_THRESHOLD },
        { label: 'VELOCITY', count: ruleCount.VELOCITY },
        { label: 'NEW_PAYEE', count: ruleCount.NEW_PAYEE },
        { label: 'DAILY_LIMIT', count: ruleCount.DAILY_LIMIT },
        { label: 'SDN_MATCH', count: ruleCount.SDN_MATCH },
      ],
    }
  }, [alerts, transactions])

  const activeWorkloadAlerts = useMemo(
    () =>
      alerts
        .filter((entry) => ['OPEN', 'ACKNOWLEDGED', 'INVESTIGATING'].includes(entry.status))
        .slice(0, 10),
    [alerts],
  )

  const buildDashboardSummaryText = useCallback((summary: DashboardSummary) => {
    return [
      summary.narrative,
      '',
      'Key Insights:',
      ...summary.insights.map((entry) => `- ${entry}`),
      '',
      'Recommended Action Steps:',
      ...summary.actionSteps.map((step) => `[${step.priority}] ${step.title}`),
    ].join('\n')
  }, [])

  const buildLocalDashboardSummary = useCallback((): DashboardSummary => {
    const openAlerts = alerts.filter((entry) => entry.status !== 'CLOSED' && entry.status !== 'DISMISSED')
    const criticalOpen = openAlerts.filter((entry) => entry.severity === 'CRITICAL')
    const highOpen = openAlerts.filter((entry) => entry.severity === 'HIGH')
    const mediumOpen = openAlerts.filter((entry) => entry.severity === 'MEDIUM')
    const flaggedOrBlocked = transactions.filter((entry) => entry.status === 'FLAGGED' || entry.status === 'BLOCKED')
    const flaggedRate = transactions.length ? Math.round((flaggedOrBlocked.length / transactions.length) * 100) : 0
    const activeRules = rules.filter((rule) => rule.active).length

    const narrative = `Across ${transactions.length} monitored transactions, ${flaggedOrBlocked.length} (${flaggedRate}%) were flagged or blocked. There are currently ${openAlerts.length} open alerts (${criticalOpen.length} critical, ${highOpen.length} high, ${mediumOpen.length} medium) tracked against ${activeRules} active monitoring rules.`

    const insights = [
      `${transactions.length} total transactions, ${flaggedOrBlocked.length} flagged or blocked (${flaggedRate}%).`,
      `${openAlerts.length} open alerts awaiting resolution.`,
      `${criticalOpen.length} critical-severity alerts require immediate attention.`,
      `${activeRules} of ${rules.length} monitoring rules are currently active.`,
    ]

    const actionSteps: DashboardSummary['actionSteps'] = []
    if (criticalOpen.length) {
      actionSteps.push({
        priority: 'CRITICAL',
        title: `Resolve ${criticalOpen.length} critical alert${criticalOpen.length === 1 ? '' : 's'}`,
        details: criticalOpen.slice(0, 5).map((entry) => `Alert #${entry.id}: ${entry.ruleName} on account ${entry.accountId}`),
      })
    }
    if (highOpen.length) {
      actionSteps.push({
        priority: 'HIGH',
        title: `Review ${highOpen.length} high-severity alert${highOpen.length === 1 ? '' : 's'}`,
        details: highOpen.slice(0, 5).map((entry) => `Alert #${entry.id}: ${entry.ruleName} on account ${entry.accountId}`),
      })
    }
    if (mediumOpen.length) {
      actionSteps.push({
        priority: 'MEDIUM',
        title: `Triage ${mediumOpen.length} medium-severity alert${mediumOpen.length === 1 ? '' : 's'}`,
        details: mediumOpen.slice(0, 5).map((entry) => `Alert #${entry.id}: ${entry.ruleName} on account ${entry.accountId}`),
      })
    }

    return {
      generatedAt: new Date().toLocaleString(),
      narrative,
      insights,
      actionSteps,
      model: 'local-heuristic',
    }
  }, [alerts, transactions, rules])

  const generateDashboardSummary = useCallback(async () => {
    setDashboardSummaryLoading(true)
    setDashboardSummaryError(null)
    try {
      const result = await generateAiDashboardSummary()
      setDashboardSummary(result)
    } catch (summaryRequestError) {
      const message = summaryRequestError instanceof Error ? summaryRequestError.message : 'AI summary generation failed'
      setDashboardSummaryError(`${message} - showing a locally computed summary instead.`)
      setDashboardSummary(buildLocalDashboardSummary())
    } finally {
      setDashboardSummaryLoading(false)
      setShowDashboardSummary(true)
    }
  }, [buildLocalDashboardSummary])

  const copyDashboardSummary = useCallback(async () => {
    if (!dashboardSummary) {
      return
    }
    try {
      await navigator.clipboard.writeText(buildDashboardSummaryText(dashboardSummary))
      showSuccessToast('Summary copied to clipboard')
    } catch {
      toast.error('Failed to copy summary')
    }
  }, [buildDashboardSummaryText, dashboardSummary, showSuccessToast])

  const downloadDashboardSummary = useCallback(() => {
    if (!dashboardSummary) {
      return
    }
    const blob = new Blob([buildDashboardSummaryText(dashboardSummary)], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `dashboard-summary-${Date.now()}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }, [buildDashboardSummaryText, dashboardSummary])

  const applyAlertFilters = useCallback(() => {
    setAlertFilterStatus(alertFilterStatusDraft)
    setAlertFilterSeverity(alertFilterSeverityDraft)
    setAlertFilterRuleType(alertFilterRuleTypeDraft)
    setAppliedAlertSearchAlertId(alertSearchAlertIdDraft)
    setAppliedAlertSearchTransactionId(alertSearchTransactionIdDraft)
    setAppliedAlertSearchAccountId(alertSearchAccountIdDraft)
  }, [
    alertFilterStatusDraft,
    alertFilterSeverityDraft,
    alertFilterRuleTypeDraft,
    alertSearchAlertIdDraft,
    alertSearchTransactionIdDraft,
    alertSearchAccountIdDraft,
  ])

  const resetAlertFilters = useCallback(() => {
    setAlertFilterStatus('')
    setAlertFilterSeverity('')
    setAlertFilterRuleType('')
    setAlertFilterStatusDraft('')
    setAlertFilterSeverityDraft('')
    setAlertFilterRuleTypeDraft('')
    setAlertSearchAlertIdDraft('')
    setAlertSearchTransactionIdDraft('')
    setAlertSearchAccountIdDraft('')
    setAppliedAlertSearchAlertId('')
    setAppliedAlertSearchTransactionId('')
    setAppliedAlertSearchAccountId('')
  }, [])

  const toggleAlertSort = useCallback((column: AlertSortColumn) => {
    if (alertSortColumn === column) {
      setAlertSortDirection((prevDirection) => (prevDirection === 'asc' ? 'desc' : 'asc'))
      return
    }

    setAlertSortColumn(column)
    setAlertSortDirection('asc')
  }, [alertSortColumn])

  const derivedTransactions = useMemo(() => {
    const sortedTransactions = transactions
      .map((entry) => {
        const linkedAlerts = alertsByTransaction.get(entry.id) ?? []
        return { ...entry, derivedStatus: entry.status ?? 'APPROVED', linkedAlerts }
      })
      .filter((entry) => {
        const searchValue = appliedTxSearch.trim().toLowerCase()
        const searchMatch =
          searchValue.length === 0 ||
          `${entry.id}`.includes(searchValue) ||
          entry.accountId.toLowerCase().includes(searchValue) ||
          entry.payeeId.toLowerCase().includes(searchValue)
        const statusMatch = appliedTxStatusFilter === 'ALL' ? true : entry.derivedStatus === appliedTxStatusFilter
        const minMatch = appliedTxMinAmount ? Number(entry.amount) >= Number(appliedTxMinAmount) : true
        const maxMatch = appliedTxMaxAmount ? Number(entry.amount) <= Number(appliedTxMaxAmount) : true
        return searchMatch && statusMatch && minMatch && maxMatch
      })
      .sort((left, right) => {
        if (appliedTxSortBy === 'AMOUNT_ASC') {
          return Number(left.amount) - Number(right.amount)
        }
        if (appliedTxSortBy === 'AMOUNT_DESC') {
          return Number(right.amount) - Number(left.amount)
        }
        return (new Date(right.occurredAt ?? 0).getTime() || 0) - (new Date(left.occurredAt ?? 0).getTime() || 0)
      })

    if (createdTxId === null) {
      return sortedTransactions
    }

    const createdTransactionIndex = sortedTransactions.findIndex((entry) => entry.id === createdTxId)

    if (createdTransactionIndex <= 0) {
      return sortedTransactions
    }

    const createdTransaction = sortedTransactions[createdTransactionIndex]
    const withoutCreatedTransaction = sortedTransactions.filter((entry) => entry.id !== createdTxId)
    return [createdTransaction, ...withoutCreatedTransaction]
  }, [
    alertsByTransaction,
    appliedTxMaxAmount,
    appliedTxMinAmount,
    appliedTxSearch,
    appliedTxSortBy,
    appliedTxStatusFilter,
    createdTxId,
    transactions,
  ])

  useEffect(() => {
    if (createdTxId === null || activeTab !== 'transactions') {
      return
    }

    const createdRow = document.getElementById(`ledger-transaction-row-${createdTxId}`)

    if (createdRow instanceof HTMLElement) {
      createdRow.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    ledgerTableWrapRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [activeTab, createdTxId, derivedTransactions])

  useEffect(() => {
    setCreatedTxId(null)
  }, [appliedTxSearch, appliedTxStatusFilter, appliedTxMinAmount, appliedTxMaxAmount, appliedTxSortBy])

  const selectedTx = useMemo(
    () => derivedTransactions.find((entry) => entry.id === selectedTxId) ?? null,
    [derivedTransactions, selectedTxId],
  )

  const applyTransactionFilters = useCallback(() => {
    setAppliedTxSearch(txSearch)
    setAppliedTxStatusFilter(txStatusFilter)
    setAppliedTxMinAmount(txMinAmount)
    setAppliedTxMaxAmount(txMaxAmount)
    setAppliedTxSortBy(txSortBy)
  }, [txMaxAmount, txMinAmount, txSearch, txSortBy, txStatusFilter])

  const resetTransactionFilters = useCallback(() => {
    setTxSearch(DEFAULT_TX_FILTERS.search)
    setTxStatusFilter(DEFAULT_TX_FILTERS.status)
    setTxMinAmount(DEFAULT_TX_FILTERS.minAmount)
    setTxMaxAmount(DEFAULT_TX_FILTERS.maxAmount)
    setTxSortBy(DEFAULT_TX_FILTERS.sortBy)
    setAppliedTxSearch(DEFAULT_TX_FILTERS.search)
    setAppliedTxStatusFilter(DEFAULT_TX_FILTERS.status)
    setAppliedTxMinAmount(DEFAULT_TX_FILTERS.minAmount)
    setAppliedTxMaxAmount(DEFAULT_TX_FILTERS.maxAmount)
    setAppliedTxSortBy(DEFAULT_TX_FILTERS.sortBy)
    setCreatedTxId(null)
  }, [])

  const saveTransaction = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    try {
      const createdTransaction = await createTransaction({
        accountId: transactionForm.accountId,
        payeeId: transactionForm.payeeId,
        amount: Number(transactionForm.amount),
        currency: transactionForm.currency.toUpperCase(),
        description: transactionForm.description || null,
      })

      setTransactions((prev) => [createdTransaction, ...prev.filter((entry) => entry.id !== createdTransaction.id)])
      setCreatedTxId(createdTransaction.id)

      setTransactionForm({
        accountId: '',
        payeeId: '',
        amount: '',
        currency: '',
        description: '',
      })
      setIsCreateTxModalOpen(false)

      // Keep dashboard metrics consistent while the new row is shown immediately in the ledger.
      void loadAll()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to create transaction')
    }
  }

  const openInvestigateDialog = useCallback((alertId: number) => {
    setSelectedAlertId(alertId)
    setPendingAlertStatus(null)
    setAiResult(null)
    setAiError(null)
    setOpenInvestigation(true)
  }, [])

  const closeInvestigateDialog = useCallback(() => {
    setOpenInvestigation(false)
    setSelectedAlertId(null)
    setPendingAlertStatus(null)
    setAiResult(null)
    setAiError(null)
  }, [])

  const handleWorkflowStatusChange = useCallback((status: AlertStatus) => {
    setPendingAlertStatus(status)
  }, [])

  const postInvestigationNote = useCallback(async (content: string) => {
    if (!selectedAlert) {
      return
    }
    const nextNote: InvestigationNote = {
      id: Date.now(),
      alertId: selectedAlert.id,
      operatorName: 'Current User',
      content,
      createdAt: new Date().toISOString(),
    }
    setNotesByAlertId((prev) => ({
      ...prev,
      [selectedAlert.id]: [...(prev[selectedAlert.id] ?? []), nextNote],
    }))
  }, [selectedAlert])

  const saveInvestigation = useCallback(async () => {
    if (!selectedAlert) {
      return
    }
    setError(null)
    try {
      const statusToPersist = pendingAlertStatus ?? selectedAlert.status

      if (statusToPersist !== selectedAlert.status) {
        await updateAlertStatus(selectedAlert.id, { status: statusToPersist })
        const statusLabel = statusToPersist.charAt(0) + statusToPersist.slice(1).toLowerCase()
        showSuccessToast(`Alert status updated to ${statusLabel}`)
      } else {
        showSuccessToast('Investigation saved')
      }

      await loadAll()
      setPendingAlertStatus(null)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save investigation')
      throw saveError
    }
  }, [loadAll, pendingAlertStatus, selectedAlert, showSuccessToast])

  const onInvestigateWithAi = async () => {
    if (!selectedAlert) {
      return
    }
    setAiLoading(true)
    setAiError(null)
    try {
      const result = await investigateWithAi(selectedAlert.id)
      setAiResult(result)
    } catch (aiRequestError) {
      const message = aiRequestError instanceof Error ? aiRequestError.message : 'AI investigation failed'
      setAiError(message)
      toast.error(message)
    } finally {
      setAiLoading(false)
    }
  }

  const submitRule = async (event: FormEvent) => {
    event.preventDefault()
    const payload: MonitoringRuleRequest = {
      name: ruleForm.name,
      type: ruleForm.type,
      severity: ruleForm.severity,
      active: ruleForm.active,
      amountThreshold: ruleForm.type === 'AMOUNT_THRESHOLD' ? Number(ruleForm.amountThreshold) : null,
      velocityCount: ruleForm.type === 'VELOCITY' ? Number(ruleForm.velocityCount) : null,
      velocityWindowMinutes: ruleForm.type === 'VELOCITY' ? Number(ruleForm.velocityWindowMinutes) : null,
      dailyLimit: ruleForm.type === 'DAILY_LIMIT' ? Number(ruleForm.dailyLimit) : null,
    }
    setError(null)
    const isCreatingRule = editingRuleId === null
    try {
      if (editingRuleId) {
        await updateRule(editingRuleId, payload)
      } else {
        await createRule(payload)
      }
      setEditingRuleId(null)
      setRuleForm({
        name: '',
        type: 'AMOUNT_THRESHOLD',
        severity: 'MEDIUM',
        active: true,
        amountThreshold: 10000,
      })
      setIsRuleModalOpen(false)
      await loadAll()
      showSuccessToast(isCreatingRule ? 'Rule created' : 'Rule updated successfully')
    } catch (ruleError) {
      setError(ruleError instanceof Error ? ruleError.message : 'Failed to save rule')
    }
  }

  const closeRuleModal = useCallback(() => {
    setIsRuleModalOpen(false)
    setEditingRuleId(null)
    setRuleForm({
      name: '',
      type: 'AMOUNT_THRESHOLD',
      severity: 'MEDIUM',
      active: true,
      amountThreshold: 10000,
    })
  }, [])

  const removeRule = async (id: number) => {
    setError(null)
    try {
      await deleteRule(id)
      await loadAll()
      showSuccessToast('Rule deleted')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete rule')
    }
  }

  const runSimulatorScenario = async (scenario: string) => {
    setError(null)
    setSimulatorRunning(scenario)
    try {
      const result = await runSimulatorScenarioRequest(scenario)
      setSimulatorResult(result)
      await loadAll()
      if (result.alerts.length > 0) {
        showSuccessToast(getAlertCreatedToastMessage(result.alerts.length))
      }
    } catch (simulationError) {
      setError(simulationError instanceof Error ? simulationError.message : 'Simulator run failed')
    } finally {
      setSimulatorRunning(null)
    }
  }

  const toggleRuleActive = async (rule: MonitoringRuleResponse) => {
    await updateRule(rule.id, {
      name: rule.name,
      type: rule.type,
      severity: rule.severity,
      active: !rule.active,
      amountThreshold: rule.amountThreshold,
      velocityCount: rule.velocityCount,
      velocityWindowMinutes: rule.velocityWindowMinutes,
      dailyLimit: rule.dailyLimit,
    })
    await loadAll()
  }

  const runApiRequest = async () => {
    setApiResponse('Running request...')
    try {
      const payload = apiMethod === 'GET' || apiMethod === 'DELETE' ? undefined : JSON.parse(apiBody)
      const result = await apiRequest<unknown>(apiEndpoint, {
        method: apiMethod,
        body: payload ? JSON.stringify(payload) : undefined,
      })
      setApiResponse(JSON.stringify(result, null, 2))
    } catch (requestError) {
      setApiResponse(requestError instanceof Error ? requestError.message : 'Request failed')
    }
  }

  const pageTitle = TABS.find((entry) => entry.id === activeTab)?.label ?? 'Dashboard'

  return (
    <div className={darkMode ? 'shell theme-dark' : 'shell'}>
      <aside className="left-nav">
        <div className="brand-block">
          <span className="brand-logo">FBI</span>
          <div>
            <h1>Financial Intelligence</h1>
            <p>AML Monitoring Platform</p>
          </div>
        </div>
        <nav className="tab-list">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                className={tab.id === activeTab ? 'tab-btn active' : 'tab-btn'}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <span className="tab-label">
                  <Icon size={15} />
                  {tab.label}
                </span>
                {tab.id === 'alerts' && metrics.openAlerts > 0 ? (
                  <span className="pill-alert">{metrics.openAlerts}</span>
                ) : null}
              </button>
            )
          })}
        </nav>
      </aside>

      <section className="workspace">
        <header className="top-header">
          <div>
            <h2>{pageTitle}</h2>
            <p>Rule Engine Active - Single operator compliance workflow</p>
          </div>
          <div className="top-header-actions">
            {activeTab === 'transactions' ? (
              <button className="primary" type="button" onClick={() => setIsCreateTxModalOpen(true)}>
                <Plus size={15} />
                Record Transaction
              </button>
            ) : null}
            {activeTab === 'rules' ? (
              <button className="primary" type="button" onClick={() => setIsRuleModalOpen(true)}>
                <Plus size={15} />
                Create Monitoring Rule
              </button>
            ) : null}
            <span className="status-pill">
              <Activity size={14} />
              Live
            </span>
            <button className="ghost icon-btn" type="button" onClick={() => setDarkMode((prev) => !prev)}>
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button className="primary icon-btn" type="button" onClick={() => void loadAll()}>
              <Bell size={14} />
            </button>
            <div className="avatar-chip">
              <UserCheck size={14} /> OP
            </div>
          </div>
        </header>

        {error ? <p className="error-banner">{error}</p> : null}

        {activeTab === 'dashboard' ? (
          <div className="panel-stack">
            <section className="kpi-grid">
              <article className="card metric-card">
                <h3>Total Recorded Transactions</h3>
                <p>{metrics.totalTransactions}</p>
                <span className="trend up">+{weekTrend.transactions}% WoW</span>
              </article>
              <article className="card metric-card">
                <h3>Flagged High-Risk Alerts</h3>
                <p className="critical">{metrics.highSeverity}</p>
                <span className="trend down">{weekTrend.alerts}% WoW</span>
              </article>
              <article className="card metric-card">
                <h3>Total Monitored Volume</h3>
                <p>{formatCurrency(metrics.totalVolume, 'GBP')}</p>
                <span className="trend up">+{weekTrend.volume}% WoW</span>
              </article>
              <article className="card metric-card">
                <h3>Active Monitoring Rules</h3>
                <p>{metrics.activeRules}</p>
                <span className="trend neutral">Stable</span>
              </article>
            </section>

            <section className="chart-grid">
              <article className="card chart-card">
                <h3>Transactions Over Time</h3>
                <div className="chart-area">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.txOverTime}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#dc2626" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="card chart-card">
                <h3>Alert Severity Distribution</h3>
                <div className="chart-area">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.bySeverity}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {chartData.bySeverity.map((entry) => (
                          <Cell key={entry.key} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="card chart-card">
                <h3>Alert Lifecycle Breakdown</h3>
                <div className="chart-area">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={chartData.byStatus} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={90} innerRadius={45}>
                        {chartData.byStatus.map((entry) => (
                          <Cell key={entry.key} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </article>

              <article className="card chart-card">
                <h3>Alerts by Rule Type</h3>
                <div className="chart-area">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.byRule} layout="vertical" margin={{ left: 56, right: 12 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis dataKey="label" type="category" width={156} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#7c3aed" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </article>
            </section>

            <section className="card">
              <h3>Recent Alerts Workload</h3>
              <p className="muted table-caption">Priority queue for immediate investigation</p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Alert ID</th>
                      <th>Severity</th>
                      <th>Rule Name</th>
                      <th>Account</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeWorkloadAlerts.map((entry) => (
                      <tr key={entry.id}>
                        <td className="mono">#{entry.id}</td>
                        <td>
                          <span className={`badge sev-${entry.severity.toLowerCase()}`}>{entry.severity}</span>
                        </td>
                        <td>{entry.ruleName}</td>
                        <td className="mono">{entry.accountId}</td>
                        <td>
                          <span className={`badge st-${entry.status.toLowerCase()}`}>{entry.status}</span>
                        </td>
                        <td className="mono">{formatDate(entry.createdAt)}</td>
                        <td>
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => {
                              setActiveTab('alerts')
                              openInvestigateDialog(entry.id)
                            }}
                          >
                            Investigate
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!activeWorkloadAlerts.length ? (
                      <tr>
                        <td colSpan={7} className="muted">
                          No active alerts in the current workload.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="card dashboard-summary">
              <div className="dashboard-summary-header">
                <div>
                  <h3>AI Dashboard Summary</h3>
                  <p className="muted">Generate a concise summary and insights inferred from current dashboard activity.</p>
                </div>
                <div className="dashboard-summary-actions">
                  <button
                    className="primary dashboard-summary-btn"
                    type="button"
                    onClick={() => void generateDashboardSummary()}
                    disabled={dashboardSummaryLoading}
                  >
                    <Bot size={15} />
                    {dashboardSummaryLoading ? 'Generating...' : dashboardSummary ? 'Refresh Summary' : 'Generate Summary'}
                  </button>
                  <button className="ghost dashboard-summary-btn" type="button" onClick={() => void copyDashboardSummary()} disabled={!dashboardSummary}>
                    <Copy size={15} />
                    Copy
                  </button>
                  <button className="ghost dashboard-summary-btn" type="button" onClick={downloadDashboardSummary} disabled={!dashboardSummary}>
                    <Download size={15} />
                    Download
                  </button>
                </div>
              </div>

              {dashboardSummaryError ? <p className="error-text">{dashboardSummaryError}</p> : null}

              {showDashboardSummary && dashboardSummary ? (
                <div className="dashboard-summary-body">
                  <p className="muted">
                    Generated: {dashboardSummary.generatedAt}
                  </p>
                  <p>{dashboardSummary.narrative}</p>
                  <h4>Key Insights</h4>
                  <ul className="dashboard-summary-list">
                    {dashboardSummary.insights.map((insight) => (
                      <li key={insight}>{insight}</li>
                    ))}
                  </ul>


                  <h4 style={{ marginTop: '16px' }}>Recommended Action Steps</h4>
                  <div className="action-steps">
                    {dashboardSummary.actionSteps.map((step, index) => (
                      <div key={index} className={`action-step action-step-${step.priority.toLowerCase()}`}>
                        <div className="action-step-header">
                          <span className={`action-priority-badge badge sev-${step.priority === 'CRITICAL' ? 'critical' : step.priority === 'HIGH' ? 'high' : 'medium'}`}>
                            {step.priority}
                          </span>
                          <h5>{step.title}</h5>
                        </div>
                        <ol className="action-step-details">
                          {step.details.map((detail) => (
                            <li key={detail}>{detail}</li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        ) : null}

        {activeTab === 'transactions' ? (
          <div className="panel-stack">
            {isCreateTxModalOpen ? (
              <Modal
                isOpen={isCreateTxModalOpen}
                onClose={() => setIsCreateTxModalOpen(false)}
                titleId="create-transaction-modal-title"
              >
                <form className="form-grid" onSubmit={saveTransaction}>
                  <h3 id="create-transaction-modal-title">Create Transaction</h3>
                  <label>
                    Account ID
                    <input
                      value={transactionForm.accountId}
                      onChange={(event) => setTransactionForm((prev) => ({ ...prev, accountId: event.target.value }))}
                      placeholder={TX_CREATE_PLACEHOLDERS.accountId}
                      required
                    />
                  </label>
                  <label>
                    Payee ID
                    <input
                      value={transactionForm.payeeId}
                      onChange={(event) => setTransactionForm((prev) => ({ ...prev, payeeId: event.target.value }))}
                      placeholder={TX_CREATE_PLACEHOLDERS.payeeId}
                      required
                    />
                  </label>
                  <label>
                    Amount
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={transactionForm.amount}
                      onChange={(event) => setTransactionForm((prev) => ({ ...prev, amount: event.target.value }))}
                      placeholder={TX_CREATE_PLACEHOLDERS.amount}
                      required
                    />
                  </label>
                  <label>
                    Currency
                    <input
                      value={transactionForm.currency}
                      maxLength={3}
                      onChange={(event) => setTransactionForm((prev) => ({ ...prev, currency: event.target.value }))}
                      placeholder={TX_CREATE_PLACEHOLDERS.currency}
                      required
                    />
                  </label>
                  <label className="span-2">
                    Description
                    <input
                      value={transactionForm.description}
                      onChange={(event) => setTransactionForm((prev) => ({ ...prev, description: event.target.value }))}
                    />
                  </label>
                  <button className="primary" type="submit">
                    Create Transaction
                  </button>
                </form>
              </Modal>
            ) : null}

            <section className="card tx-toolbar">
              <div className="toolbar-item search-wrap">
                <Search size={15} />
                <input
                  placeholder="Search Tx ID, account, payee"
                  value={txSearch}
                  onChange={(event) => setTxSearch(event.target.value)}
                />
              </div>
              <select value={txStatusFilter} onChange={(event) => setTxStatusFilter(event.target.value as typeof txStatusFilter)}>
                <option value="ALL">All Status</option>
                <option value="APPROVED">APPROVED</option>
                <option value="FLAGGED">FLAGGED</option>
                <option value="BLOCKED">BLOCKED</option>
              </select>
              <input placeholder="Min Amount" value={txMinAmount} onChange={(event) => setTxMinAmount(event.target.value)} />
              <input placeholder="Max Amount" value={txMaxAmount} onChange={(event) => setTxMaxAmount(event.target.value)} />
              <select
                className="tx-sort-select"
                value={txSortBy}
                onChange={(event) => setTxSortBy(event.target.value as typeof txSortBy)}
              >
                <option value="TIME_DESC">Newest</option>
                <option value="AMOUNT_DESC">Amount High-Low</option>
                <option value="AMOUNT_ASC">Amount Low-High</option>
              </select>
              <div className="tx-toolbar-actions">
                <button type="button" className="primary" onClick={applyTransactionFilters}>
                  Apply Filters
                </button>
                <button type="button" className="ghost" onClick={resetTransactionFilters}>
                  Reset Filters
                </button>
              </div>
            </section>

            <section className="card">
              <h3>Transactions Ledger ({derivedTransactions.length})</h3>
              <div ref={ledgerTableWrapRef} className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Tx ID</th>
                      <th>Timestamp</th>
                      <th>Debtor Account</th>
                      <th>Creditor Payee</th>
                      <th>Amount</th>
                      <th>Risk Score</th>
                      <th>Rule Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {derivedTransactions.map((entry) => (
                      <tr
                        key={entry.id}
                        id={`ledger-transaction-row-${entry.id}`}
                        className={entry.id === createdTxId ? 'new-transaction-row' : undefined}
                      >
                        <td className="mono">TX-{entry.id}</td>
                        <td className="mono">{formatDate(entry.occurredAt)}</td>
                        <td className="mono">{entry.accountId}</td>
                        <td className="mono">{entry.payeeId}</td>
                        <td>{formatCurrency(Number(entry.amount), entry.currency)}</td>
                        <td>
                          <span className={`badge sev-${riskBucket(entry.riskScore)}`}>{entry.riskScore}</span>
                        </td>
                        <td>
                          <span className={`badge tx-${(entry.derivedStatus ?? 'approved').toLowerCase()}`}>{entry.derivedStatus}</span>
                        </td>
                        <td>
                          <button type="button" className="ghost" onClick={() => setSelectedTxId(entry.id)}>
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {selectedTx ? (
              <Modal isOpen={selectedTx !== null} onClose={() => setSelectedTxId(null)} titleId="transaction-modal-title">
                <h3 id="transaction-modal-title">Transaction Detail - TX-{selectedTx.id}</h3>
                <p className="muted">Rule evaluation breakdown and linked alerts for investigation context.</p>
                <div className="split-grid">
                  <div>
                    <h4>Evaluated Rules</h4>
                    <ul>
                      {RULE_TYPES.map((ruleType) => {
                        const triggered = selectedTx.linkedAlerts.some((alert) => alert.ruleType === ruleType)
                        return <li key={ruleType}>{ruleType}: {triggered ? 'TRUE' : 'FALSE'}</li>
                      })}
                    </ul>
                  </div>
                  <div>
                    <h4>Linked Alert IDs</h4>
                    {selectedTx.linkedAlerts.length ? (
                      <ul>
                        {selectedTx.linkedAlerts.map((alert) => (
                          <li key={alert.id}>AL-{alert.id} ({alert.severity})</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted">No linked alerts.</p>
                    )}
                  </div>
                </div>
              </Modal>
            ) : null}
          </div>
        ) : null}

        {activeTab === 'alerts' ? (
          <div className="panel-stack">

            <section className="card">
              <h3>Filter Alerts</h3>
              <div className="alerts-filter-row">
                <label>
                  Alert ID
                  <input
                    placeholder="e.g. 120"
                    value={alertSearchAlertIdDraft}
                    onChange={(event) => setAlertSearchAlertIdDraft(event.target.value)}
                  />
                </label>
                <label>
                  Tid
                  <input
                    placeholder="e.g. 4501"
                    value={alertSearchTransactionIdDraft}
                    onChange={(event) => setAlertSearchTransactionIdDraft(event.target.value)}
                  />
                </label>
                <label>
                  Acc Id
                  <input
                    placeholder="e.g. ACC-001"
                    value={alertSearchAccountIdDraft}
                    onChange={(event) => setAlertSearchAccountIdDraft(event.target.value)}
                  />
                </label>
                <label>
                  Severity
                  <select value={alertFilterSeverityDraft} onChange={(event) => setAlertFilterSeverityDraft(event.target.value as Severity | '')}>
                    <option value="">All</option>
                    {SEVERITIES.map((entry) => (
                      <option key={entry} value={entry}>{entry}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Rule Type
                  <select value={alertFilterRuleTypeDraft} onChange={(event) => setAlertFilterRuleTypeDraft(event.target.value as RuleType | '')}>
                    <option value="">All</option>
                    {RULE_TYPES.map((entry) => (
                      <option key={entry} value={entry}>{entry}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Status
                  <select value={alertFilterStatusDraft} onChange={(event) => setAlertFilterStatusDraft(event.target.value as AlertStatus | '')}>
                    <option value="">All</option>
                    {STATUSES.map((entry) => (
                      <option key={entry} value={entry}>{entry}</option>
                    ))}
                  </select>
                </label>
                <div className="alerts-filter-actions">
                  <button type="button" className="primary alerts-filter-submit" onClick={applyAlertFilters}>Apply Filter</button>
                  <button type="button" className="ghost alerts-filter-submit" onClick={resetAlertFilters}>Reset Filter</button>
                </div>
              </div>
            </section>

            <section className="card">
              <h3>Investigation Queue ({sortedAlerts.length})</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>
                        <button type="button" className="sort-header" onClick={() => toggleAlertSort('id')}>
                          Alert ID {alertSortColumn === 'id' ? (alertSortDirection === 'desc' ? '\u25BC' : '\u25B2') : '\u21C5'}
                        </button>
                      </th>
                      <th>
                        <button type="button" className="sort-header" onClick={() => toggleAlertSort('severity')}>
                          Severity {alertSortColumn === 'severity' ? (alertSortDirection === 'desc' ? '\u25BC' : '\u25B2') : '\u21C5'}
                        </button>
                      </th>
                      <th>Triggered Rule</th>
                      <th>Related Account</th>
                      <th>Related Txns</th>
                      <th>
                        <button type="button" className="sort-header" onClick={() => toggleAlertSort('status')}>
                          Current Status {alertSortColumn === 'status' ? (alertSortDirection === 'desc' ? '\u25BC' : '\u25B2') : '\u21C5'}
                        </button>
                      </th>
                      <th>
                        <button type="button" className="sort-header" onClick={() => toggleAlertSort('createdAt')}>
                          Created Time {alertSortColumn === 'createdAt' ? (alertSortDirection === 'desc' ? '\u25BC' : '\u25B2') : '\u21C5'}
                        </button>
                      </th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedAlerts.map((entry) => (
                      <tr key={entry.id}>
                        <td className="mono">AL-{entry.id}</td>
                        <td>
                          <span className={`badge sev-${entry.severity.toLowerCase()}`}>{entry.severity}</span>
                        </td>
                        <td>{entry.ruleName}</td>
                        <td className="mono">{entry.accountId}</td>
                        <td className="mono">TX-{entry.transactionId} (1 tx)</td>
                        <td>
                          <span className={`badge st-${entry.status.toLowerCase()}`}>{entry.status}</span>
                        </td>
                        <td className="mono">{formatDate(entry.createdAt)}</td>
                        <td>
                          <button type="button" className="ghost" onClick={() => openInvestigateDialog(entry.id)}>
                            Open Workspace &gt;
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!sortedAlerts.length ? (
                      <tr>
                        <td className="empty-row" colSpan={8}>
                          No alerts matched the selected filters.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === 'rules' ? (
          <div className="panel-stack">
            {isRuleModalOpen ? (
              <Modal isOpen={isRuleModalOpen} onClose={closeRuleModal} titleId="rule-modal-title">
                <form className="form-grid" onSubmit={submitRule}>
                  <h3 id="rule-modal-title">{editingRuleId ? `Edit Rule #${editingRuleId}` : 'Create Monitoring Rule'}</h3>
                  <label>
                    Rule Name
                    <input value={ruleForm.name} onChange={(event) => setRuleForm((prev) => ({ ...prev, name: event.target.value }))} required />
                  </label>
                  <label>
                    Rule Type
                    <select value={ruleForm.type} onChange={(event) => setRuleForm((prev) => ({ ...prev, type: event.target.value as RuleType }))}>
                      {RULE_TYPES.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
                    </select>
                  </label>
                  <label>
                    Severity
                    <select value={ruleForm.severity} onChange={(event) => setRuleForm((prev) => ({ ...prev, severity: event.target.value as Severity }))}>
                      {SEVERITIES.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
                    </select>
                  </label>

                  {ruleForm.type === 'AMOUNT_THRESHOLD' ? (
                    <label>
                      Amount Limit
                      <input type="number" value={ruleForm.amountThreshold ?? ''} onChange={(event) => setRuleForm((prev) => ({ ...prev, amountThreshold: Number(event.target.value) }))} />
                    </label>
                  ) : null}
                  {ruleForm.type === 'VELOCITY' ? (
                    <>
                      <label>
                        Max Tx Count
                        <input type="number" value={ruleForm.velocityCount ?? ''} onChange={(event) => setRuleForm((prev) => ({ ...prev, velocityCount: Number(event.target.value) }))} />
                      </label>
                      <label>
                        Window Minutes
                        <input type="number" value={ruleForm.velocityWindowMinutes ?? ''} onChange={(event) => setRuleForm((prev) => ({ ...prev, velocityWindowMinutes: Number(event.target.value) }))} />
                      </label>
                    </>
                  ) : null}
                  {ruleForm.type === 'DAILY_LIMIT' ? (
                    <label>
                      Daily Limit
                      <input type="number" value={ruleForm.dailyLimit ?? ''} onChange={(event) => setRuleForm((prev) => ({ ...prev, dailyLimit: Number(event.target.value) }))} />
                    </label>
                  ) : null}

                  <label className="checkbox-row">
                    <input type="checkbox" checked={ruleForm.active} onChange={(event) => setRuleForm((prev) => ({ ...prev, active: event.target.checked }))} />
                    Active
                  </label>

                  <button className="primary" type="submit">{editingRuleId ? 'Update Rule' : 'Create Rule'}</button>
                </form>
              </Modal>
            ) : null}

            <section className="card">
              <h3>Rules Catalog ({rules.length})</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Rule Name</th>
                      <th>Type</th>
                      <th>Configured Parameters</th>
                      <th>Severity</th>
                      <th>Active</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map((entry) => (
                      <tr key={entry.id}>
                        <td>{entry.name}</td>
                        <td className="mono">{entry.type}</td>
                        <td className="mono">
                          {entry.amountThreshold ? `threshold=${entry.amountThreshold}` : ''}
                          {entry.velocityCount ? ` count=${entry.velocityCount}` : ''}
                          {entry.velocityWindowMinutes ? ` window=${entry.velocityWindowMinutes}m` : ''}
                          {entry.dailyLimit ? ` daily=${entry.dailyLimit}` : ''}
                        </td>
                        <td><span className={`badge sev-${entry.severity.toLowerCase()}`}>{entry.severity}</span></td>
                        <td>
                          <button type="button" className={entry.active ? 'switch on' : 'switch'} onClick={() => void toggleRuleActive(entry)}>
                            {entry.active ? 'ON' : 'OFF'}
                          </button>
                        </td>
                        <td className="actions-cell">
                          <button
                            type="button"
                            className="ghost"
                            onClick={() => {
                              setEditingRuleId(entry.id)
                              setRuleForm({
                                name: entry.name,
                                type: entry.type,
                                severity: entry.severity,
                                active: entry.active,
                                amountThreshold: entry.amountThreshold,
                                velocityCount: entry.velocityCount,
                                velocityWindowMinutes: entry.velocityWindowMinutes,
                                dailyLimit: entry.dailyLimit,
                              })
                              setIsRuleModalOpen(true)
                            }}
                          >
                            Edit
                          </button>
                          <button type="button" className="danger" onClick={() => void removeRule(entry.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : null}

        {activeTab === 'simulator' ? (
          <section className="panel-stack">
            <article className="card">
              <h3>Transaction Simulator Utility</h3>
              <p className="muted">Run preset scenarios against the backend simulator API and inspect the generated transactions and alerts.</p>
              <div className="scenario-grid">
                <button type="button" className="scenario-card" disabled={simulatorRunning !== null} onClick={() => void runSimulatorScenario('clean')}>
                  <PlaySquare size={16} /> {simulatorRunning === 'clean' ? 'Running…' : 'Normal Safe Transaction'}
                </button>
                <button type="button" className="scenario-card warning" disabled={simulatorRunning !== null} onClick={() => void runSimulatorScenario('amount-threshold')}>
                  <AlertTriangle size={16} /> {simulatorRunning === 'amount-threshold' ? 'Running…' : 'High Amount Transaction'}
                </button>
                <button type="button" className="scenario-card" disabled={simulatorRunning !== null} onClick={() => void runSimulatorScenario('velocity-burst')}>
                  <Clock3 size={16} /> {simulatorRunning === 'velocity-burst' ? 'Running…' : 'Rapid Velocity Burst (6 txns)'}
                </button>
                <button type="button" className="scenario-card" disabled={simulatorRunning !== null} onClick={() => void runSimulatorScenario('new-payee')}>
                  <Bot size={16} /> {simulatorRunning === 'new-payee' ? 'Running…' : 'First-Time New Payee'}
                </button>
                <button type="button" className="scenario-card danger" disabled={simulatorRunning !== null} onClick={() => void runSimulatorScenario('daily-limit')}>
                  <ShieldAlert size={16} /> {simulatorRunning === 'daily-limit' ? 'Running…' : 'Daily Limit Exceeded (6 txns)'}
                </button>
                <button type="button" className="scenario-card danger" disabled={simulatorRunning !== null} onClick={() => void runSimulatorScenario('sdn-match')}>
                  <ShieldAlert size={16} /> {simulatorRunning === 'sdn-match' ? 'Running…' : 'OFAC SDN Sanctions Match'}
                </button>
              </div>
            </article>

            {simulatorResult ? (
              <article className="card">
                <h3>Last Run: {simulatorResult.scenario}</h3>
                <p className="muted">{simulatorResult.description}</p>

                <h4>Transactions Created ({simulatorResult.transactions.length})</h4>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Account</th>
                      <th>Payee</th>
                      <th>Amount</th>
                      <th>Risk Score</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulatorResult.transactions.map((entry) => (
                      <tr key={entry.id}>
                        <td>{entry.id}</td>
                        <td>{entry.accountId}</td>
                        <td>{entry.payeeName ?? entry.payeeId}</td>
                        <td>{formatCurrency(entry.amount, entry.currency)}</td>
                        <td><span className={`badge sev-${riskBucket(entry.riskScore)}`}>{entry.riskScore}</span></td>
                        <td><span className={`badge tx-${entry.status.toLowerCase()}`}>{entry.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <h4>Alerts Generated ({simulatorResult.alerts.length})</h4>
                {simulatorResult.alerts.length === 0 ? (
                  <p className="muted">No alerts generated for this scenario.</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Rule</th>
                        <th>Severity</th>
                        <th>Status</th>
                        <th>Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {simulatorResult.alerts.map((entry) => (
                        <tr key={entry.id}>
                          <td>{entry.ruleName}</td>
                          <td><span className={`badge sev-${entry.severity.toLowerCase()}`}>{entry.severity}</span></td>
                          <td><span className={`badge st-${entry.status.toLowerCase()}`}>{entry.status}</span></td>
                          <td>{entry.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </article>
            ) : null}
          </section>
        ) : null}

        {activeTab === 'apidocs' ? (
          <section className="panel-stack">
            <article className="card">
              <h3>OpenAPI / REST API Docs & Live Runner</h3>
              <div className="split-grid">
                <div>
                  <h4>Endpoints</h4>
                  <ul className="mono endpoint-list">
                    {API_DOCS.map((entry) => (
                      <li key={`${entry.method}-${entry.path}`}>
                        <button
                          type="button"
                          className="ghost endpoint-btn"
                          onClick={() => {
                            setApiMethod(entry.method)
                            setApiEndpoint(entry.path.replace('{id}', '1'))
                          }}
                        >
                          {entry.method} {entry.path}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="api-runner">
                  <label>
                    Method
                    <select value={apiMethod} onChange={(event) => setApiMethod(event.target.value)}>
                      {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((method) => <option key={method} value={method}>{method}</option>)}
                    </select>
                  </label>
                  <label>
                    Endpoint
                    <input className="mono" value={apiEndpoint} onChange={(event) => setApiEndpoint(event.target.value)} />
                  </label>
                  <label>
                    JSON Body
                    <textarea className="mono api-body" value={apiBody} onChange={(event) => setApiBody(event.target.value)} />
                  </label>
                  <div className="api-runner-actions">
                    <button type="button" className="primary" onClick={() => void runApiRequest()}>Run Request</button>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => {
                        const openApiJson = JSON.stringify({ openapi: '3.0.0', paths: API_DOCS }, null, 2)
                        void navigator.clipboard.writeText(openApiJson)
                      }}
                    >
                      Copy OpenAPI 3.0 JSON
                    </button>
                  </div>
                  <pre className="response-box mono">{apiResponse || 'Response output will appear here.'}</pre>
                </div>
              </div>
            </article>
          </section>
        ) : null}

        {loading ? <p className="muted">Loading latest data...</p> : null}

        <InvestigationDialog
          open={openInvestigation && selectedAlertForDialog !== null}
          alert={selectedAlertForDialog}
          notes={selectedAlert ? (notesByAlertId[selectedAlert.id] ?? []) : []}
          onClose={closeInvestigateDialog}
          onWorkflowStatusChange={handleWorkflowStatusChange}
          onPostNote={postInvestigationNote}
          onSaveInvestigation={saveInvestigation}
          aiResult={aiResult}
          aiLoading={aiLoading}
          aiError={aiError}
          onInvestigateWithAi={onInvestigateWithAi}
        />
      </section>
    </div>
  )
}

export default App
