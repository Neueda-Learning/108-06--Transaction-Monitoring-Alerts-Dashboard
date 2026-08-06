import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { getAlerts, type AlertFilters } from '../api/alerts'
import type { AlertResponse, AlertStatus, PagedResponse, Severity } from '../api/types'
import { PageHeader } from '../components/PageHeader'
import { PaginationControls } from '../components/PaginationControls'
import { StatusBadge } from '../components/StatusBadge'
import { formatDate } from '../utils/format'

const statuses: Array<AlertStatus | ''> = ['', 'OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'CLOSED', 'DISMISSED']
const severities: Array<Severity | ''> = ['', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertResponse[]>([])

  const [filters, setFilters] = useState<AlertFilters>({ status: '', severity: '' })
  const [appliedFilters, setAppliedFilters] = useState<AlertFilters>({ status: '', severity: '' })

  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [totalAlerts, setTotalAlerts] = useState(0)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAlerts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rawResult = await getAlerts({
        ...appliedFilters,
        search: appliedSearch,
        page: page - 1,
        size: pageSize,
      })

      const result: PagedResponse<AlertResponse> = Array.isArray(rawResult)
        ? (() => {
          const safePage = Math.max(page - 1, 0)
          const start = safePage * pageSize
          const end = start + pageSize
          const totalElements = rawResult.length
          const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / pageSize)
          return {
            items: rawResult.slice(start, end),
            page: safePage,
            size: pageSize,
            totalElements,
            totalPages,
          }
        })()
        : rawResult

      setAlerts(result.items)
      setTotalAlerts(result.totalElements)

      if (result.totalElements > 0 && result.items.length === 0 && page > 1) {
        setPage(Math.max(1, result.totalPages))
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load alerts')
      setAlerts([])
      setTotalAlerts(0)
    } finally {
      setLoading(false)
    }
  }, [appliedFilters, appliedSearch, page, pageSize])

  useEffect(() => {
    void loadAlerts()
  }, [loadAlerts])

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(totalAlerts / Math.max(1, pageSize))),
    [pageSize, totalAlerts],
  )

  const onFilterSubmit = (event: FormEvent) => {
    event.preventDefault()
    setAppliedFilters(filters)
    setAppliedSearch(search)
    setPage(1)
  }

  return (
    <div className="page-stack">
      <PageHeader title="Alerts" subtitle="Review and triage suspicious activity alerts" />

      {error ? <p className="error-text">{error}</p> : null}

      <section className="panel">
        <h3>Filters</h3>
        <form className="grid-form" onSubmit={onFilterSubmit}>
          <label className="span-2">
            Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by rule, severity, status, or account"
            />
          </label>
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
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setFilters({ status: '', severity: '' })
                setAppliedFilters({ status: '', severity: '' })
                setSearch('')
                setAppliedSearch('')
                setPage(1)
              }}
            >
              Reset
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h3>Alert Investigation Queue ({totalAlerts})</h3>
        {loading ? <p>Loading alerts...</p> : null}
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
              {alerts.map((alert, index) => (
                <tr key={`${alert.id}-${alert.createdAt}-${index}`}>
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

        <PaginationControls
          page={page}
          pageSize={pageSize}
          totalItems={totalAlerts}
          totalPages={pageCount}
          rowsPerPageOptions={[5, 8, 10, 25]}
          onPageChange={setPage}
          onRowsPerPageChange={(nextPageSize) => {
            setPageSize(nextPageSize)
            setPage(1)
          }}
          loading={loading}
        />
      </section>
    </div>
  )
}


