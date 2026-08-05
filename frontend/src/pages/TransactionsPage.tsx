import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
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

function createEmptyCreateForm() {
  return {
    accountId: '',
    payeeId: '',
    amount: '',
    currency: '',
    occurredAt: '',
    description: '',
  }
}

const createPlaceholders = {
  accountId: 'ACC-001',
  payeeId: 'PAYEE-008',
  amount: '5000',
  currency: 'USD',
}

function prioritizeCreatedTransaction(
  loadedTransactions: TransactionResponse[],
  createdTransaction: TransactionResponse,
) {
  const matchingTransaction = loadedTransactions.find((transaction) => transaction.id === createdTransaction.id)
  const remainingTransactions = loadedTransactions.filter((transaction) => transaction.id !== createdTransaction.id)

  return [matchingTransaction ?? createdTransaction, ...remainingTransactions]
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
  const [createdTransactionId, setCreatedTransactionId] = useState<number | null>(null)
  const resultsRef = useRef<HTMLElement | null>(null)
  const [createFormKey, setCreateFormKey] = useState(0)
  const pageSize = 8

  const [createForm, setCreateForm] = useState(() => createEmptyCreateForm())

  const resetCreateForm = useCallback(() => {
    setCreateForm(createEmptyCreateForm())
    setCreateFormKey((prev) => prev + 1)
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(initialFilters)
    setFromLocal('')
    setToLocal('')
  }, [])

  const loadTransactions = useCallback(async (activeFilters: TransactionFilters = initialFilters) => {
    setLoading(true)
    setError(null)
    try {
      const result = await getTransactions(activeFilters)
      setTransactions(result)
      return result
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load transactions')
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTransactions(initialFilters)
  }, [loadTransactions])

  useEffect(() => {
    if (createdTransactionId === null) {
      return
    }

    const createdRow = document.getElementById(`transaction-row-${createdTransactionId}`)

    if (createdRow instanceof HTMLElement) {
      createdRow.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [createdTransactionId, transactions])

  const filteredTransactions = filterItemsByText(transactions, search, (transaction) => [
    transaction.accountId,
    transaction.payeeId,
    transaction.payeeName,
    transaction.description,
    transaction.currency,
    transaction.status,
    transaction.id,
  ])

  const pageCount = getPageCount(filteredTransactions.length, pageSize)
  const visibleTransactions = paginateItems(filteredTransactions, page, pageSize)

  useEffect(() => {
    setPage(1)
  }, [filters, search])

  const onFilterSubmit = (event: FormEvent) => {
    event.preventDefault()
    setCreatedTransactionId(null)
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
        accountId: createForm.accountId,
        payeeId: createForm.payeeId,
        amount: Number(createForm.amount),
        currency: createForm.currency,
        occurredAt: toIsoFromLocalDateTime(createForm.occurredAt),
        description: createForm.description || null,
      })

      resetCreateForm()
      resetFilters()

      const refreshedTransactions = await loadTransactions(initialFilters)
      setTransactions(prioritizeCreatedTransaction(refreshedTransactions, createdTransaction))
      setCreatedTransactionId(createdTransaction.id)
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
        <form key={createFormKey} className="grid-form" autoComplete="off" onSubmit={onCreateSubmit}>
          <label>
            Account ID
            <input
              id="tx-create-account-id"
              name="tx-create-account-id"
              autoComplete="new-password"
              data-lpignore="true"
              data-1p-ignore="true"
              value={createForm.accountId ?? ''}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, accountId: event.target.value }))}
              placeholder={createPlaceholders.accountId}
              required
            />
          </label>
          <label>
            Payee ID
            <input
              id="tx-create-payee-id"
              name="tx-create-payee-id"
              autoComplete="new-password"
              data-lpignore="true"
              data-1p-ignore="true"
              value={createForm.payeeId ?? ''}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, payeeId: event.target.value }))}
              placeholder={createPlaceholders.payeeId}
              required
            />
          </label>
          <label>
            Amount
            <input
              type="number"
              min="0.01"
              step="0.01"
              id="tx-create-amount"
              name="tx-create-amount"
              autoComplete="off"
              value={createForm.amount ?? ''}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, amount: event.target.value }))}
              placeholder={createPlaceholders.amount}
              required
            />
          </label>
          <label>
            Currency
            <input
              id="tx-create-currency"
              name="tx-create-currency"
              autoComplete="off"
              value={createForm.currency ?? ''}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, currency: event.target.value }))}
              placeholder={createPlaceholders.currency}
              required
              maxLength={3}
            />
          </label>
          <label>
            Occurred At
            <input
              type="datetime-local"
              id="tx-create-occurred-at"
              name="tx-create-occurred-at"
              autoComplete="off"
              value={createForm.occurredAt ?? ''}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, occurredAt: event.target.value }))}
            />
          </label>
          <label className="span-2">
            Description
            <input
              id="tx-create-description"
              name="tx-create-description"
              autoComplete="off"
              value={createForm.description ?? ''}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))}
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
                setCreatedTransactionId(null)
                resetFilters()
                void loadTransactions(initialFilters)
              }}
            >
              Reset
            </button>
          </div>
        </form>
      </section>

      <section ref={resultsRef} className="panel">
        <h3>Transaction Results ({filteredTransactions.length})</h3>
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
                <tr
                  key={transaction.id}
                  id={`transaction-row-${transaction.id}`}
                  className={transaction.id === createdTransactionId ? 'new-transaction-row' : undefined}
                >
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




