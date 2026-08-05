import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PolicyIcon from '@mui/icons-material/Policy'
import { Alert, Box, Container, Divider, Grid, IconButton, Snackbar, Typography } from '@mui/material'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  closeAlert,
  dismissAlert,
  fetchAlert,
  fetchAlertHistory,
  fetchAlertNotes,
  fetchAlertTransactions,
  postNote,
} from '../api/alertsApi'
import { AlertHeaderCard } from '../components/AlertHeaderCard'
import { AuditTimeline } from '../components/AuditTimeline'
import { InvestigationNotes } from '../components/InvestigationNotes'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { TransactionTable } from '../components/TransactionTable'
import { TriggerExplanation } from '../components/TriggerExplanation'
import { WorkflowActions } from '../components/WorkflowActions'
import type { Alert as AlertModel, AuditEvent, AuditEventType, InvestigationNote, Transaction } from '../models/alertModels'

export function AlertDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const alertId = Number(id)

  const [alert, setAlert] = useState<AlertModel | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [notes, setNotes] = useState<InvestigationNote[]>([])
  const [history, setHistory] = useState<AuditEvent[]>([])

  const [pageLoading, setPageLoading] = useState(true)
  const [txLoading, setTxLoading] = useState(true)
  const [notesLoading, setNotesLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(true)

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false, message: '', severity: 'success',
  })

  const showSnack = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity })
  }

  const loadAlert = useCallback(async () => {
    try {
      const data = await fetchAlert(alertId)
      setAlert(data)
    } catch {
      showSnack('Failed to load alert details.', 'error')
    } finally {
      setPageLoading(false)
    }
  }, [alertId])

  const loadTransactions = useCallback(async () => {
    setTxLoading(true)
    try {
      const data = await fetchAlertTransactions(alertId)
      setTransactions(data)
    } catch {
      showSnack('Failed to load transactions.', 'error')
    } finally {
      setTxLoading(false)
    }
  }, [alertId])

  const loadNotes = useCallback(async () => {
    setNotesLoading(true)
    try {
      const data = await fetchAlertNotes(alertId)
      setNotes(data)
    } catch {
      showSnack('Failed to load notes.', 'error')
    } finally {
      setNotesLoading(false)
    }
  }, [alertId])

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const data = await fetchAlertHistory(alertId)
      setHistory(data)
    } catch {
      showSnack('Failed to load audit history.', 'error')
    } finally {
      setHistoryLoading(false)
    }
  }, [alertId])

  useEffect(() => {
    void loadAlert()
    void loadTransactions()
    void loadNotes()
    void loadHistory()
  }, [loadAlert, loadTransactions, loadNotes, loadHistory])

  const addAuditEntry = (eventType: AuditEventType, description: string) => {
    const entry: AuditEvent = {
      id: Date.now(),
      alertId,
      eventType,
      description,
      operatorName: 'Operator',
      occurredAt: new Date().toISOString(),
    }
    setHistory((prev) => [...prev, entry])
  }

  const handleClose = async () => {
    const updated = await closeAlert(alertId)
    setAlert(updated)
    addAuditEntry('ALERT_CLOSED', 'Alert closed as legitimate')
    showSnack('Alert closed successfully.')
  }

  const handleDismiss = async () => {
    const updated = await dismissAlert(alertId)
    setAlert(updated)
    addAuditEntry('ALERT_DISMISSED', 'Alert dismissed as false positive')
    showSnack('Alert dismissed.')
  }

  const handlePostNote = async (content: string) => {
    const note = await postNote(alertId, content)
    setNotes((prev) => [...prev, note])
    addAuditEntry('NOTE_ADDED', 'Investigation note added by operator')
    showSnack('Note posted.')
  }

  if (pageLoading) {
    return (
      <Box sx={{ bgcolor: '#F8FAFC', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner message="Loading alert details..." />
      </Box>
    )
  }

  if (!alert) {
    return (
      <Box sx={{ bgcolor: '#F8FAFC', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography color="text.secondary">Alert not found.</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ bgcolor: '#F8FAFC', minHeight: '100vh', py: 4 }}>
      <Container maxWidth="xl">

        {/* Page header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <IconButton
            onClick={() => window.history.back()}
            size="small"
            sx={{ border: '1px solid #E2E8F0', borderRadius: 2, bgcolor: '#fff' }}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <PolicyIcon sx={{ color: '#7C3AED', fontSize: 28 }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Transaction Monitoring & Alerts Dashboard
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: 13 }}>
              Alert Investigation Details
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2.5 }} />

        {/* Alert header card */}
        <AlertHeaderCard alert={alert} />

        {/* Trigger explanation */}
        <TriggerExplanation message={alert.message} />

        {/* Workflow */}
        <WorkflowActions
          currentStatus={alert.status}
          onClose={handleClose}
          onDismiss={handleDismiss}
        />

        {/* Transactions + Audit in a grid */}
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 8 }}>
            {/* Transactions table */}
            <TransactionTable transactions={transactions} loading={txLoading} />

            {/* Notes */}
            <InvestigationNotes notes={notes} loading={notesLoading} onPost={handlePostNote} />
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            {/* Audit timeline */}
            <AuditTimeline events={history} loading={historyLoading} />
          </Grid>
        </Grid>
      </Container>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ borderRadius: 2, fontSize: 13 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

