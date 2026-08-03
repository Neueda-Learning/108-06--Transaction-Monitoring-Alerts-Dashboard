import { apiRequest } from './client'
import type { MonitoringRuleRequest, MonitoringRuleResponse } from './types'

export function getRules() {
  return apiRequest<MonitoringRuleResponse[]>('/api/rules')
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

