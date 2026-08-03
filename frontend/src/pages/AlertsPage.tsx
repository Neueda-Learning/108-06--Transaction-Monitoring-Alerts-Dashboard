import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { getAlerts, type AlertFilters } from '../api/alerts'
import type { AlertResponse, AlertStatus, Severity } from '../api/types'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { formatDate } from '../utils/format'

const statuses: Array<AlertStatus | ''> = ['', 'OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'CLOSED', 'DISMISSED']
const severities: Array<Severity | ''> = ['', 'LOW', 'MEDIUM', 'HIGH']

export function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertResponse[]>([])
  const [filters, setFilters] = useState<AlertFilters>({ status: '', severity: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAlerts = useCallback(async (activeFilters = filters) => {
    setLoading(true)
    setError(null)
    try {
      const result = await getAlerts(activeFilters)
      setAlerts(result)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load alerts')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void loadAlerts({ status: '', severity: '' })
  }, [loadAlerts])

  const onFilterSubmit = (event: FormEvent) => {
    event.preventDefault()
    void loadAlerts(filters)
  }

  return (
    <div className="page-stack">
      <PageHeader title="Alerts" subtitle="Review and triage suspicious activity alerts" />

      {error ? <p className="error-text">{error}</p> : null}

      <section className="panel">
        <h3>Filters</h3>
        <form className="grid-form" onSubmit={onFilterSubmit}>
          <label>
            Status
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value as AlertStatus | '' }))}
            >
              {statuses.map((status) => (
                <option key={status || 'all'} value={status}>
                  {status || 'All'}
                </option>
              ))}
            </select>
          </label>
          <label>
            Severity
            <select
              value={filters.severity}
              onChange={(event) => setFilters((prev) => ({ ...prev, severity: event.target.value as Severity | '' }))}
            >
              {severities.map((severity) => (
                <option key={severity || 'all'} value={severity}>
                  {severity || 'All'}
                </option>
              ))}
            </select>
          </label>
          <div className="button-row span-2">
            <button type="submit" disabled={loading}>
              {loading ? 'Loading...' : 'Apply Filters'}
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h3>Alert Results ({alerts.length})</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Rule</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.id}>
                  <td>#{alert.id}</td>
                  <td>{alert.ruleName}</td>
                  <td>{alert.ruleType}</td>
                  <td>
                    <StatusBadge value={alert.severity} />
                  </td>
                  <td>
                    <StatusBadge value={alert.status} />
                  </td>
                  <td>{formatDate(alert.createdAt)}</td>
                  <td>
                    <Link to={`/alerts/${alert.id}`}>Open</Link>
                  </td>
                </tr>
              ))}
              {!alerts.length ? (
                <tr>
                  <td className="empty-row" colSpan={7}>
                    No alerts matched the selected filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}



