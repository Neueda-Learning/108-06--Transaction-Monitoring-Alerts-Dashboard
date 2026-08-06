import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'react-hot-toast'
import { createRule, deleteRule, getRules, updateRule } from '../api/rules'
import type { MonitoringRuleRequest, MonitoringRuleResponse, PagedResponse, RuleType, Severity } from '../api/types'
import { PageHeader } from '../components/PageHeader'
import { PaginationControls } from '../components/PaginationControls'
import { StatusBadge } from '../components/StatusBadge'

const ruleTypes: RuleType[] = ['AMOUNT_THRESHOLD', 'VELOCITY', 'NEW_PAYEE', 'DAILY_LIMIT']
const severities: Severity[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

const initialForm: MonitoringRuleRequest = {
  name: '',
  type: 'AMOUNT_THRESHOLD',
  severity: 'MEDIUM',
  active: true,
  amountThreshold: 10000,
  velocityCount: null,
  velocityWindowMinutes: null,
  dailyLimit: null,
}

export function RulesPage() {
  const [rules, setRules] = useState<MonitoringRuleResponse[]>([])
  const [form, setForm] = useState<MonitoringRuleRequest>(initialForm)
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null)

  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [totalRules, setTotalRules] = useState(0)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRules = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rawResult = await getRules({
        search: appliedSearch,
        page: page - 1,
        size: pageSize,
      })

      const result: PagedResponse<MonitoringRuleResponse> = Array.isArray(rawResult)
        ? (() => {
          const normalizedSearch = appliedSearch.trim().toLowerCase()
          const filtered = normalizedSearch
            ? rawResult.filter((rule) => {
              const matchesText = [
                rule.name,
                rule.type,
                rule.severity,
                String(rule.id),
              ].some((value) => value.toLowerCase().includes(normalizedSearch))
              const matchesActive = 'active'.includes(normalizedSearch) && rule.active
              const matchesInactive = 'inactive'.includes(normalizedSearch) && !rule.active
              return matchesText || matchesActive || matchesInactive
            })
            : rawResult

          const safePage = Math.max(page - 1, 0)
          const start = safePage * pageSize
          const end = start + pageSize
          const totalElements = filtered.length
          const totalPages = totalElements === 0 ? 0 : Math.ceil(totalElements / pageSize)
          return {
            items: filtered.slice(start, end),
            page: safePage,
            size: pageSize,
            totalElements,
            totalPages,
          }
        })()
        : rawResult

      setRules(result.items)
      setTotalRules(result.totalElements)

      if (result.totalElements > 0 && result.items.length === 0 && page > 1) {
        setPage(Math.max(1, result.totalPages))
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load rules')
      setRules([])
      setTotalRules(0)
    } finally {
      setLoading(false)
    }
  }, [appliedSearch, page, pageSize])

  useEffect(() => {
    void loadRules()
  }, [loadRules])

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(totalRules / Math.max(1, pageSize))),
    [pageSize, totalRules],
  )

  const payload = useMemo(() => {
    const basePayload: MonitoringRuleRequest = {
      name: form.name.trim(),
      type: form.type,
      severity: form.severity,
      active: form.active,
      amountThreshold: null,
      velocityCount: null,
      velocityWindowMinutes: null,
      dailyLimit: null,
    }

    if (form.type === 'AMOUNT_THRESHOLD') {
      basePayload.amountThreshold = Number(form.amountThreshold)
    }
    if (form.type === 'VELOCITY') {
      basePayload.velocityCount = Number(form.velocityCount)
      basePayload.velocityWindowMinutes = Number(form.velocityWindowMinutes)
    }
    if (form.type === 'DAILY_LIMIT') {
      basePayload.dailyLimit = Number(form.dailyLimit)
    }

    return basePayload
  }, [form])

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    const isCreatingRule = editingRuleId === null

    try {
      if (editingRuleId) {
        await updateRule(editingRuleId, payload)
      } else {
        await createRule(payload)
      }
      setForm(initialForm)
      setEditingRuleId(null)
      setPage(1)
      void loadRules()
      toast.success(isCreatingRule ? 'Rule created' : 'Rule updated successfully')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to save rule')
    }
  }

  const onEdit = (rule: MonitoringRuleResponse) => {
    setEditingRuleId(rule.id)
    setForm({
      name: rule.name,
      type: rule.type,
      severity: rule.severity,
      active: rule.active,
      amountThreshold: rule.amountThreshold,
      velocityCount: rule.velocityCount,
      velocityWindowMinutes: rule.velocityWindowMinutes,
      dailyLimit: rule.dailyLimit,
    })
  }

  const onDelete = async (id: number) => {
    if (!window.confirm('Delete this rule?')) {
      return
    }
    try {
      await deleteRule(id)
      if (page > 1 && rules.length === 1) {
        setPage((prev) => Math.max(1, prev - 1))
      } else {
        void loadRules()
      }
      toast.success('Rule deleted')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to delete rule')
    }
  }

  return (
    <div className="page-stack">
      <PageHeader title="Monitoring Rules" subtitle="Manage active detection scenarios and thresholds" />

      {error ? <p className="error-text">{error}</p> : null}

      <section className="panel">
        <h3>{editingRuleId ? `Edit Rule #${editingRuleId}` : 'Create Rule'}</h3>
        <form className="grid-form" onSubmit={onSubmit}>
          <label>
            Name
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              required
            />
          </label>
          <label>
            Rule Type
            <select
              value={form.type}
              onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as RuleType }))}
            >
              {ruleTypes.map((type) => (
                <option value={type} key={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label>
            Severity
            <select
              value={form.severity}
              onChange={(event) => setForm((prev) => ({ ...prev, severity: event.target.value as Severity }))}
            >
              {severities.map((severity) => (
                <option value={severity} key={severity}>
                  {severity}
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
            />
            Active
          </label>

          {form.type === 'AMOUNT_THRESHOLD' ? (
            <label>
              Amount Threshold
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amountThreshold ?? ''}
                onChange={(event) => setForm((prev) => ({ ...prev, amountThreshold: Number(event.target.value) }))}
              />
            </label>
          ) : null}

          {form.type === 'VELOCITY' ? (
            <>
              <label>
                Velocity Count
                <input
                  type="number"
                  min="1"
                  value={form.velocityCount ?? ''}
                  onChange={(event) => setForm((prev) => ({ ...prev, velocityCount: Number(event.target.value) }))}
                />
              </label>
              <label>
                Window Minutes
                <input
                  type="number"
                  min="1"
                  value={form.velocityWindowMinutes ?? ''}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, velocityWindowMinutes: Number(event.target.value) }))
                  }
                />
              </label>
            </>
          ) : null}

          {form.type === 'DAILY_LIMIT' ? (
            <label>
              Daily Limit
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.dailyLimit ?? ''}
                onChange={(event) => setForm((prev) => ({ ...prev, dailyLimit: Number(event.target.value) }))}
              />
            </label>
          ) : null}

          <div className="button-row span-2">
            <button type="submit">{editingRuleId ? 'Update Rule' : 'Create Rule'}</button>
            {editingRuleId ? (
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setEditingRuleId(null)
                  setForm(initialForm)
                }}
              >
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="panel">
        <h3>Configured Rules ({totalRules})</h3>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            setAppliedSearch(search)
            setPage(1)
          }}
        >
          <label className="span-2">
            Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, type, severity, or active state"
            />
          </label>
          <div className="button-row span-2" style={{ marginTop: 8 }}>
            <button type="submit" disabled={loading}>
              {loading ? 'Searching...' : 'Apply Search'}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setSearch('')
                setAppliedSearch('')
                setPage(1)
              }}
            >
              Reset
            </button>
          </div>
        </form>

        {loading ? <p>Loading rules...</p> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Active</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td>#{rule.id}</td>
                  <td>{rule.name}</td>
                  <td>{rule.type}</td>
                  <td>
                    <StatusBadge value={rule.severity} />
                  </td>
                  <td>{rule.active ? 'Yes' : 'No'}</td>
                  <td>
                    <div className="table-actions">
                      <button type="button" onClick={() => onEdit(rule)}>
                        Edit
                      </button>
                      <button type="button" className="danger" onClick={() => void onDelete(rule.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rules.length ? (
                <tr>
                  <td className="empty-row" colSpan={6}>
                    No rules found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <PaginationControls
        page={page}
        pageSize={pageSize}
        totalItems={totalRules}
        totalPages={pageCount}
        rowsPerPageOptions={[5, 8, 10, 25]}
        onPageChange={setPage}
        onRowsPerPageChange={(nextPageSize) => {
          setPageSize(nextPageSize)
          setPage(1)
        }}
        loading={loading}
      />
    </div>
  )
}


