import { apiRequest } from './client'
import type { TransactionCreateRequest, TransactionResponse } from './types'

export interface TransactionFilters {
  accountId?: string
  payeeId?: string
  minAmount?: string
  maxAmount?: string
  from?: string
  to?: string
}

export function getTransactions(filters?: TransactionFilters) {
  return apiRequest<TransactionResponse[]>('/api/transactions', { params: filters })
}

export function createTransaction(payload: TransactionCreateRequest) {
  return apiRequest<TransactionResponse>('/api/transactions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

