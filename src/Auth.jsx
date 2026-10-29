import { useEffect, useState } from 'react'
import './Auth.css'

const emptyForm = { name: '', email: '', password: '', role: 'STUDENT', studentId: '' }

export default function Auth({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active = true
    fetch('/api/auth/session', { credentials: 'include' })
      .then((response) => response.ok ? response.json() : null)
      .then((account) => { if (active && account) onAuthenticated(account) })
      .finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [onAuthenticated])

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'login' ? { email: form.email, password: form.password, role: form.role } : form),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Unable to continue')
      onAuthenticated(data)
    } catch (caught) {
      setError(caught.message)
    } finally {
      setBusy(false)
    }
  }

  function changeMode(next) {
    setMode(next)
    setError('')
  }

  if (checking) return <div className="auth-loading"><span>SA</span><p>Opening your workspace…</p></div>

  return (
    <main className="auth-page">
      <section className="auth-visual">
        <div className="auth-brand"><span>SA</span><strong>SmartAttend</strong></div>
        <div className="auth-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="attendance-mark"><i /><i /><i /><b>94%</b><small>daily attendance</small></div></div>
        <blockquote>“Small routines, clear records, better days.”<cite>— Campus attendance team</cite></blockquote>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <span className="auth-overline">SMARTATTEND CAMPUS</span>
          <h1>{mode === 'login' ? 'Welcome back.' : 'Create your account.'}</h1>
          <p>{mode === 'login' ? 'Choose your account type and sign in to continue.' : 'Register for an administrator or student workspace.'}</p>

          <div className="role-switch" role="tablist">
            {['STUDENT', 'ADMIN'].map((role) => <button type="button" key={role} className={form.role === role ? 'active' : ''} onClick={() => setForm({ ...form, role })}>{role === 'STUDENT' ? 'Student' : 'Administrator'}</button>)}
          </div>

          <form onSubmit={submit}>
            {mode === 'register' && <label>Full name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Your full name" /></label>}
            {mode === 'register' && form.role === 'STUDENT' && <label>Student ID<input required value={form.studentId} onChange={(event) => setForm({ ...form, studentId: event.target.value })} placeholder="SA-0013" /></label>}
            <label>Email address<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@campus.edu" /></label>
            <label>Password<div className="password-field"><input required minLength={8} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="At least 8 characters" /></div></label>
            {error && <div className="auth-error">{error}</div>}
            <button className="auth-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}<span>→</span></button>
          </form>

          <p className="auth-switch">{mode === 'login' ? 'No account yet?' : 'Already registered?'} <button onClick={() => changeMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Register' : 'Sign in'}</button></p>
        </div>
      </section>
    </main>
  )
}
