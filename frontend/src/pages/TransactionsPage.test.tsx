import userEvent from '@testing-library/user-event'
import { render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TransactionResponse } from '../api/types'
import * as transactionsApi from '../api/transactions'
import { TransactionsPage } from './TransactionsPage'

const { toastSuccess } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
}))

vi.mock('../api/transactions', () => ({
  getTransactions: vi.fn(),
  createTransaction: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({
  toast: {
    success: toastSuccess,
  },
}))

function makeTransaction(id: number, overrides: Partial<TransactionResponse> = {}): TransactionResponse {
  return {
    id,
    accountId: `ACC-${id}`,
    payeeId: `PAYEE-${id}`,
    payeeName: null,
    amount: 100 + id,
    currency: 'USD',
    country: null,
    status: 'APPROVED',
    occurredAt: '2026-01-01T10:00:00.000Z',
    description: `Payment ${id}`,
    riskScore: 20,
    ...overrides,
  }
}

describe('TransactionsPage', () => {
  beforeEach(() => {
    vi.mocked(transactionsApi.getTransactions).mockResolvedValue([])
    vi.mocked(transactionsApi.createTransaction).mockResolvedValue(makeTransaction(100))
    toastSuccess.mockReset()
  })

  it('loads transactions on mount and renders rows', async () => {
    vi.mocked(transactionsApi.getTransactions).mockResolvedValueOnce([
      makeTransaction(1, { accountId: 'ACC-ALPHA', payeeId: 'PAYEE-Z' }),
      makeTransaction(2, { accountId: 'ACC-BETA' }),
    ])

    render(<TransactionsPage />)

    expect(screen.getByText('Loading transactions...')).toBeInTheDocument()
    expect(await screen.findByText('#1')).toBeInTheDocument()
    expect(screen.getByText('ACC-ALPHA')).toBeInTheDocument()
    expect(screen.getByText('#2')).toBeInTheDocument()
    expect(transactionsApi.getTransactions).toHaveBeenCalledTimes(1)
    expect(transactionsApi.getTransactions).toHaveBeenCalledWith({
      accountId: '',
      payeeId: '',
      minAmount: '',
      maxAmount: '',
      from: '',
      to: '',
    })
  })

  it('applies filters with ISO date conversion on submit', async () => {
    const user = userEvent.setup()
    render(<TransactionsPage />)

    await screen.findByText('Transaction Results (0)')

    const filtersSection = screen.getByRole('heading', { name: 'Filters' }).closest('section')
    if (!filtersSection) {
      throw new Error('Filters section not found')
    }
    const filters = within(filtersSection)

    await user.type(filters.getByLabelText('Account ID'), 'ACC-999')
    await user.type(filters.getByLabelText('Payee ID'), 'PAYEE-123')
    await user.type(filters.getByLabelText('Min Amount'), '50')
    await user.type(filters.getByLabelText('Max Amount'), '500')
    await user.type(filters.getByLabelText('From (ISO)'), '2026-05-01T12:30')
    await user.type(filters.getByLabelText('To (ISO)'), '2026-05-02T18:45')

    await user.click(filters.getByRole('button', { name: 'Apply Filters' }))

    await waitFor(() => {
      const payloads = vi.mocked(transactionsApi.getTransactions).mock.calls.map((call) => call[0])
      expect(payloads).toContainEqual({
        accountId: 'ACC-999',
        payeeId: 'PAYEE-123',
        minAmount: '50',
        maxAmount: '500',
        from: '2026-05-01T12:30:00.000Z',
        to: '2026-05-02T18:45:00.000Z',
      })
    })
  })

  it('resets filter fields and reloads unfiltered data', async () => {
    const user = userEvent.setup()
    render(<TransactionsPage />)

    await screen.findByText('Transaction Results (0)')

    const filtersSection = screen.getByRole('heading', { name: 'Filters' }).closest('section')
    if (!filtersSection) {
      throw new Error('Filters section not found')
    }
    const filters = within(filtersSection)

    const accountInput = filters.getByLabelText('Account ID')
    const minAmountInput = filters.getByLabelText('Min Amount')

    await user.type(accountInput, 'ACC-RESET')
    await user.type(minAmountInput, '100')
    await user.click(filters.getByRole('button', { name: 'Reset' }))

    expect(accountInput).toHaveValue('')
    expect(minAmountInput).toHaveValue(null)

    await waitFor(() => {
      const calls = vi.mocked(transactionsApi.getTransactions).mock.calls
      expect(calls.length).toBeGreaterThanOrEqual(2)
    })

    const lastCall = vi.mocked(transactionsApi.getTransactions).mock.calls.at(-1)
    expect(lastCall?.[0]).toEqual({
      accountId: '',
      payeeId: '',
      minAmount: '',
      maxAmount: '',
      from: '',
      to: '',
    })
  })

  it('creates transaction and shows alert toast when refreshed status is flagged', async () => {
    const user = userEvent.setup()
    vi.mocked(transactionsApi.getTransactions)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([makeTransaction(500, { status: 'FLAGGED' })])
    vi.mocked(transactionsApi.createTransaction).mockResolvedValueOnce(
      makeTransaction(500, { status: 'APPROVED' }),
    )

    render(<TransactionsPage />)

    await screen.findByText('Transaction Results (0)')

    const createSection = screen.getByRole('heading', { name: 'Create Transaction' }).closest('section')
    if (!createSection) {
      throw new Error('Create section not found')
    }
    const createForm = within(createSection)

    await user.clear(createForm.getByLabelText('Account ID'))
    await user.type(createForm.getByLabelText('Account ID'), 'ACC-NEW')
    await user.clear(createForm.getByLabelText('Payee ID'))
    await user.type(createForm.getByLabelText('Payee ID'), 'PAYEE-NEW')
    await user.clear(createForm.getByLabelText('Amount'))
    await user.type(createForm.getByLabelText('Amount'), '250')
    await user.clear(createForm.getByLabelText('Currency'))
    await user.type(createForm.getByLabelText('Currency'), 'USD')
    await user.type(createForm.getByLabelText('Description'), 'Test create')

    await user.click(createForm.getByRole('button', { name: 'Create Transaction' }))

    await waitFor(() => {
      expect(transactionsApi.createTransaction).toHaveBeenCalledWith({
        accountId: 'ACC-NEW',
        payeeId: 'PAYEE-NEW',
        amount: 250,
        currency: 'USD',
        occurredAt: null,
        description: 'Test create',
      })
      expect(toastSuccess).toHaveBeenCalledWith('Transaction created')
      expect(toastSuccess).toHaveBeenCalledWith('Alert created')
    })
  })

  it('shows API error when creating transaction fails', async () => {
    const user = userEvent.setup()
    vi.mocked(transactionsApi.createTransaction).mockRejectedValueOnce(new Error('create failed'))

    render(<TransactionsPage />)

    await screen.findByText('Transaction Results (0)')

    await user.click(screen.getByRole('button', { name: 'Create Transaction' }))

    expect(await screen.findByText('create failed')).toBeInTheDocument()
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it('supports search + pagination transitions', async () => {
    const user = userEvent.setup()
    vi.mocked(transactionsApi.getTransactions).mockResolvedValueOnce(
      Array.from({ length: 9 }, (_, index) =>
        makeTransaction(index + 1, {
          accountId: index === 8 ? 'ACC-NINTH' : `ACC-${index + 1}`,
          description: index === 8 ? 'special account' : `Payment ${index + 1}`,
        }),
      ),
    )

    render(<TransactionsPage />)

    expect(await screen.findByText('#1')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    expect(screen.queryByText('#9')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('#9')).toBeInTheDocument()
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()

    const searchInput = screen.getByPlaceholderText('Search by account, payee, or description')
    await user.clear(searchInput)
    await user.type(searchInput, 'special')

    expect(await screen.findByText('Transaction Results (1)')).toBeInTheDocument()
    expect(screen.getByText('#9')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
  })
})

