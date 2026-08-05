import { Card, CardContent, Chip, Grid, Typography } from '@mui/material'
import type { Alert, Severity, WorkflowStatus } from '../models/alertModels'

const SEVERITY_COLORS: Record<Severity, string> = {
  LOW: '#3B82F6',
  MEDIUM: '#F59E0B',
  HIGH: '#EF4444',
  CRITICAL: '#7C2D12',
}

const STATUS_COLORS: Record<WorkflowStatus, string> = {
  OPEN: '#EF4444',
  ACKNOWLEDGED: '#F59E0B',
  INVESTIGATING: '#7C3AED',
  CLOSED: '#16A34A',
  DISMISSED: '#64748B',
}

interface AlertHeaderCardProps {
  alert: Alert
}

export function AlertHeaderCard({ alert }: AlertHeaderCardProps) {
  return (
    <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #E2E8F0', mb: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Grid container spacing={3} alignItems="flex-start">
          <Grid item xs={12} sm={6} md={2}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
              Alert ID
            </Typography>
            <Typography variant="h6" fontWeight={700} mt={0.5}>
              {alert.alertRef}
            </Typography>
          </Grid>

          <Grid item xs={6} sm={3} md={2}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
              Severity
            </Typography>
            <br />
            <Chip
              label={alert.severity}
              size="small"
              sx={{
                mt: 0.75,
                bgcolor: SEVERITY_COLORS[alert.severity],
                color: '#fff',
                fontWeight: 700,
                fontSize: 12,
              }}
            />
          </Grid>

          <Grid item xs={6} sm={3} md={2}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
              Status
            </Typography>
            <br />
            <Chip
              label={alert.status}
              size="small"
              sx={{
                mt: 0.75,
                bgcolor: STATUS_COLORS[alert.status],
                color: '#fff',
                fontWeight: 700,
                fontSize: 12,
              }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
              Rule Name
            </Typography>
            <Typography variant="body2" fontWeight={600} mt={0.5}>
              {alert.ruleName}
            </Typography>
          </Grid>

          <Grid item xs={6} sm={3} md={2}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
              Rule Type
            </Typography>
            <Typography variant="body2" mt={0.5} fontFamily="monospace" fontSize={12} color="text.secondary">
              {alert.ruleType}
            </Typography>
          </Grid>

          <Grid item xs={6} sm={3} md={1}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
              Account
            </Typography>
            <Typography variant="body2" fontWeight={600} mt={0.5} fontFamily="monospace">
              {alert.accountId}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

