import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api, { errorMessage } from '../api'
import { useAuth } from '../context/AuthContext'
import { AuthCard } from '../components/AuthForm'
import Orb from '../components/Orb'

// Opened from the "Confirm my email" button. Works whether or not the student is logged in.
function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const { user, updateUser } = useAuth()
  const [state, setState] = useState(token ? 'checking' : 'failed')
  const [error, setError] = useState(token ? '' : 'This link is missing its code. Open the link from your email again.')
  const startedRef = useRef(false)

  useEffect(() => {
    if (!token || startedRef.current) return // the link only works once, so only try it once
    startedRef.current = true
    api
      .post('/auth/verify-email', { token })
      .then(({ data }) => {
        updateUser(data.user)
        setState('done')
      })
      .catch((err) => {
        setError(errorMessage(err))
        setState('failed')
      })
  }, [token, updateUser])

  const next = user ? (
    <Link to="/today" className="flex h-12 items-center justify-center rounded-xl bg-primary text-[15px] font-semibold text-white hover:bg-primary-hover">Go to Today</Link>
  ) : (
    <Link to="/login" className="flex h-12 items-center justify-center rounded-xl bg-primary text-[15px] font-semibold text-white hover:bg-primary-hover">Log in</Link>
  )

  if (state === 'checking') {
    return (
      <AuthCard title="Confirming your email..." subtitle="This only takes a moment.">
        <Orb size={48} rings={2} active className="self-center" />
      </AuthCard>
    )
  }

  if (state === 'done') {
    return (
      <AuthCard title="Email confirmed" subtitle="You'll now get deadline reminders and Molade's morning briefing.">
        {next}
      </AuthCard>
    )
  }

  return (
    <AuthCard title="That link didn't work" subtitle={error}>
      {user ? (
        <Link to="/settings" className="flex h-12 items-center justify-center rounded-xl bg-primary text-[15px] font-semibold text-white hover:bg-primary-hover">Send a new link</Link>
      ) : (
        next
      )}
    </AuthCard>
  )
}

export default VerifyEmail
