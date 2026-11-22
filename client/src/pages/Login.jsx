import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../api'
import { AuthCard, ErrorBox, Field, SubmitButton } from '../components/AuthForm'

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(email, password)
      navigate('/today')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard title="Welcome back" subtitle="Log in to see today's plan.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ErrorBox message={error} />
        <Field label="Email" id="email" type="email" autoComplete="email" required
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <div className="flex flex-col gap-1.5">
          <Field label="Password" id="password" type="password" autoComplete="current-password" required
            value={password} onChange={(e) => setPassword(e.target.value)} />
          <Link to="/forgot-password" className="self-end text-[13px] font-medium text-primary-light hover:text-text">Forgot password?</Link>
        </div>
        <SubmitButton busy={busy}>Log in</SubmitButton>
        <p className="text-center text-sm text-muted">
          New to Molade? <Link to="/register" className="font-semibold text-primary-light hover:text-text">Create an account</Link>
        </p>
      </form>
    </AuthCard>
  )
}

export default Login
