import axios from 'axios'
import {
  mockAlert,
  mockAuditHistory,
  mockNotes,
  mockTransactions,
} from '../mocks/alertMockData'
import type { Alert, AuditEvent, InvestigationNote, Transaction } from '../models/alertModels'

const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

const http = axios.create({ baseURL: '/api' })

function delay(ms = 400): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fetchAlert(id: number): Promise<Alert> {
  if (USE_MOCK) {
    await delay()
    return { ...mockAlert, id }
  }
  const res = await http.get<Alert>(`/alerts/${id}`)
  return res.data
}

export async function fetchAlertTransactions(id: number): Promise<Transaction[]> {
  if (USE_MOCK) {
    await delay()
    return mockTransactions
  }
  const res = await http.get<Transaction[]>(`/alerts/${id}/transactions`)
  return res.data
}

export async function fetchAlertNotes(id: number): Promise<InvestigationNote[]> {
  if (USE_MOCK) {
    await delay()
    return mockNotes
  }
  const res = await http.get<InvestigationNote[]>(`/alerts/${id}/notes`)
  return res.data
}

export async function fetchAlertHistory(id: number): Promise<AuditEvent[]> {
  if (USE_MOCK) {
    await delay()
    return mockAuditHistory
  }
  const res = await http.get<AuditEvent[]>(`/alerts/${id}/history`)
  return res.data
}

export async function postNote(id: number, content: string): Promise<InvestigationNote> {
  if (USE_MOCK) {
    await delay()
    const note: InvestigationNote = {
      id: Date.now(),
      alertId: id,
      operatorName: 'Operator',
      content,
      createdAt: new Date().toISOString(),
    }
    return note
  }
  const res = await http.post<InvestigationNote>(`/alerts/${id}/notes`, { content })
  return res.data
}

export async function closeAlert(id: number): Promise<Alert> {
  if (USE_MOCK) {
    await delay()
    return { ...mockAlert, id, status: 'CLOSED', closedAt: new Date().toISOString() }
  }
  const res = await http.post<Alert>(`/alerts/${id}/close`)
  return res.data
}

export async function dismissAlert(id: number): Promise<Alert> {
  if (USE_MOCK) {
    await delay()
    return { ...mockAlert, id, status: 'DISMISSED', dismissedAt: new Date().toISOString() }
  }
  const res = await http.post<Alert>(`/alerts/${id}/dismiss`)
  return res.data
}

