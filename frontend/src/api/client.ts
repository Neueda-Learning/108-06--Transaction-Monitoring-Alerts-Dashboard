const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '') ?? ''

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface RequestOptions extends RequestInit {
  params?: object
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const baseUrl = API_BASE_URL || window.location.origin
  const url = new URL(cleanPath, `${baseUrl}/`)

  if (params) {
    Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value))
      }
    })
  }

  if (!API_BASE_URL) {
    return `${url.pathname}${url.search}`
  }

  return url.toString()
}

export async function apiRequest<T>(path: string, options?: RequestOptions): Promise<T> {
  const headers = new Headers(options?.headers ?? {})

  if (!headers.has('Content-Type') && options?.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(buildUrl(path, options?.params), {
    ...options,
    headers,
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const errorBody = await response.json()
      if (typeof errorBody?.message === 'string') {
        message = errorBody.message
      }
    } catch {
      // Best-effort parsing. Keep a fallback message if body is not JSON.
    }
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}



