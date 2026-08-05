import SendIcon from '@mui/icons-material/Send'
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material'
import { useState } from 'react'
import type { InvestigationNote } from '../models/alertModels'
import { EmptyState } from './EmptyState'
import { LoadingSpinner } from './LoadingSpinner'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

interface InvestigationNotesProps {
  notes: InvestigationNote[]
  loading?: boolean
  onPost: (content: string) => Promise<void>
}

export function InvestigationNotes({ notes, loading, onPost }: InvestigationNotesProps) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handlePost = async () => {
    if (!text.trim()) return
    setSubmitting(true)
    try {
      await onPost(text.trim())
      setText('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #E2E8F0', mb: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2.5 }}>
          Investigation Notes
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
          <TextField
            multiline
            rows={3}
            fullWidth
            placeholder="Add investigation findings or operator notes..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                fontSize: 14,
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#7C3AED' },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7C3AED' },
              },
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              endIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <SendIcon fontSize="small" />}
              onClick={handlePost}
              disabled={!text.trim() || submitting}
              sx={{
                textTransform: 'none',
                bgcolor: '#7C3AED',
                '&:hover': { bgcolor: '#6D28D9' },
                fontWeight: 600,
                borderRadius: 2,
                px: 3,
              }}
            >
              Post Note
            </Button>
          </Box>
        </Box>

        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Previous Notes
        </Typography>

        {loading ? (
          <LoadingSpinner message="Loading notes..." />
        ) : notes.length === 0 ? (
          <EmptyState message="No investigation notes yet." />
        ) : (
          <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[...notes].reverse().map((note) => (
              <Box
                key={note.id}
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  p: 2,
                  bgcolor: '#F8FAFC',
                  borderRadius: 2,
                  border: '1px solid #E2E8F0',
                }}
              >
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    bgcolor: '#7C3AED',
                    fontSize: 13,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {note.operatorName.charAt(0)}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{note.operatorName}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{formatDate(note.createdAt)}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.6 }}>
                    "{note.content}"
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  )
}

