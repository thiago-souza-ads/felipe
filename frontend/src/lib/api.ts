const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://felipe.nextagent.com.br'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('accessToken')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  }
  const res = await fetch(`${API_URL}${path}`, { ...options, headers })
  if (res.status === 401) {
    localStorage.removeItem('accessToken')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ accessToken: string; refreshToken: string; user: any }>('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ email, password })
      }),
    register: (email: string, password: string) =>
      request<{ user: any }>('/api/auth/register', {
        method: 'POST', body: JSON.stringify({ email, password })
      }),
    logout: (refreshToken: string) =>
      request('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
    me: () => request<{ id: string; email: string; role: string }>('/api/auth/me')
  },
  docs: {
    list: () => request<{ documents: any[] }>('/api/docs'),
    get: (id: string) => request<{ document: any }>(`/api/docs/${id}`),
    delete: (id: string) => request(`/api/docs/${id}`, { method: 'DELETE' }),
    chat: (question: string, documentId?: string) =>
      request<{ answer: string; question: string }>('/api/docs/chat', {
        method: 'POST', body: JSON.stringify({ question, documentId })
      }),
    upload: async (file: File) => {
      const token = getToken()
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${API_URL}/api/docs/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      })
      if (!res.ok) throw new Error('Upload failed')
      return res.json()
    }
  }
}
