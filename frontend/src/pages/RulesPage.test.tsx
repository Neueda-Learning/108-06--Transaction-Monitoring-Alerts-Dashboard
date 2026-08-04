import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MonitoringRuleResponse } from '../api/types'
import * as rulesApi from '../api/rules'
import { RulesPage } from './RulesPage'

vi.mock('../api/rules', () => ({
  getRules: vi.fn(),
  createRule: vi.fn(),
  updateRule: vi.fn(),
  deleteRule: vi.fn(),
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
  })

  it('loads and renders rules on initial mount', async () => {
    vi.mocked(rulesApi.getRules).mockResolvedValueOnce([
      makeRule(1, { name: 'High Amount', severity: 'HIGH' }),
      makeRule(2, { name: 'Daily Limit', type: 'DAILY_LIMIT' }),
    ])

    render(<RulesPage />)

    expect(await screen.findByText('High Amount')).toBeInTheDocument()
    expect(screen.getByText('Daily Limit')).toBeInTheDocument()
    expect(rulesApi.getRules).toHaveBeenCalledTimes(1)
  })

  it('shows an error message when initial load fails', async () => {
    vi.mocked(rulesApi.getRules).mockRejectedValueOnce(new Error('load failed'))

    render(<RulesPage />)

    expect(await screen.findByText('load failed')).toBeInTheDocument()
  })

  it('creates a VELOCITY rule with numeric payload conversion', async () => {
    render(<RulesPage />)

    await screen.findByText('Configured Rules (0)')

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Velocity Burst' } })
    fireEvent.change(screen.getByLabelText('Rule Type'), { target: { value: 'VELOCITY' } })
    fireEvent.change(screen.getByLabelText('Velocity Count'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Window Minutes'), { target: { value: '10' } })

    fireEvent.click(screen.getByRole('button', { name: 'Create Rule' }))

    await waitFor(() => {
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
    })
  })

  it('edits and updates an existing rule', async () => {
    vi.mocked(rulesApi.getRules).mockResolvedValueOnce([makeRule(7, { name: 'Rule To Edit' })])

    render(<RulesPage />)

    expect(await screen.findByText('Rule To Edit')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Rule Updated' } })
    fireEvent.click(screen.getByRole('button', { name: 'Update Rule' }))

    await waitFor(() => {
      expect(rulesApi.updateRule).toHaveBeenCalledWith(
        7,
        expect.objectContaining({
          name: 'Rule Updated',
          type: 'AMOUNT_THRESHOLD',
          severity: 'MEDIUM',
        }),
      )
    })
  })

  it('deletes a rule only after confirmation', async () => {
    vi.mocked(rulesApi.getRules).mockResolvedValueOnce([makeRule(5, { name: 'Rule To Delete' })])

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<RulesPage />)

    expect(await screen.findByText('Rule To Delete')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith('Delete this rule?')
      expect(rulesApi.deleteRule).toHaveBeenCalledWith(5)
    })
  })

  it('filters and paginates rules in the table', async () => {
    const manyRules = Array.from({ length: 9 }, (_, index) =>
      makeRule(index + 1, { name: index === 8 ? 'Velocity Ninth' : `Rule ${index + 1}` }),
    )
    vi.mocked(rulesApi.getRules).mockResolvedValueOnce(manyRules)

    render(<RulesPage />)

    expect(await screen.findByText('Rule 1')).toBeInTheDocument()
    expect(screen.queryByText('Velocity Ninth')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(await screen.findByText('Velocity Ninth')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Search by name, type, or severity'), {
      target: { value: 'Velocity Ninth' },
    })

    expect(await screen.findByText('Configured Rules (1)')).toBeInTheDocument()
    expect(screen.getByText('Velocity Ninth')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
  })
})

