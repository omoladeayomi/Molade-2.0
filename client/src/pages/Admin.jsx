import { useEffect, useState } from 'react'
import api, { errorMessage } from '../api'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../components/AppLayout'
import Icon from '../components/Icon'

const INTENT_LABELS = {
  BRIEFING: 'Briefing',
  PRIORITISE: 'Prioritise',
  FOCUS_NOW: 'Focus now',
  PLAN: 'Plan',
  WORKLOAD: 'Workload',
  LOOKUP: 'Lookup',
  PROGRESS: 'Progress',
  BREAKDOWN: 'Breakdown',
  EXPLAIN: 'Explain',
  UNCLEAR: 'Unclear',
  OUT_OF_SCOPE: 'Out of scope',
}

const percent = (part, whole) => (whole ? Math.round((part / whole) * 100) : 0)

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Stat({ value, label, detail }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-5">
      <span className="font-mono text-[28px] font-medium leading-none">{value}</span>
      <span className="text-sm font-medium">{label}</span>
      {detail && <span className="text-xs text-muted">{detail}</span>}
    </div>
  )
}

// A horizontal bar list, e.g. how often each intent was used
function Bars({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[110px_1fr_40px] items-center gap-3 text-[13px]">
          <span className="truncate text-muted">{r.label}</span>
          <span className="h-2 overflow-hidden rounded-full bg-raised">
            <span className="block h-full rounded-full bg-primary" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <span className="text-right font-mono">{r.value}</span>
        </li>
      ))}
    </ul>
  )
}

