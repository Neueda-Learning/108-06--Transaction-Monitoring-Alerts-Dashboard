import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import { Box, Typography } from '@mui/material'

interface TriggerExplanationProps {
  message: string
}

export function TriggerExplanation({ message }: TriggerExplanationProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        bgcolor: '#FFFBEB',
        border: '1px solid #FDE68A',
        borderRadius: 2,
        px: 2.5,
        py: 2,
        mb: 3,
      }}
    >
      <WarningAmberRoundedIcon sx={{ color: '#F59E0B', mt: '2px', flexShrink: 0 }} />
      <Typography sx={{ fontSize: 14, color: '#92400E', lineHeight: 1.6 }}>
        {message}
      </Typography>
    </Box>
  )
}

