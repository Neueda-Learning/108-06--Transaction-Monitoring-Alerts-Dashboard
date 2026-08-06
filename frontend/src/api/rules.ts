import { apiRequest } from './client'
import type { MonitoringRuleRequest, MonitoringRuleResponse, PagedResponse, PaginationParams } from './types'

export interface RuleFilters {
  search?: string
}

export function getRules(filters?: RuleFilters): Promise<MonitoringRuleResponse[]>
export function getRules(filters: RuleFilters & PaginationParams): Promise<PagedResponse<MonitoringRuleResponse>>
export function getRules(filters: (RuleFilters & PaginationParams) = {}) {
  const { page, size, ...query } = filters
  const params = page !== undefined && size !== undefined ? { ...query, page, size } : query
  return apiRequest<MonitoringRuleResponse[] | PagedResponse<MonitoringRuleResponse>>('/api/rules', { params })
}

export function getRuleById(id: number) {
  return apiRequest<MonitoringRuleResponse>(`/api/rules/${id}`)
}

export function createRule(payload: MonitoringRuleRequest) {
  return apiRequest<MonitoringRuleResponse>('/api/rules', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateRule(id: number, payload: MonitoringRuleRequest) {
  return apiRequest<MonitoringRuleResponse>(`/api/rules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deleteRule(id: number) {
  return apiRequest<void>(`/api/rules/${id}`, {
    method: 'DELETE',
  })
}

