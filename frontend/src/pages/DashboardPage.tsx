import { useEffect, useMemo, useState } from 'react'
import { getAlerts } from '../api/alerts'
import { getRules } from '../api/rules'
import { getTransactions } from '../api/transactions'
import type { AlertResponse, MonitoringRuleResponse, TransactionResponse } from '../api/types'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { formatCurrency, formatDate } from '../utils/format'

interface DashboardData {
  transactions: TransactionResponse[]
  alerts: AlertResponse[]
  rules: MonitoringRuleResponse[]
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
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
  }

  useEffect(() => {
    void loadData()
  }, [])

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
        <button onClick={() => void loadData()} disabled={loading}>
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
          <h3>Recent Alerts</h3>
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
                {data?.alerts.slice(0, 8).map((alert) => (
                  <tr key={alert.id}>
                    <td>#{alert.id}</td>
                    <td>{alert.ruleName}</td>
                    <td>
                      <StatusBadge value={alert.status} />
                    </td>
                    <td>{formatDate(alert.createdAt)}</td>
                  </tr>
                ))}
                {!data?.alerts.length ? (
                  <tr>
                    <td colSpan={4} className="empty-row">
                      No alerts found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
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

