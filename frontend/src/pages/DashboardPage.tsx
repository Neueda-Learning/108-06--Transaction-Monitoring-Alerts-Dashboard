import { useCallback, useEffect, useMemo, useState } from 'react'
import { getAlerts } from '../api/alerts'
import { getRules } from '../api/rules'
import { getTransactions } from '../api/transactions'
import type { AlertResponse, MonitoringRuleResponse, PagedResponse, TransactionResponse } from '../api/types'
import { PageHeader } from '../components/PageHeader'
import { PaginationControls } from '../components/PaginationControls'
import { StatusBadge } from '../components/StatusBadge'
import { formatCurrency, formatDate } from '../utils/format'

interface DashboardData {
  transactions: TransactionResponse[]
  alerts: AlertResponse[]
  rules: MonitoringRuleResponse[]
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [recentAlerts, setRecentAlerts] = useState<AlertResponse[]>([])
  const [recentAlertsCount, setRecentAlertsCount] = useState(0)
  const [recentAlertsPage, setRecentAlertsPage] = useState(1)
  const [recentAlertsPageSize, setRecentAlertsPageSize] = useState(5)
  const [loading, setLoading] = useState(true)
  const [recentAlertsLoading, setRecentAlertsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [transactions, alerts, rules] = await Promise.all([
        getTransactions(),
        getAlerts(),
        getRules(),
      ])
      setData({ transactions, alerts, rules })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadRecentAlerts = useCallback(async () => {
    setRecentAlertsLoading(true)
    try {
      const rawResult = await getAlerts({ page: recentAlertsPage - 1, size: recentAlertsPageSize })
      const result: PagedResponse<AlertResponse> = Array.isArray(rawResult)
        ? (() => {
          const safePage = Math.max(recentAlertsPage - 1, 0)
          const start = safePage * recentAlertsPageSize
          const end = start + recentAlertsPageSize
          const totalElements = rawResult.length
          const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / recentAlertsPageSize)
          return {
            items: rawResult.slice(start, end),
            page: safePage,
            size: recentAlertsPageSize,
            totalElements,
            totalPages,
          }
        })()
        : rawResult
      setRecentAlerts(result.items)
      setRecentAlertsCount(result.totalElements)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load recent alerts')
    } finally {
      setRecentAlertsLoading(false)
    }
  }, [recentAlertsPage, recentAlertsPageSize])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    void loadRecentAlerts()
  }, [loadRecentAlerts])

  const metrics = useMemo(() => {
    if (!data) {
      return null
    }

    const openAlerts = data.alerts.filter(
      (alert) => !['CLOSED', 'DISMISSED'].includes(alert.status),
    ).length

    const flaggedRate = data.transactions.length
      ? Math.round((data.alerts.length / data.transactions.length) * 100)
      : 0

    const transactionVolume = data.transactions.reduce((sum, transaction) => sum + Number(transaction.amount), 0)

    const activeRules = data.rules.filter((rule) => rule.active).length

    return {
      openAlerts,
      flaggedRate,
      transactionVolume,
      activeRules,
    }
  }, [data])

  return (
    <div className="page-stack">
      <PageHeader
        title="Compliance Dashboard"
        subtitle="Live operational snapshot from the current backend APIs"
      />

      <div className="panel toolbar">
        <button
          onClick={() => {
            void loadData()
            void loadRecentAlerts()
          }}
          disabled={loading || recentAlertsLoading}
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </button>
        {error ? <p className="error-text">{error}</p> : null}
      </div>

      <section className="stats-grid">
        <article className="panel stat-card">
          <h3>Open Alerts</h3>
          <p>{metrics?.openAlerts ?? '--'}</p>
        </article>
        <article className="panel stat-card">
          <h3>Flagged Rate</h3>
          <p>{metrics ? `${metrics.flaggedRate}%` : '--'}</p>
        </article>
        <article className="panel stat-card">
          <h3>Txn Volume</h3>
          <p>{metrics && data ? formatCurrency(metrics.transactionVolume, data.transactions[0]?.currency ?? 'USD') : '--'}</p>
        </article>
        <article className="panel stat-card">
          <h3>Active Rules</h3>
          <p>{metrics?.activeRules ?? '--'}</p>
        </article>
      </section>

      <section className="two-col-grid">
        <article className="panel">
          <h3>Recent Alerts Workload ({recentAlertsCount})</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Rule</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {recentAlerts.map((alert, index) => (
                  <tr key={`${alert.id}-${alert.createdAt}-${index}`}>
                    <td>#{alert.id}</td>
                    <td>{alert.ruleName}</td>
                    <td>
                      <StatusBadge value={alert.status} />
                    </td>
                    <td>{formatDate(alert.createdAt)}</td>
                  </tr>
                ))}
                {!recentAlerts.length ? (
                  <tr>
                    <td colSpan={4} className="empty-row">
                      No recent alerts found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <PaginationControls
            page={recentAlertsPage}
            pageSize={recentAlertsPageSize}
            totalItems={recentAlertsCount}
            totalPages={Math.max(1, Math.ceil(recentAlertsCount / Math.max(1, recentAlertsPageSize)))}
            rowsPerPageOptions={[5, 10, 25]}
            onPageChange={setRecentAlertsPage}
            onRowsPerPageChange={(nextPageSize) => {
              setRecentAlertsPageSize(nextPageSize)
              setRecentAlertsPage(1)
            }}
            loading={recentAlertsLoading}
          />
        </article>

        <article className="panel">
          <h3>Recent Transactions</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Account</th>
                  <th>Payee</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data?.transactions.slice(0, 8).map((transaction) => (
                  <tr key={transaction.id}>
                    <td>#{transaction.id}</td>
                    <td>{transaction.accountId}</td>
                    <td>{transaction.payeeId}</td>
                    <td>{formatCurrency(Number(transaction.amount), transaction.currency)}</td>
                  </tr>
                ))}
                {!data?.transactions.length ? (
                  <tr>
                    <td colSpan={4} className="empty-row">
                      No transactions found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  )
}

