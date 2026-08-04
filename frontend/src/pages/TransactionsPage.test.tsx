import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTransaction, getTransactions } from '../api/transactions'
import { TransactionsPage } from './TransactionsPage'

vi.mock('../api/transactions', () => ({
  createTransaction: vi.fn(),
  getTransactions: vi.fn(),
}))

const mockedCreateTransaction = vi.mocked(createTransaction)
const mockedGetTransactions = vi.mocked(getTransactions)
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
      amount: 125,
      currency: 'USD',
      occurredAt: '2026-08-04T10:00:00Z',
      description: 'Existing transaction',
    }

    const createdTransaction = {
      id: 99,
      accountId: 'ACC-NEW',
      payeeId: 'PAYEE-NEW',
      amount: 500,
      currency: 'EUR',
      occurredAt: '2026-08-04T12:00:00Z',
      description: 'Freshly added transaction',
    }

    mockedGetTransactions
      .mockResolvedValueOnce([existingTransaction])
      .mockResolvedValueOnce([existingTransaction, createdTransaction])
    mockedCreateTransaction.mockResolvedValue(createdTransaction)

    const user = userEvent.setup()
    render(<TransactionsPage />)

    await screen.findByText('#1')

    const createSection = screen.getByRole('heading', { name: 'Create Transaction' }).closest('section')
    if (!createSection) {
      throw new Error('Create section not found')
    }

    const resultsSection = screen.getByRole('heading', { name: /Transaction Results/ }).closest('section')
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
      expect(mockedGetTransactions).toHaveBeenLastCalledWith({
        accountId: '',
        payeeId: '',
        minAmount: '',
        maxAmount: '',
        from: '',
        to: '',
      })
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
      expect(rows[1]).toHaveTextContent('#99')
      expect(rows[1]).toHaveClass('new-transaction-row')
    })

    expect(scrollIntoViewMock).toHaveBeenCalled()
  })
})



