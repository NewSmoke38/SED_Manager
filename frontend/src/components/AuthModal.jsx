import React, { useEffect, useState } from 'react'
import './AuthModal.css'
import { useAuth } from '../context/AuthContext'

export default function AuthModal({ isOpen, onClose, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode)
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    username: '',
    password: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { register, login } = useAuth()

  useEffect(() => {
    if (!isOpen) {
      setForm({ fullName: '', email: '', username: '', password: '' })
      setError('')
      setSubmitting(false)
      setMode(initialMode)
    }
  }, [isOpen, initialMode])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (mode === 'signup') {
        await register({
          fullName: form.fullName,
          email: form.email,
          username: form.username,
          password: form.password,
        })
      } else {
        await login({
          username: form.username,
          email: form.email,
          password: form.password,
        })
      }
      onClose()
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-header">
          <h3>{mode === 'signup' ? 'Create Account' : 'Welcome back'}</h3>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        <div className="auth-modal-tabs">
          <button
            className={mode === 'login' ? 'tab active' : 'tab'}
            onClick={() => setMode('login')}
            disabled={submitting}
          >
            Login
          </button>
          <button
            className={mode === 'signup' ? 'tab active' : 'tab'}
            onClick={() => setMode('signup')}
            disabled={submitting}
          >
            Sign Up
          </button>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="form-group">
              <label htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                placeholder="Ada Lovelace"
                value={form.fullName}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="ada@example.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="adalovelace"
              value={form.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              minLength={6}
              required
            />
          </div>

          <button className="submit-button" type="submit" disabled={submitting}>
            {submitting ? (mode === 'signup' ? 'Creating account…' : 'Logging in…') : (mode === 'signup' ? 'Create account' : 'Login')}
          </button>
        </form>
      </div>
    </div>
  )
}