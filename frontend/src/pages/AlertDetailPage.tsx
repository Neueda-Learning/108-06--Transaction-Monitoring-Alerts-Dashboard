import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getAlertById, investigateWithAi, updateAlertStatus } from '../api/alerts'
import type { AiInvestigationResponse, AlertResponse, AlertStatus } from '../api/types'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { formatDate } from '../utils/format'

const updatableStatuses: AlertStatus[] = ['ACKNOWLEDGED', 'INVESTIGATING', 'CLOSED', 'DISMISSED']

export function AlertDetailPage() {
  const params = useParams<{ id: string }>()
  const alertId = Number(params.id)

  const [alert, setAlert] = useState<AlertResponse | null>(null)
  const [targetStatus, setTargetStatus] = useState<AlertStatus>('ACKNOWLEDGED')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aiResult, setAiResult] = useState<AiInvestigationResponse | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const loadAlert = useCallback(async () => {
    if (!alertId) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      const result = await getAlertById(alertId)
      setAlert(result)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load alert details')
    } finally {
      setLoading(false)
    }
  }, [alertId])

  useEffect(() => {
    void loadAlert()
  }, [loadAlert])

  const nextCandidates = useMemo(() => {
    if (!alert) {
      return updatableStatuses
    }

    switch (alert.status) {
      case 'OPEN':
        return ['ACKNOWLEDGED', 'DISMISSED'] as AlertStatus[]
      case 'ACKNOWLEDGED':
        return ['INVESTIGATING', 'DISMISSED'] as AlertStatus[]
      case 'INVESTIGATING':
        return ['CLOSED', 'DISMISSED'] as AlertStatus[]
      default:
        return [] as AlertStatus[]
    }
  }, [alert])

  const onUpdateStatus = async (event: FormEvent) => {
    event.preventDefault()
    if (!alert) {
      return
    }

    setError(null)
    setLoading(true)

    try {
      const updated = await updateAlertStatus(alert.id, {
        status: targetStatus,
        note,
      })
      setAlert(updated)
      setNote('')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to update alert')
    } finally {
      setLoading(false)
    }
  }

  const onInvestigateWithAi = async () => {
    if (!alert) {
      return
    }

    setAiError(null)
    setAiLoading(true)

    try {
      const result = await investigateWithAi(alert.id)
      setAiResult(result)
    } catch (requestError) {
      setAiError(requestError instanceof Error ? requestError.message : 'Failed to generate AI investigation')
    } finally {
      setAiLoading(false)
    }
  }

  if (!alertId || Number.isNaN(alertId)) {
    return (
      <div className="page-stack">
        <p className="error-text">Invalid alert id.</p>
      </div>
    )
  }

  return (
    <div className="page-stack">
      <PageHeader title={`Alert #${alertId}`} subtitle="Inspect details and move through lifecycle" />
      <Link to="/alerts" className="link-back">
        Back to alerts
      </Link>

      {error ? <p className="error-text">{error}</p> : null}

      <section className="panel">
        <h3>Alert Detail</h3>
        {alert ? (
          <dl className="details-grid">
            <dt>Account ID</dt>
            <dd>{alert.accountId}</dd>
            <dt>Transaction ID</dt>
            <dd>{alert.transactionId}</dd>
            <dt>Rule</dt>
            <dd>
              {alert.ruleName} ({alert.ruleType})
            </dd>
            <dt>Severity</dt>
            <dd>
              <StatusBadge value={alert.severity} />
            </dd>
            <dt>Status</dt>
            <dd>
              <StatusBadge value={alert.status} />
            </dd>
            <dt>Created</dt>
            <dd>{formatDate(alert.createdAt)}</dd>
            <dt>Message</dt>
            <dd>{alert.message}</dd>
            <dt>Lifecycle Note</dt>
            <dd>{alert.lifecycleNote || '--'}</dd>
          </dl>
        ) : (
          <p>{loading ? 'Loading details...' : 'Alert not found.'}</p>
        )}
      </section>

      <section className="panel">
        <h3>Update Status</h3>
        <form className="grid-form" onSubmit={onUpdateStatus}>
          <label>
            Next Status
            <select value={targetStatus} onChange={(event) => setTargetStatus(event.target.value as AlertStatus)}>
              {nextCandidates.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="span-2">
            Analyst Note
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional reason or investigation note"
            />
          </label>
          <button type="submit" disabled={loading || !nextCandidates.length}>
            {loading ? 'Saving...' : 'Update Status'}
          </button>
        </form>
      </section>

      <section className="panel">
        <h3>Status Timeline</h3>
        <ul className="timeline">
          <li>Created: {formatDate(alert?.createdAt)}</li>
          <li>Acknowledged: {formatDate(alert?.acknowledgedAt)}</li>
          <li>Investigating: {formatDate(alert?.investigatingAt)}</li>
          <li>Closed: {formatDate(alert?.closedAt)}</li>
          <li>Dismissed: {formatDate(alert?.dismissedAt)}</li>
        </ul>
      </section>

      <section className="panel">
        <h3>AI Investigation</h3>
        <button type="button" onClick={onInvestigateWithAi} disabled={aiLoading || !alert}>
          {aiLoading ? 'Investigating...' : 'Investigate with AI'}
        </button>
        {aiError ? <p className="error-text">{aiError}</p> : null}
        {aiResult ? (
          <dl className="details-grid">
            <dt>Risk Level</dt>
            <dd>{aiResult.riskLevel}</dd>
            <dt>Summary</dt>
            <dd>{aiResult.summary}</dd>
            <dt>Recommendation</dt>
            <dd>{aiResult.recommendation}</dd>
            <dt>Model</dt>
            <dd>{aiResult.model}</dd>
          </dl>
        ) : null}
      </section>
    </div>
  )
}



