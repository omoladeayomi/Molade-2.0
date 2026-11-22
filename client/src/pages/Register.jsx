import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../api'
import { AuthCard, ErrorBox, Field, SubmitButton } from '../components/AuthForm'

function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await register(name, email, password)
      navigate('/today')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard title="Create your account" subtitle="Your AI study planner. Free to start.">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <ErrorBox message={error} />
        <Field label="Name" id="name" autoComplete="name" required
          value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="Email" id="email" type="email" autoComplete="email" required
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Password (at least 8 characters)" id="password" type="password" autoComplete="new-password"
          required minLength={8} maxLength={72}
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <SubmitButton busy={busy}>Create account</SubmitButton>
        <p className="text-center text-sm text-muted">
          Already have an account? <Link to="/login" className="font-semibold text-primary-light hover:text-text">Log in</Link>
        </p>
      </form>
    </AuthCard>
  )
}

export default Register
