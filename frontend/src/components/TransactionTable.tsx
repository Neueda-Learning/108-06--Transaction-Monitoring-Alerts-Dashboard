import {
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import type { Transaction } from '../models/alertModels'
import { EmptyState } from './EmptyState'
import { LoadingSpinner } from './LoadingSpinner'

type SortField = 'transactionRef' | 'payeeId' | 'amount' | 'type' | 'occurredAt'
type SortDir = 'asc' | 'desc'

interface TransactionTableProps {
  transactions: Transaction[]
  loading?: boolean
}

function formatCurrencyAmount(amount: number, currency: string) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount)
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export function TransactionTable({ transactions, loading }: TransactionTableProps) {
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(5)
  const [sortField, setSortField] = useState<SortField>('occurredAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sorted = useMemo(() => {
    return [...transactions].sort((a, b) => {
      let va: string | number = a[sortField] ?? ''
      let vb: string | number = b[sortField] ?? ''
      if (sortField === 'amount') {
        va = a.amount
        vb = b.amount
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [transactions, sortField, sortDir])

  const visible = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  return (
    <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid #E2E8F0', mb: 3 }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
          Related Triggering Transactions
        </Typography>

        {loading ? (
          <LoadingSpinner message="Loading transactions..." />
        ) : transactions.length === 0 ? (
          <EmptyState message="No transactions linked to this alert." />
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    {[
                      { field: 'transactionRef' as SortField, label: 'Transaction ID' },
                      { field: 'payeeId' as SortField, label: 'Payee ID' },
                      { field: 'amount' as SortField, label: 'Amount' },
                      { field: 'type' as SortField, label: 'Type' },
                      { field: 'occurredAt' as SortField, label: 'Timestamp' },
                    ].map(({ field, label }) => (
                      <TableCell key={field} sx={{ fontWeight: 700, fontSize: 12, color: '#64748B', whiteSpace: 'nowrap' }}>
                        <TableSortLabel
                          active={sortField === field}
                          direction={sortField === field ? sortDir : 'asc'}
                          onClick={() => handleSort(field)}
                        >
                          {label}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visible.map((tx) => (
                    <TableRow
                      key={tx.id}
                      sx={{
                        cursor: 'default',
                        '&:hover': { bgcolor: '#F1F5F9' },
                        transition: 'background-color 0.15s',
                      }}
                    >
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>
                        {tx.transactionRef}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 13 }}>
                        {tx.payeeId}
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, fontWeight: 600 }}>
                        {formatCurrencyAmount(tx.amount, tx.currency)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={tx.type}
                          size="small"
                          sx={{
                            bgcolor: tx.type === 'DEBIT' ? '#FEF2F2' : '#F0FDF4',
                            color: tx.type === 'DEBIT' ? '#EF4444' : '#16A34A',
                            fontWeight: 700,
                            fontSize: 11,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: 13, color: '#64748B', whiteSpace: 'nowrap' }}>
                        {formatDate(tx.occurredAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={sorted.length}
              page={page}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[5, 10, 25]}
              onPageChange={(_, p) => setPage(p)}
              onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0) }}
              sx={{ borderTop: '1px solid #E2E8F0', mt: 1 }}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}

