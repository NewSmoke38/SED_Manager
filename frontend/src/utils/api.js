import { useAuth } from '../context/AuthContext'

// Basic helper to build headers with Authorization when available
export function getAuthHeaders() {
  try {
    const token = localStorage.getItem('accessToken')
    if (token) {
      return { Authorization: `Bearer ${token}` }
    }
  } catch {}
  return {}
}

export async function authFetch(url, options = {}) {
  const headers = {
    ...(options.headers || {}),
    ...getAuthHeaders(),
  }
  const res = await fetch(url, { ...options, headers })
  return res
}