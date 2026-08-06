import { apiRequest } from './client'
import type {
  PagedResponse,
  PaginationParams,
  TransactionCreateRequest,
  TransactionResponse,
  TransactionSortBy,
  TransactionStatus,
} from './types'

export interface TransactionFilters {
  accountId?: string
  payeeId?: string
  status?: TransactionStatus | ''
  minAmount?: string
  maxAmount?: string
  from?: string
  to?: string
  search?: string
  sortBy?: TransactionSortBy
}

export function getTransactions(
  filters: (TransactionFilters & PaginationParams) = {},
): Promise<TransactionResponse[] | PagedResponse<TransactionResponse>> {
  const { page, size, ...query } = filters
  const params = page !== undefined && size !== undefined ? { ...query, page, size } : query
  return apiRequest<TransactionResponse[] | PagedResponse<TransactionResponse>>('/api/transactions', { params })
}

export function createTransaction(payload: TransactionCreateRequest) {
  return apiRequest<TransactionResponse>('/api/transactions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

