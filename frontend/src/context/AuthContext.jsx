import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initialize from localStorage
    const storedToken = localStorage.getItem('accessToken')
    const storedUser = localStorage.getItem('authUser')
    if (storedToken) setToken(storedToken)
    if (storedUser) setUser(JSON.parse(storedUser))
    setLoading(false)
  }, [])

  const saveAuth = (nextUser, nextToken) => {
    setUser(nextUser)
    setToken(nextToken)
    try {
      localStorage.setItem('authUser', JSON.stringify(nextUser))
      localStorage.setItem('accessToken', nextToken)
    } catch {}
  }

  const clearAuth = () => {
    setUser(null)
    setToken(null)
    try {
      localStorage.removeItem('authUser')
      localStorage.removeItem('accessToken')
    } catch {}
  }

  const register = async ({ fullName, email, username, password }) => {
    const res = await fetch('/api/v1/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, username, password })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Registration failed')
    const nextUser = data?.data?.user
    const nextToken = data?.data?.accessToken
    saveAuth(nextUser, nextToken)
    return nextUser
  }

  const login = async ({ username, email, password }) => {
    const res = await fetch('/api/v1/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data?.message || 'Login failed')
    const nextUser = data?.data?.user
    const nextToken = data?.data?.accessToken
    saveAuth(nextUser, nextToken)
    return nextUser
  }

  const logout = async () => {
    try {
      // Call backend to clear refresh tokens and cookies
      if (token) {
        await fetch('/api/v1/users/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      }
    } catch {}
    clearAuth()
  }

  const value = useMemo(() => ({
    user,
    token,
    loading,
    login,
    register,
    logout
  }), [user, token, loading])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}