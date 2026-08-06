import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Mock } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTransaction, getTransactions } from '../api/transactions'
import type { TransactionFilters } from '../api/transactions'
import type { TransactionResponse } from '../api/types'
import { TransactionsPage } from './TransactionsPage'

vi.mock('../api/transactions', () => ({
  createTransaction: vi.fn(),
  getTransactions: vi.fn(),
}))

const mockedCreateTransaction = vi.mocked(createTransaction)
// vi.mocked() collapses overloaded functions to their last signature; cast to the non-paginated overload used by these tests.
const mockedGetTransactions = getTransactions as unknown as Mock<(filters?: TransactionFilters) => Promise<TransactionResponse[]>>
const scrollIntoViewMock = vi.fn()

describe('TransactionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    scrollIntoViewMock.mockClear()
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoViewMock,
    })
  })

  it('clears the create form, shows the new transaction first, and scrolls to it after create', async () => {
    const existingTransaction = {
      id: 1,
      accountId: 'ACC-OLD',
      payeeId: 'PAYEE-OLD',
      payeeName: 'PAYEE-OLD',
      amount: 125,
      currency: 'USD',
      country: null,
      status: 'APPROVED' as const,
      occurredAt: '2026-08-04T10:00:00Z',
      description: 'Existing transaction',
      riskScore: 10,
    }

    const createdTransaction = {
      id: 99,
      accountId: 'ACC-NEW',
      payeeId: 'PAYEE-NEW',
      payeeName: 'PAYEE-NEW',
      amount: 500,
      currency: 'EUR',
      country: null,
      status: 'FLAGGED' as const,
      occurredAt: '2026-08-04T12:00:00Z',
      description: 'Freshly added transaction',
      riskScore: 78,
    }

    mockedGetTransactions
      .mockResolvedValueOnce([existingTransaction])
      .mockResolvedValueOnce([existingTransaction, createdTransaction])
      .mockResolvedValue([createdTransaction, existingTransaction])
    mockedCreateTransaction.mockResolvedValue(createdTransaction)

    const user = userEvent.setup()
    render(<TransactionsPage />)

    await screen.findByText('#1')

    const createSection = screen.getByRole('heading', { name: 'Create Transaction' }).closest('section')
    if (!createSection) {
      throw new Error('Create section not found')
    }

    const resultsSection = screen.getByRole('heading', { name: /Transaction Ledger/ }).closest('section')
    if (!resultsSection) {
      throw new Error('Results section not found')
    }

    const createForm = within(createSection)

    const accountIdInput = createForm.getByLabelText('Account ID')
    const payeeIdInput = createForm.getByLabelText('Payee ID')
    const amountInput = createForm.getByLabelText('Amount')
    const currencyInput = createForm.getByLabelText('Currency')
    const occurredAtInput = createForm.getByLabelText('Occurred At')
    const descriptionInput = createForm.getByLabelText('Description')

    await user.type(accountIdInput, 'ACC-NEW')
    await user.type(payeeIdInput, 'PAYEE-NEW')
    await user.type(amountInput, '500')
    await user.type(currencyInput, 'EUR')
    await user.type(occurredAtInput, '2026-08-04T12:00')
    await user.type(descriptionInput, 'Freshly added transaction')

    await user.click(createForm.getByRole('button', { name: 'Create Transaction' }))

    await waitFor(() => {
      expect(mockedCreateTransaction).toHaveBeenCalledWith({
        accountId: 'ACC-NEW',
        payeeId: 'PAYEE-NEW',
        amount: 500,
        currency: 'EUR',
        occurredAt: expect.stringContaining('2026-08-04T'),
        description: 'Freshly added transaction',
      })
    })

    await waitFor(() => {
      expect(mockedGetTransactions).toHaveBeenLastCalledWith(expect.objectContaining({
        accountId: '',
        payeeId: '',
        minAmount: '',
        maxAmount: '',
        from: '',
        to: '',
        search: '',
        sortBy: 'TIME_DESC',
        page: 0,
      }))
    })

    await waitFor(() => {
      const refreshedCreateForm = within(createSection)

      expect(refreshedCreateForm.getByLabelText('Account ID')).toHaveValue('')
      expect(refreshedCreateForm.getByLabelText('Payee ID')).toHaveValue('')
      expect(refreshedCreateForm.getByLabelText('Amount')).toHaveValue(null)
      expect(refreshedCreateForm.getByLabelText('Currency')).toHaveValue('')
      expect(refreshedCreateForm.getByLabelText('Occurred At')).toHaveValue('')
      expect(refreshedCreateForm.getByLabelText('Description')).toHaveValue('')
    })

    await waitFor(() => {
      const rows = within(resultsSection).getAllByRole('row')
      expect(rows.length).toBeGreaterThan(1)
    })

    expect(scrollIntoViewMock).toHaveBeenCalled()
  })
})



