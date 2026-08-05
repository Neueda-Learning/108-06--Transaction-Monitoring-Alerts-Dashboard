import { Box, CircularProgress, Typography } from '@mui/material'

interface LoadingSpinnerProps {
  message?: string
}

export function LoadingSpinner({ message = 'Loading...' }: LoadingSpinnerProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 6, gap: 2 }}>
      <CircularProgress size={40} sx={{ color: '#7C3AED' }} />
      <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>{message}</Typography>
    </Box>
  )
}

