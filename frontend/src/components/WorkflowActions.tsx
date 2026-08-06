import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import type { WorkflowStatus } from '../models/alertModels'

const WORKFLOW_STEPS: WorkflowStatus[] = ['OPEN', 'ACKNOWLEDGED', 'INVESTIGATING', 'CLOSED']

const NEXT_VALID_STATUSES: Record<WorkflowStatus, WorkflowStatus[]> = {
  OPEN: ['ACKNOWLEDGED', 'DISMISSED'],
  ACKNOWLEDGED: ['INVESTIGATING', 'DISMISSED'],
  INVESTIGATING: ['CLOSED', 'DISMISSED'],
  CLOSED: [],
  DISMISSED: [],
}

const STATUS_LABEL: Record<WorkflowStatus, string> = {
  OPEN: 'Open',
  ACKNOWLEDGED: 'Acknowledge',
  INVESTIGATING: 'Investigating',
  CLOSED: 'Closed',
  DISMISSED: 'Dismissed',
}

const STATUS_COLOR: Record<WorkflowStatus, { bg: string; border: string; text: string }> = {
  OPEN: { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' },
  ACKNOWLEDGED: { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309' },
  INVESTIGATING: { bg: '#F5F3FF', border: '#C4B5FD', text: '#6D28D9' },
  CLOSED: { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D' },
  DISMISSED: { bg: '#F8FAFC', border: '#E2E8F0', text: '#64748B' },
}

interface HistoryEntry {
  status: WorkflowStatus
  timestamp: string
  action: string
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

interface WorkflowActionsProps {
  currentStatus: WorkflowStatus
  onWorkflowStatusChange?: (status: WorkflowStatus) => void
  onClose?: () => void | Promise<void>
  onDismiss?: () => void | Promise<void>
}

export function WorkflowActions({ currentStatus, onWorkflowStatusChange, onClose, onDismiss }: WorkflowActionsProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([
    {
      status: currentStatus,
      timestamp: new Date().toISOString(),
      action: `Alert created - ${STATUS_LABEL[currentStatus]}`,
    },
  ])

  useEffect(() => {
    setHistory((prev) => {
      const last = prev[prev.length - 1]
      if (last?.status === currentStatus) {
        return prev
      }
      return [
        ...prev,
        {
          status: currentStatus,
          timestamp: new Date().toISOString(),
          action: `Status changed to ${STATUS_LABEL[currentStatus]}`,
        },
      ]
    })
  }, [currentStatus])

  const remainingStatuses = NEXT_VALID_STATUSES[currentStatus] ?? []

  const handleStatusClick = (status: WorkflowStatus) => {
    if (status === 'CLOSED' && onClose) {
      void onClose()
      return
    }
    if (status === 'DISMISSED' && onDismiss) {
      void onDismiss()
      return
    }
    onWorkflowStatusChange?.(status)
  }

  return (
    <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #E2E8F0', mb: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
          Workflow
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(7, auto)' },
            alignItems: 'center',
            gap: { xs: 1, sm: 1 },
            mb: 3.5,
          }}
        >
          {WORKFLOW_STEPS.map((step, index) => {
            const isActive = step === currentStatus
            const colors = STATUS_COLOR[step]
            return (
              <Box key={step} sx={{ display: 'contents' }}>
                <Box
                  sx={{
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: isActive ? colors.border : '#E2E8F0',
                    bgcolor: isActive ? colors.bg : '#fff',
                    color: isActive ? colors.text : '#64748B',
                    fontSize: 12,
                    fontWeight: isActive ? 700 : 600,
                    minWidth: { xs: '100%', sm: 106 },
                    textAlign: 'center',
                  }}
                >
                  {STATUS_LABEL[step]}
                </Box>
                {index < WORKFLOW_STEPS.length - 1 ? (
                  <Typography
                    sx={{
                      display: { xs: 'none', sm: 'block' },
                      color: '#94A3B8',
                      fontWeight: 700,
                      textAlign: 'center',
                    }}
                  >
                    -&gt;
                  </Typography>
                ) : null}
              </Box>
            )
          })}
        </Box>

        <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600, letterSpacing: 0.3, mb: 1.25 }}>
          Update Workflow Status
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2.75 }}>
          {remainingStatuses.map((status) => (
            <Button
              key={status}
              variant="outlined"
              size="small"
              onClick={() => handleStatusClick(status)}
              sx={{
                textTransform: 'none',
                borderRadius: 2,
                fontWeight: 600,
                borderColor: STATUS_COLOR[status].border,
                color: STATUS_COLOR[status].text,
                '&:hover': {
                  borderColor: STATUS_COLOR[status].text,
                  bgcolor: STATUS_COLOR[status].bg,
                },
              }}
            >
              {STATUS_LABEL[status]}
            </Button>
          ))}
          {!remainingStatuses.length ? (
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              No further workflow updates available.
            </Typography>
          ) : null}
        </Box>

        <Divider sx={{ my: 2.5 }} />

        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}
        >
          History
        </Typography>

        <Box sx={{ mt: 1.25, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[...history].reverse().map((entry, index) => {
            const colors = STATUS_COLOR[entry.status]
            return (
              <Box
                key={`${entry.status}-${entry.timestamp}-${entry.action}-${index}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1.25,
                  bgcolor: '#F8FAFC',
                  borderRadius: 1.5,
                  border: '1px solid #F1F5F9',
                }}
              >
                <Chip
                  label={STATUS_LABEL[entry.status]}
                  size="small"
                  sx={{
                    bgcolor: colors.bg,
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                    fontWeight: 700,
                    fontSize: 11,
                    minWidth: 96,
                  }}
                />
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  {entry.action} - {formatDateTime(entry.timestamp)} by Current User
                </Typography>
              </Box>
            )
          })}
        </Box>
      </CardContent>
    </Card>
  )
}

