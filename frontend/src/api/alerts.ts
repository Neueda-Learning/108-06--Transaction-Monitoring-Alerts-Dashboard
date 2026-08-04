import { apiRequest } from './client'
import type { AiInvestigationResponse, AlertResponse, AlertStatus, AlertStatusUpdateRequest, Severity } from './types'

export interface AlertFilters {
  status?: AlertStatus | ''
  severity?: Severity | ''
}

export function getAlerts(filters?: AlertFilters) {
  return apiRequest<AlertResponse[]>('/api/alerts', { params: filters })
}

export function getAlertById(id: number) {
  return apiRequest<AlertResponse>(`/api/alerts/${id}`)
}

export function updateAlertStatus(id: number, payload: AlertStatusUpdateRequest) {
  return apiRequest<AlertResponse>(`/api/alerts/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export function investigateWithAi(id: number) {
  return apiRequest<AiInvestigationResponse>(`/api/alerts/${id}/ai-investigate`, {
    method: 'POST',
  })
}

