import { useState } from 'react'
import { Link } from 'react-router-dom'
import api, { errorMessage } from '../api'
import { AuthCard, ErrorBox, Field, SubmitButton } from '../components/AuthForm'
import Icon from '../components/Icon'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sentMessage, setSentMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { data } = await api.post('/auth/forgot-password', { email })
      setSentMessage(data.message)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (sentMessage) {
    return (
      <AuthCard title="Check your email" subtitle={sentMessage}>
        <div className="flex items-start gap-3 rounded-2xl border border-border-blue bg-card p-4 text-sm text-muted">
          <Icon name="mail" className="mt-0.5 shrink-0 text-primary" />
          <p>The link works for 1 hour. Can&apos;t see it? Check your spam folder.</p>
        </div>
        <Link to="/login" className="text-center text-sm font-semibold text-primary-light hover:text-text">Back to log in</Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Forgot your password?" subtitle="Enter your email and we'll send you a link to choose a new one.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ErrorBox message={error} />
        <Field label="Email" id="email" type="email" autoComplete="email" required
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <SubmitButton busy={busy}>Send reset link</SubmitButton>
        <p className="text-center text-sm text-muted">
          Remembered it? <Link to="/login" className="font-semibold text-primary-light hover:text-text">Log in</Link>
        </p>
      </form>
    </AuthCard>
  )
}

export default ForgotPassword
