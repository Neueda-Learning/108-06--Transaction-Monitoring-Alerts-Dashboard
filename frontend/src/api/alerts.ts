import { apiRequest } from './client'
import type {
  AiInvestigationResponse,
  AlertResponse,
  AlertStatus,
  AlertStatusUpdateRequest,
  PagedResponse,
  PaginationParams,
  Severity,
} from './types'

export interface AlertFilters {
  status?: AlertStatus | ''
  severity?: Severity | ''
  search?: string
}

export function getAlerts(filters?: AlertFilters): Promise<AlertResponse[]>
export function getAlerts(filters: AlertFilters & PaginationParams): Promise<PagedResponse<AlertResponse>>
export function getAlerts(filters: (AlertFilters & PaginationParams) = {}) {
  const { page, size, ...query } = filters
  const params = page !== undefined && size !== undefined ? { ...query, page, size } : query
  return apiRequest<AlertResponse[] | PagedResponse<AlertResponse>>('/api/alerts', { params })
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

