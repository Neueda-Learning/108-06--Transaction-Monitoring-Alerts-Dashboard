import CloseIcon from '@mui/icons-material/Close'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material'
import type { AiInvestigationResponse, AlertResponse, AlertStatus } from '../api/types'
import type { InvestigationNote } from '../models/alertModels'
import { InvestigationNotes } from './InvestigationNotes'
import { WorkflowActions } from './WorkflowActions'

interface InvestigationDialogProps {
  open: boolean
  alert: AlertResponse | null
  notes: InvestigationNote[]
  onClose: () => void
  onWorkflowStatusChange: (status: AlertStatus) => void
  onPostNote: (content: string) => Promise<void>
  onSaveInvestigation: () => Promise<void> | void
  aiResult: AiInvestigationResponse | null
  aiLoading: boolean
  aiError: string | null
  onInvestigateWithAi: () => void | Promise<void>
}

function formatAlertRef(id: number) {
  return `ALT-${String(id).padStart(4, '0')}`
}

const SEVERITY_COLOR: Record<string, string> = {
  LOW: '#22C55E',
  MEDIUM: '#F59E0B',
  HIGH: '#EF4444',
  CRITICAL: '#7C3AED',
}

function formatStatusLabel(status: AlertStatus) {
  return status.toLowerCase().replace(/_/g, ' ').replace(/(^\w|\s\w)/g, (char) => char.toUpperCase())
}

export function InvestigationDialog({
  open,
  alert,
  notes,
  onClose,
  onWorkflowStatusChange,
  onPostNote,
  onSaveInvestigation,
  aiResult,
  aiLoading,
  aiError,
  onInvestigateWithAi,
}: InvestigationDialogProps) {
  if (!alert) return null

  const severityLabel = alert.severity.charAt(0) + alert.severity.slice(1).toLowerCase()
  const statusLabel = formatStatusLabel(alert.status)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      slotProps={{
        backdrop: { sx: { backgroundColor: 'rgba(15, 23, 42, 0.62)' } },
        paper: { sx: { borderRadius: 3, border: '1px solid #E2E8F0' } },
      }}
    >
      <DialogTitle sx={{ pb: 1.25, pr: 6 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>Alert Investigation</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.25, flexWrap: 'wrap' }}>
          <Chip
            label={`Alert ID: ${formatAlertRef(alert.id)}`}
            size="small"
            sx={{ fontWeight: 700, bgcolor: '#F1F5F9', color: '#334155' }}
          />
          <Chip
            label={`Severity: ${severityLabel}`}
            size="small"
            sx={{
              bgcolor: SEVERITY_COLOR[alert.severity] ?? '#EF4444',
              color: '#fff',
              fontWeight: 700,
            }}
          />
          <Chip
            label={`Status: ${statusLabel}`}
            size="small"
            sx={{ bgcolor: '#7C3AED', color: '#fff', fontWeight: 700 }}
          />
        </Box>
        <IconButton
          aria-label="Close investigation dialog"
          onClick={onClose}
          sx={{ position: 'absolute', right: 10, top: 10 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        <WorkflowActions
          key={alert.id}
          currentStatus={alert.status}
          onWorkflowStatusChange={onWorkflowStatusChange}
        />

        <InvestigationNotes
          key={alert.id}
          notes={notes}
          onPost={onPostNote}
        />

        <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid #E2E8F0' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>AI Investigation</Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<SmartToyIcon fontSize="small" />}
              onClick={() => void onInvestigateWithAi()}
              disabled={aiLoading}
              sx={{ textTransform: 'none' }}
            >
              {aiLoading ? 'Investigating...' : 'Investigate with AI'}
            </Button>
          </Box>
          {aiError ? (
            <Typography variant="body2" sx={{ color: 'error.main' }}>{aiError}</Typography>
          ) : null}
          {aiResult ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              <Typography variant="body2"><strong>Risk Level:</strong> {aiResult.riskLevel}</Typography>
              <Typography variant="body2"><strong>Summary:</strong> {aiResult.summary}</Typography>
              <Typography variant="body2"><strong>Recommendation:</strong> {aiResult.recommendation}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Model: {aiResult.model}</Typography>
            </Box>
          ) : null}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button variant="outlined" color="inherit" onClick={onClose} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={async () => {
            try {
              await onSaveInvestigation()
              onClose()
            } catch {
              // Keep dialog open when save fails so user can retry.
            }
          }}
          sx={{
            textTransform: 'none',
            bgcolor: '#7C3AED',
            '&:hover': { bgcolor: '#6D28D9' },
            fontWeight: 700,
          }}
        >
          Save Investigation
        </Button>
      </DialogActions>
    </Dialog>
  )
}
