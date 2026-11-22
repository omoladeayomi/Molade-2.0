import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api, { errorMessage } from '../api'
import { AuthCard, ErrorBox, Field, SubmitButton } from '../components/AuthForm'

function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState(token ? '' : 'This link is missing its code. Open the link from your email again.')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) {
      setError('The two passwords don\'t match.')
      return
    }
    setError('')
    setBusy(true)
    try {
      await api.post('/auth/reset-password', { token, password })
      setDone(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <AuthCard title="Password changed" subtitle="You can now log in with your new password.">
        <Link to="/login" className="flex h-12 items-center justify-center rounded-xl bg-primary text-[15px] font-semibold text-white hover:bg-primary-hover">
          Log in
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Choose a new password" subtitle="Use at least 8 characters.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ErrorBox message={error} />
        <Field label="New password" id="password" type="password" autoComplete="new-password" required
          minLength={8} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} />
        <Field label="Type it again" id="confirm" type="password" autoComplete="new-password" required
          minLength={8} maxLength={72} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <SubmitButton busy={busy}>Change password</SubmitButton>
        <p className="text-center text-sm text-muted">
          Link expired? <Link to="/forgot-password" className="font-semibold text-primary-light hover:text-text">Get a new one</Link>
        </p>
      </form>
    </AuthCard>
  )
}

export default ResetPassword
