import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlined'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined'
import EditNoteIcon from '@mui/icons-material/EditNote'
import NotesIcon from '@mui/icons-material/Notes'
import UpdateIcon from '@mui/icons-material/Update'
import {
  Box,
  Card,
  CardContent,
  Chip,
  Typography,
} from '@mui/material'
import type { AuditEvent, AuditEventType } from '../models/alertModels'
import { EmptyState } from './EmptyState'
import { LoadingSpinner } from './LoadingSpinner'

const EVENT_META: Record<
  AuditEventType,
  { label: string; icon: React.ReactNode; color: string }
> = {
  ALERT_CREATED: {
    label: 'Alert Created',
    icon: <AddCircleOutlineIcon fontSize="small" />,
    color: '#3B82F6',
  },
  ALERT_ACKNOWLEDGED: {
    label: 'Acknowledged',
    icon: <UpdateIcon fontSize="small" />,
    color: '#F59E0B',
  },
  ALERT_INVESTIGATING: {
    label: 'Investigating',
    icon: <EditNoteIcon fontSize="small" />,
    color: '#7C3AED',
  },
  STATUS_CHANGED: {
    label: 'Status Changed',
    icon: <UpdateIcon fontSize="small" />,
    color: '#F59E0B',
  },
  NOTE_ADDED: {
    label: 'Note Added',
    icon: <NotesIcon fontSize="small" />,
    color: '#64748B',
  },
  ALERT_CLOSED: {
    label: 'Alert Closed',
    icon: <CheckCircleOutlineIcon fontSize="small" />,
    color: '#16A34A',
  },
  ALERT_DISMISSED: {
    label: 'Alert Dismissed',
    icon: <CheckCircleOutlineIcon fontSize="small" />,
    color: '#64748B',
  },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

interface AuditTimelineProps {
  events: AuditEvent[]
  loading?: boolean
}

export function AuditTimeline({ events, loading }: AuditTimelineProps) {
  const sorted = [...events].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  )

  return (
    <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #E2E8F0', mb: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2.5 }}>
          Audit Trail & History
        </Typography>

        {loading ? (
          <LoadingSpinner message="Loading audit history..." />
        ) : events.length === 0 ? (
          <EmptyState message="No audit history yet." />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {sorted.map((event, index) => {
              const meta = EVENT_META[event.eventType]
              const isLast = index === sorted.length - 1

              return (
                <Box key={`${event.id}-${event.occurredAt}-${event.eventType}-${index}`} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  {/* Timeline line + icon */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 36 }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        bgcolor: `${meta.color}1A`,
                        color: meta.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {meta.icon}
                    </Box>
                    {!isLast && (
                      <Box sx={{ width: 2, flex: 1, bgcolor: '#E2E8F0', my: 0.5, minHeight: 20 }} />
                    )}
                  </Box>

                  {/* Content */}
                  <Box sx={{ pb: isLast ? 0 : 2.5, flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                      <Chip
                        label={meta.label}
                        size="small"
                        sx={{
                          bgcolor: `${meta.color}1A`,
                          color: meta.color,
                          fontWeight: 700,
                          fontSize: 11,
                        }}
                      />
                      {event.operatorName && (
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                          by <strong>{event.operatorName}</strong>
                        </Typography>
                      )}
                    </Box>
                    <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 0.5 }}>
                      {event.description}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>
                      {formatDate(event.occurredAt)}
                    </Typography>
                  </Box>
                </Box>
              )
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

