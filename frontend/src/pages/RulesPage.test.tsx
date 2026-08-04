import userEvent from '@testing-library/user-event'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MonitoringRuleResponse } from '../api/types'
import * as rulesApi from '../api/rules'
import { RulesPage } from './RulesPage'

const { toastSuccess } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
}))

vi.mock('../api/rules', () => ({
  getRules: vi.fn(),
  createRule: vi.fn(),
  updateRule: vi.fn(),
  deleteRule: vi.fn(),
}))

vi.mock('react-hot-toast', () => ({
  toast: {
    success: toastSuccess,
  },
}))

function makeRule(id: number, overrides: Partial<MonitoringRuleResponse> = {}): MonitoringRuleResponse {
  return {
    id,
    name: `Rule ${id}`,
    type: 'AMOUNT_THRESHOLD',
    severity: 'MEDIUM',
    active: true,
    amountThreshold: 1000,
    velocityCount: null,
    velocityWindowMinutes: null,
    dailyLimit: null,
    ...overrides,
  }
}

describe('RulesPage', () => {
  beforeEach(() => {
    vi.mocked(rulesApi.getRules).mockResolvedValue([])
    vi.mocked(rulesApi.createRule).mockResolvedValue(makeRule(100))
    vi.mocked(rulesApi.updateRule).mockResolvedValue(makeRule(101))
    vi.mocked(rulesApi.deleteRule).mockResolvedValue(undefined)
    toastSuccess.mockReset()
  })

  it('shows loading state, then renders loaded rules and exact fetch count', async () => {
    vi.mocked(rulesApi.getRules).mockResolvedValueOnce([
      makeRule(1, { name: 'High Amount', severity: 'HIGH' }),
      makeRule(2, { name: 'Daily Limit', type: 'DAILY_LIMIT' }),
    ])

    render(<RulesPage />)

    expect(screen.getByText('Loading rules...')).toBeInTheDocument()
    expect(await screen.findByText('High Amount')).toBeInTheDocument()
    expect(screen.getByText('Daily Limit')).toBeInTheDocument()
    expect(screen.getByText('Configured Rules (2)')).toBeInTheDocument()
    expect(rulesApi.getRules).toHaveBeenCalledTimes(1)
  })

  it('shows the exact error text when initial load fails', async () => {
    vi.mocked(rulesApi.getRules).mockRejectedValueOnce(new Error('load failed'))

    render(<RulesPage />)

    expect(screen.getByText('Loading rules...')).toBeInTheDocument()
    expect(await screen.findByText('load failed')).toBeInTheDocument()
    expect(screen.getByText('Configured Rules (0)')).toBeInTheDocument()
  })

  it('creates a AMOUNT_THRESHOLD rule with the exact payload and reloads data', async () => {
    const user = userEvent.setup()

    render(<RulesPage />)

    expect(await screen.findByText('Configured Rules (0)')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Name'), 'Amount Guard')
    await user.click(screen.getByLabelText('Active'))
    await user.selectOptions(screen.getByLabelText('Rule Type'), 'AMOUNT_THRESHOLD')
    await user.clear(screen.getByLabelText('Amount Threshold'))
    await user.type(screen.getByLabelText('Amount Threshold'), '2500')
    await user.click(screen.getByRole('button', { name: 'Create Rule' }))

    await waitFor(() => {
      expect(rulesApi.createRule).toHaveBeenCalledTimes(1)
      expect(rulesApi.createRule).toHaveBeenCalledWith({
        name: 'Amount Guard',
        type: 'AMOUNT_THRESHOLD',
        severity: 'MEDIUM',
        active: false,
        amountThreshold: 2500,
        velocityCount: null,
        velocityWindowMinutes: null,
        dailyLimit: null,
      })
      expect(rulesApi.getRules).toHaveBeenCalledTimes(2)
      expect(toastSuccess).toHaveBeenCalledWith('Rule created')
    })
  })

  it('creates a VELOCITY rule and converts the numeric payload correctly', async () => {
    const user = userEvent.setup()

    render(<RulesPage />)

    expect(await screen.findByText('Configured Rules (0)')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Name'), 'Velocity Burst')
    await user.selectOptions(screen.getByLabelText('Rule Type'), 'VELOCITY')
    await user.type(screen.getByLabelText('Velocity Count'), '3')
    await user.type(screen.getByLabelText('Window Minutes'), '10')
    await user.click(screen.getByRole('button', { name: 'Create Rule' }))

    await waitFor(() => {
      expect(rulesApi.createRule).toHaveBeenCalledTimes(1)
      expect(rulesApi.createRule).toHaveBeenCalledWith({
        name: 'Velocity Burst',
        type: 'VELOCITY',
        severity: 'MEDIUM',
        active: true,
        amountThreshold: null,
        velocityCount: 3,
        velocityWindowMinutes: 10,
        dailyLimit: null,
      })
      expect(rulesApi.getRules).toHaveBeenCalledTimes(2)
      expect(toastSuccess).toHaveBeenCalledWith('Rule created')
    })
  })

  it('enters edit mode and allows cancel back to create mode', async () => {
    const user = userEvent.setup()
    vi.mocked(rulesApi.getRules).mockResolvedValueOnce([
      makeRule(7, { name: 'Rule To Edit', type: 'DAILY_LIMIT', dailyLimit: 5000 }),
    ])

    render(<RulesPage />)

    expect(await screen.findByText('Rule To Edit')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(screen.getByRole('button', { name: 'Update Rule' })).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Rule To Edit')
    expect(screen.getByLabelText('Daily Limit')).toHaveValue(5000)

    await user.click(screen.getByRole('button', { name: 'Cancel Edit' }))
    expect(screen.getByRole('button', { name: 'Create Rule' })).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('')
    expect(screen.getByLabelText('Rule Type')).toHaveValue('AMOUNT_THRESHOLD')
    expect(screen.getByLabelText('Amount Threshold')).toHaveValue(10000)
  })

  it('updates an existing DAILY_LIMIT rule exactly and reloads after submit', async () => {
    const user = userEvent.setup()
    vi.mocked(rulesApi.getRules).mockResolvedValueOnce([
      makeRule(7, { name: 'Rule To Edit', type: 'DAILY_LIMIT', dailyLimit: 5000 }),
    ])

    render(<RulesPage />)

    expect(await screen.findByText('Rule To Edit')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByLabelText('Name'))
    await user.type(screen.getByLabelText('Name'), 'Daily Limit Updated')
    await user.clear(screen.getByLabelText('Daily Limit'))
    await user.type(screen.getByLabelText('Daily Limit'), '9000')
    await user.click(screen.getByRole('button', { name: 'Update Rule' }))

    await waitFor(() => {
      expect(rulesApi.updateRule).toHaveBeenCalledWith(
        7,
        expect.objectContaining({
          name: 'Daily Limit Updated',
          type: 'DAILY_LIMIT',
          severity: 'MEDIUM',
          active: true,
          dailyLimit: 9000,
        }),
      )
      expect(rulesApi.getRules).toHaveBeenCalledTimes(2)
      expect(toastSuccess).toHaveBeenCalledWith('Rule updated successfully')
    })
  })

  it('does not delete when confirmation is declined', async () => {
    const user = userEvent.setup()
    vi.mocked(rulesApi.getRules).mockResolvedValueOnce([makeRule(5, { name: 'Rule To Delete' })])

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(<RulesPage />)

    expect(await screen.findByText('Rule To Delete')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(confirmSpy).toHaveBeenCalledWith('Delete this rule?')
    expect(rulesApi.deleteRule).not.toHaveBeenCalled()
    expect(rulesApi.getRules).toHaveBeenCalledTimes(1)
  })

  it('deletes after confirmation and reloads the list exactly once', async () => {
    const user = userEvent.setup()
    vi.mocked(rulesApi.getRules).mockResolvedValueOnce([makeRule(5, { name: 'Rule To Delete' })])

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<RulesPage />)

    expect(await screen.findByText('Rule To Delete')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith('Delete this rule?')
      expect(rulesApi.deleteRule).toHaveBeenCalledTimes(1)
      expect(rulesApi.deleteRule).toHaveBeenCalledWith(5)
      expect(rulesApi.getRules).toHaveBeenCalledTimes(2)
      expect(toastSuccess).toHaveBeenCalledWith('Rule deleted')
    })
  })

  it('filters by search term, resets pagination to page 1, and hides next page controls for one result', async () => {
    const user = userEvent.setup()
    const manyRules = Array.from({ length: 9 }, (_, index) =>
      makeRule(index + 1, {
        name: index === 8 ? 'Velocity Ninth' : `Rule ${index + 1}`,
        type: index === 8 ? 'VELOCITY' : 'AMOUNT_THRESHOLD',
        severity: index === 8 ? 'HIGH' : 'LOW',
        active: index === 8 ? false : true,
      }),
    )
    vi.mocked(rulesApi.getRules).mockResolvedValueOnce(manyRules)

    render(<RulesPage />)

    expect(await screen.findByText('Rule 1')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument()
    expect(screen.queryByText('Velocity Ninth')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument()
    expect(await screen.findByText('Velocity Ninth')).toBeInTheDocument()

    await user.clear(screen.getByPlaceholderText('Search by name, type, or severity'))
    await user.type(screen.getByPlaceholderText('Search by name, type, or severity'), 'inactive')

    expect(await screen.findByText('Configured Rules (1)')).toBeInTheDocument()
    expect(screen.getByText('Velocity Ninth')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument()
  })
})

