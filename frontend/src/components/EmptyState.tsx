import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import { Box, Typography } from '@mui/material'

interface EmptyStateProps {
  message?: string
}

export function EmptyState({ message = 'No data available.' }: EmptyStateProps) {
  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={5} gap={1}>
      <InfoOutlinedIcon sx={{ fontSize: 40, color: '#CBD5E1' }} />
      <Typography color="text.secondary" fontSize={14}>{message}</Typography>
    </Box>
  )
}

