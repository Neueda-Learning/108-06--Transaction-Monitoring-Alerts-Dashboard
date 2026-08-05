import { apiRequest } from './client'
import type { AiDashboardSummaryResponse } from './types'

export function generateAiDashboardSummary() {
  return apiRequest<AiDashboardSummaryResponse>('/api/dashboard/ai-summary', {
    method: 'POST',
  })
}
