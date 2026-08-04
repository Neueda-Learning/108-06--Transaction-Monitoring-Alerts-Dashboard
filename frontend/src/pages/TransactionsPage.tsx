import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'react-hot-toast'
import { createTransaction, getTransactions, type TransactionFilters } from '../api/transactions'
import type { TransactionResponse } from '../api/types'
import { PageHeader } from '../components/PageHeader'
import { formatCurrency, formatDate, riskBucket, toIsoFromLocalDateTime } from '../utils/format'
import { filterItemsByText, getPageCount, paginateItems } from '../utils/tableState'

const initialFilters: TransactionFilters = {
  accountId: '',
  payeeId: '',
  minAmount: '',
  maxAmount: '',
  from: '',
  to: '',
}

export function TransactionsPage() {
  const [filters, setFilters] = useState<TransactionFilters>(initialFilters)
  const [fromLocal, setFromLocal] = useState('')
  const [toLocal, setToLocal] = useState('')
  const [transactions, setTransactions] = useState<TransactionResponse[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pageSize = 8

  const [accountId, setAccountId] = useState('ACC-001')
  const [payeeId, setPayeeId] = useState('PAYEE-001')
  const [amount, setAmount] = useState('500')
  const [currency, setCurrency] = useState('USD')
  const [occurredAt, setOccurredAt] = useState('')
  const [description, setDescription] = useState('')

  const loadTransactions = useCallback(async (activeFilters = filters) => {
    setLoading(true)
    setError(null)
    try {
      const result = await getTransactions(activeFilters)
      setTransactions(result)
      return result
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load transactions')
      return null
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void loadTransactions(initialFilters)
  }, [loadTransactions])

  const filteredTransactions = useMemo(() => {
    return filterItemsByText(transactions, search, (transaction) => [transaction.accountId, transaction.payeeId, transaction.description, transaction.currency, transaction.id])
  }, [transactions, search])

  const pageCount = useMemo(() => getPageCount(filteredTransactions.length, pageSize), [filteredTransactions.length])
  const visibleTransactions = useMemo(() => paginateItems(filteredTransactions, page, pageSize), [filteredTransactions, page])

  useEffect(() => {
    setPage(1)
  }, [search, filters])

  const onFilterSubmit = (event: FormEvent) => {
    event.preventDefault()
    const queryFilters: TransactionFilters = {
      ...filters,
      from: toIsoFromLocalDateTime(fromLocal) ?? '',
      to: toIsoFromLocalDateTime(toLocal) ?? '',
    }
    setFilters(queryFilters)
    void loadTransactions(queryFilters)
  }

  const onCreateSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    try {
      const createdTransaction = await createTransaction({
        accountId,
        payeeId,
        amount: Number(amount),
        currency,
        occurredAt: toIsoFromLocalDateTime(occurredAt),
        description: description || null,
      })
      setDescription('')
      setOccurredAt('')
      const refreshedTransactions = await loadTransactions(filters)
      toast.success('Transaction created')
      const createdTransactionStatus =
        refreshedTransactions?.find((entry) => entry.id === createdTransaction.id)?.status ?? createdTransaction.status
      if (createdTransactionStatus === 'FLAGGED' || createdTransactionStatus === 'BLOCKED') {
        toast.success('Alert created')
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to create transaction')
    }
  }

  return (
    <div className="page-stack">
      <PageHeader title="Transactions" subtitle="Create and search monitored transactions" />

      {error ? <p className="error-text">{error}</p> : null}

      <section className="panel">
        <h3>Create Transaction</h3>
        <form className="grid-form" onSubmit={onCreateSubmit}>
          <label>
            Account ID
            <input value={accountId} onChange={(event) => setAccountId(event.target.value)} required />
          </label>
          <label>
            Payee ID
            <input value={payeeId} onChange={(event) => setPayeeId(event.target.value)} required />
          </label>
          <label>
            Amount
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
          </label>
          <label>
            Currency
            <input value={currency} onChange={(event) => setCurrency(event.target.value)} required maxLength={3} />
          </label>
          <label>
            Occurred At
            <input
              type="datetime-local"
              value={occurredAt}
              onChange={(event) => setOccurredAt(event.target.value)}
            />
          </label>
          <label className="span-2">
            Description
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional context"
            />
          </label>
          <button type="submit">Create Transaction</button>
        </form>
      </section>

      <section className="panel">
        <h3>Filters</h3>
        <form className="grid-form" onSubmit={onFilterSubmit}>
          <label className="span-2">
            Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by account, payee, or description"
            />
          </label>
          <label>
            Account ID
            <input
              value={filters.accountId}
              onChange={(event) => setFilters((prev) => ({ ...prev, accountId: event.target.value }))}
            />
          </label>
          <label>
            Payee ID
            <input
              value={filters.payeeId}
              onChange={(event) => setFilters((prev) => ({ ...prev, payeeId: event.target.value }))}
            />
          </label>
          <label>
            Min Amount
            <input
              type="number"
              step="0.01"
              value={filters.minAmount}
              onChange={(event) => setFilters((prev) => ({ ...prev, minAmount: event.target.value }))}
            />
          </label>
          <label>
            Max Amount
            <input
              type="number"
              step="0.01"
              value={filters.maxAmount}
              onChange={(event) => setFilters((prev) => ({ ...prev, maxAmount: event.target.value }))}
            />
          </label>
          <label>
            From (ISO)
            <input
              type="datetime-local"
              value={fromLocal}
              onChange={(event) => setFromLocal(event.target.value)}
            />
          </label>
          <label>
            To (ISO)
            <input
              type="datetime-local"
              value={toLocal}
              onChange={(event) => setToLocal(event.target.value)}
            />
          </label>
          <div className="button-row span-2">
            <button type="submit" disabled={loading}>
              {loading ? 'Searching...' : 'Apply Filters'}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                setFilters(initialFilters)
                setFromLocal('')
                setToLocal('')
                void loadTransactions(initialFilters)
              }}
            >
              Reset
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h3>Transaction Results ({filteredTransactions.length})</h3>
        {loading ? <p>Loading transactions...</p> : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Account</th>
                <th>Payee</th>
                <th>Amount</th>
                <th>Risk Score</th>
                <th>Occurred At</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {visibleTransactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>#{transaction.id}</td>
                  <td>{transaction.accountId}</td>
                  <td>{transaction.payeeId}</td>
                  <td>{formatCurrency(Number(transaction.amount), transaction.currency)}</td>
                  <td>
                    <span className={`badge sev-${riskBucket(transaction.riskScore)}`}>{transaction.riskScore}</span>
                  </td>
                  <td>{formatDate(transaction.occurredAt)}</td>
                  <td>{transaction.description || '--'}</td>
                </tr>
              ))}
              {!visibleTransactions.length ? (
                <tr>
                  <td className="empty-row" colSpan={7}>
                    No transactions found for the current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {filteredTransactions.length > pageSize ? (
          <div className="button-row">
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
              Previous
            </button>
            <span>Page {page} of {pageCount}</span>
            <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount}>
              Next
            </button>
          </div>
        ) : null}
      </section>
    </div>
  )
}