function SignupChart({ days }) {
  const max = Math.max(1, ...days.map((d) => d.count))
  const total = days.reduce((sum, d) => sum + d.count, 0)
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-28 items-end gap-1" role="img" aria-label={`${total} sign-ups in the last 30 days`}>
        {days.map((d) => (
          <div key={d.date} className="flex h-full flex-1 items-end" title={`${d.date}: ${d.count}`}>
            <div className={`w-full rounded-t-sm ${d.count ? 'bg-primary' : 'bg-raised'}`} style={{ height: d.count ? `${(d.count / max) * 100}%` : '4%' }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between font-mono text-[11px] text-subtle">
        <span>{formatDate(days[0].date)}</span>
        <span>Today</span>
      </div>
    </div>
  )
}

function Admin() {
  const { user: me } = useAuth()
  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState([])
  const [error, setError] = useState('')
  const [confirmId, setConfirmId] = useState(null)

  useEffect(() => {
    Promise.all([api.get('/admin/overview'), api.get('/admin/users')])
      .then(([o, u]) => {
        setOverview(o.data)
        setUsers(u.data.users)
      })
      .catch((err) => setError(errorMessage(err)))
  }, [])

  async function deleteUser(id) {
    setError('')
    try {
      await api.delete(`/admin/users/${id}`)
      setUsers((prev) => prev.filter((u) => u.id !== id))
      setConfirmId(null)
      const { data } = await api.get('/admin/overview')
      setOverview(data)
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const a = overview?.assistant
  const intentRows = a
    ? Object.keys(INTENT_LABELS).map((k) => ({ label: INTENT_LABELS[k], value: a.intents[k] || 0 })).sort((x, y) => y.value - x.value)
    : []

  return (
    <AppLayout>
      <main className="mx-auto flex w-full max-w-[1192px] flex-col gap-7 px-5 py-8 md:px-12 md:py-9">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted">Admin</span>
            <h1 className="text-[32px] font-semibold tracking-[-0.025em]">Molade overview</h1>
          </div>
          <p className="flex max-w-md items-start gap-2 text-[13px] text-muted">
            <Icon name="shield" size={16} className="mt-0.5 shrink-0 text-primary" />
            Counts only. Students&apos; task titles, notes and conversations are never shown here (UK GDPR data minimisation).
          </p>
        </div>

        {error && <p role="alert" className="rounded-xl border border-overdue/30 bg-overdue/10 px-3.5 py-2.5 text-sm text-overdue">{error}</p>}

        {!overview ? (
          !error && <p className="text-muted">Loading statistics...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat value={overview.users.total} label="Accounts" detail={`${overview.users.verified} confirmed email (${percent(overview.users.verified, overview.users.total)}%)`} />
              <Stat value={overview.tasks.total} label="Tasks" detail={`${overview.tasks.completed} done · ${overview.tasks.overdue} overdue`} />
              <Stat value={a.questions} label="Questions to Molade" detail={`${a.conversations} conversations`} />
              <Stat value={`${percent(a.voice, a.questions)}%`} label="Asked by voice" detail={`${a.voice} spoken · ${a.typed} typed`} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6" aria-labelledby="intents-heading">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 id="intents-heading" className="text-base font-semibold">What students ask Molade</h2>
                  <span className="text-xs text-muted">{a.answers} answers</span>
                </div>
                <Bars rows={intentRows} />
                <p className="border-t border-border pt-3 text-[13px] text-muted">
                  <span className="font-mono text-text">{percent(a.answers - a.retried, a.answers)}%</span> of answers passed the Zod check first time
                  {a.retried > 0 && <> · {a.retried} needed the corrective retry</>}
                </p>
              </section>

              <div className="flex flex-col gap-4">
                <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6" aria-labelledby="signups-heading">
                  <h2 id="signups-heading" className="text-base font-semibold">Sign-ups, last 30 days</h2>
                  <SignupChart days={overview.signupsByDay} />
                </section>
                <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-6" aria-labelledby="tasks-heading">
                  <h2 id="tasks-heading" className="text-base font-semibold">Tasks and emails</h2>
                  <Bars rows={[
                    { label: 'Not started', value: overview.tasks.notStarted },
                    { label: 'In progress', value: overview.tasks.inProgress },
                    { label: 'Completed', value: overview.tasks.completed },
                  ]} />
                  <p className="border-t border-border pt-3 text-[13px] text-muted">
                    Email settings switched on: reminders {overview.emails.reminders}, morning briefing {overview.emails.briefings}, task added {overview.emails.taskAdded} (of {overview.emails.of} accounts)
                  </p>
                </section>
              </div>
            </div>

            <section className="flex flex-col gap-3" aria-labelledby="users-heading">
              <h2 id="users-heading" className="text-base font-semibold">Accounts <span className="font-mono text-sm font-normal text-muted">{users.length}</span></h2>
              <div className="overflow-x-auto rounded-2xl border border-border bg-[#0b0e13]">
                <table className="w-full min-w-[820px] text-left text-[13px]">
                  <thead className="border-b border-border text-xs uppercase tracking-wider text-subtle">
                    <tr>
                      <th className="px-5 py-3 font-medium">Name</th>
                      <th className="px-3 py-3 font-medium">Email</th>
                      <th className="px-3 py-3 font-medium">Joined</th>
                      <th className="px-3 py-3 font-medium">Last active</th>
                      <th className="px-3 py-3 text-right font-medium">Tasks</th>
                      <th className="px-3 py-3 text-right font-medium">Chats</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-[#151b24] last:border-b-0">
                        <td className="px-5 py-3.5">
                          <span className="font-medium">{u.name}</span>
                          {u.role === 'ADMIN' && <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] text-primary-light">Admin</span>}
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="text-muted">{u.email}</span>
                          {!u.isVerified && <span className="ml-2 rounded-full bg-soon/15 px-2 py-0.5 text-[11px] text-soon">Not confirmed</span>}
                        </td>
                        <td className="px-3 py-3.5 font-mono text-muted">{formatDate(u.createdAt)}</td>
                        <td className="px-3 py-3.5 font-mono text-muted">{formatDate(u.lastActiveAt)}</td>
                        <td className="px-3 py-3.5 text-right font-mono">{u.tasksDone}/{u.tasks}</td>
                        <td className="px-3 py-3.5 text-right font-mono">{u.conversations}</td>
                        <td className="px-5 py-3.5 text-right">
                          {u.id === me.id || u.role === 'ADMIN' ? null : confirmId === u.id ? (
                            <span className="inline-flex items-center gap-2">
                              <span>Delete account and all data?</span>
                              <button onClick={() => deleteUser(u.id)} className="h-8 rounded-lg bg-overdue/90 px-3 font-semibold text-background hover:bg-overdue">Delete</button>
                              <button onClick={() => setConfirmId(null)} className="h-8 rounded-lg border border-border px-3 font-medium">Keep</button>
                            </span>
                          ) : (
                            <button onClick={() => setConfirmId(u.id)} aria-label={`Delete ${u.name}'s account`} title="Delete account"
                              className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-raised hover:text-overdue">
                              <Icon name="trash" size={15} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </AppLayout>
  )
}

export default Admin
