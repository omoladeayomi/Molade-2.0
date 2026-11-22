import { useState } from 'react'
import api, { errorMessage } from '../api'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../components/AppLayout'
import Icon from '../components/Icon'

const EMAIL_SETTINGS = [
  ['emailReminders', 'Deadline reminders', 'A morning email listing tasks due today, tomorrow or the day after.'],
  ['emailMorningBriefing', "Molade's morning briefing", 'Molade tells you what to focus on today, in the same morning email.'],
  ['emailTaskAdded', 'Task added confirmations', 'An email each time you add a task, with its deadline.'],
]

function Toggle({ id, checked, onChange, label }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6.5 w-11 shrink-0 rounded-full transition ${checked ? 'bg-primary' : 'bg-border-strong'}`}
    >
      <span className={`absolute top-0.75 h-5 w-5 rounded-full bg-white transition-all ${checked ? 'left-5.25' : 'left-0.75'}`} />
    </button>
  )
}

function Settings() {
  const { user, updateUser } = useAuth()
  const [saving, setSaving] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function changeSetting(key, value) {
    setError('')
    setSaving(key)
    try {
      const { data } = await api.patch('/auth/settings', { [key]: value })
      updateUser(data.user)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving('')
    }
  }

  async function resend() {
    setError('')
    setMessage('')
    setSending(true)
    try {
      const { data } = await api.post('/auth/resend-verification')
      setMessage(`${data.message}. Can't see it? Check your spam folder.`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <AppLayout>
      <main className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-5 py-8 md:px-12 md:py-9">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted">Your account</span>
          <h1 className="text-[32px] font-semibold tracking-[-0.025em]">Settings</h1>
        </div>

        {error && <p role="alert" className="rounded-xl border border-overdue/30 bg-overdue/10 px-3.5 py-2.5 text-sm text-overdue">{error}</p>}

        <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6" aria-labelledby="account-heading">
          <h2 id="account-heading" className="text-base font-semibold">Account</h2>
          <div className="flex flex-col gap-1">
            <span className="text-[13px] text-muted">Name</span>
            <span className="font-medium">{user.name}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[13px] text-muted">Email</span>
              <span className="flex flex-wrap items-center gap-2 font-medium">
                {user.email}
                {user.isVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-done/15 px-2 py-0.5 text-xs text-done">
                    <Icon name="check" size={12} strokeWidth={2.5} /> Confirmed
                  </span>
                ) : (
                  <span className="rounded-full bg-soon/15 px-2 py-0.5 text-xs text-soon">Not confirmed</span>
                )}
              </span>
            </div>
            {!user.isVerified && (
              <button onClick={resend} disabled={sending}
                className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-border-strong px-4 font-medium hover:border-primary-light disabled:opacity-60">
                <Icon name="mail" size={16} className="text-primary" />
                {sending ? 'Sending...' : 'Send confirmation email'}
              </button>
            )}
          </div>
          {message && <p className="text-sm text-muted">{message}</p>}
        </section>

        <section className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-6" aria-labelledby="email-heading">
          <h2 id="email-heading" className="text-base font-semibold">Emails</h2>
          <p className="mb-3 text-sm text-muted">
            {user.isVerified
              ? 'Choose which emails Molade sends you. The morning email arrives at 8am.'
              : 'Confirm your email above to start getting these.'}
          </p>
          {EMAIL_SETTINGS.map(([key, title, description]) => (
            <div key={key} className="flex items-center justify-between gap-6 border-t border-border py-4">
              <div className="flex min-w-0 flex-col gap-0.5">
                <label htmlFor={`setting-${key}`} className="font-medium">{title}</label>
                <span className="text-[13px] text-muted">{description}</span>
              </div>
              <Toggle
                id={`setting-${key}`}
                label={title}
                checked={user[key]}
                onChange={(value) => changeSetting(key, value)}
              />
              {saving === key && <span className="sr-only">Saving</span>}
            </div>
          ))}
        </section>
      </main>
    </AppLayout>
  )
}

export default Settings
