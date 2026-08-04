import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('api client URL building', () => {
  it('uses a relative /api path when no explicit API base URL is configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ id: 1 }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { apiRequest } = await import('./client')

    await apiRequest('/api/transactions', {
      params: { accountId: 'ACC-001' },
    })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/transactions?accountId=ACC-001',
      expect.objectContaining({ headers: expect.any(Headers) }),
    )
  })

  it('uses the absolute API base URL when VITE_API_BASE_URL is configured', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://localhost:8080/')

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ id: 1 }]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const { apiRequest } = await import('./client')

    await apiRequest('/api/transactions', {
      params: { accountId: 'ACC-002' },
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/api/transactions?accountId=ACC-002',
      expect.objectContaining({ headers: expect.any(Headers) }),
    )
  })
})

