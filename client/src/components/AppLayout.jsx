import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import api, { errorMessage } from '../api'
import { useAuth } from '../context/AuthContext'
import Icon from './Icon'
import Orb from './Orb'

const NAV = [
  { to: '/today', label: 'Today', icon: 'today' },
  { to: '/tasks', label: 'My tasks', icon: 'tasks' },
  { to: '/assistant', label: 'Ask Molade', icon: 'mic' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]

// Reminds students who haven't confirmed their email yet (reminders only go to confirmed emails)
function VerifyBanner() {
  const [status, setStatus] = useState('')

  async function resend() {
    setStatus('Sending...')
    try {
      const { data } = await api.post('/auth/resend-verification')
      setStatus(`${data.message}.`)
    } catch (err) {
      setStatus(errorMessage(err))
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-soon/20 bg-soon/10 px-5 py-2.5 text-[13px] md:px-12">
      <span className="flex items-center gap-2 text-soon">
        <Icon name="mail" size={16} />
        Confirm your email to get deadline reminders. Check your inbox for the link.
      </span>
      <span className="flex items-center gap-3">
        {status && <span className="text-muted">{status}</span>}
        <button onClick={resend} className="font-semibold text-text hover:text-primary-light">Resend email</button>
      </span>
    </div>
  )
}

function navClass({ isActive }) {
  return `flex items-center gap-3 rounded-lg px-2.5 py-2 font-medium transition-colors ${
    isActive ? 'bg-raised text-text' : 'text-muted hover:bg-raised/60 hover:text-text'
  }`
}

// Every logged-in page: a sidebar on desktop, a compact top bar on phones
function AppLayout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  // Admins get one extra menu item (the server checks the role too, this only hides the link)
  const nav = user.role === 'ADMIN' ? [...NAV, { to: '/admin', label: 'Admin', icon: 'shield' }] : NAV

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="hidden w-62 shrink-0 flex-col gap-7 border-r border-border bg-sidebar px-4 py-6 md:flex">
        <div className="flex items-center gap-2.5 px-2">
          <Orb size={28} />
          <span className="text-lg font-bold tracking-tight">Molade</span>
        </div>

        <nav className="flex flex-col gap-0.5" aria-label="Main">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} className={navClass}>
              {({ isActive }) => (
                <>
                  <Icon name={item.icon} className={isActive ? 'text-primary' : ''} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex items-center gap-2.5 rounded-xl border border-border p-2.5">
          <Link to="/settings" className="flex min-w-0 flex-1 items-center gap-2.5" title="Settings">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-bubble font-semibold text-primary-light">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted">{user.email}</span>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            aria-label="Log out"
            title="Log out"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-raised hover:text-text"
          >
            <Icon name="logout" size={16} />
          </button>
        </div>
      </aside>

      <header className="flex items-center justify-between gap-3 border-b border-border bg-sidebar px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <Orb size={24} />
          <span className="font-bold tracking-tight">Molade</span>
        </div>
        <nav className="flex gap-1" aria-label="Main">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              aria-label={item.label}
              title={item.label}
              className={({ isActive }) =>
                `grid h-10 w-10 place-items-center rounded-lg ${isActive ? 'bg-raised text-primary' : 'text-muted'}`
              }
            >
              <Icon name={item.icon} />
            </NavLink>
          ))}
          <button onClick={handleLogout} aria-label="Log out" className="grid h-10 w-10 place-items-center rounded-lg text-muted">
            <Icon name="logout" />
          </button>
        </nav>
      </header>

      <div className="flex min-w-0 flex-1 flex-col">
        {!user.isVerified && location.pathname !== '/settings' && <VerifyBanner />}
        {children}
      </div>
    </div>
  )
}

export default AppLayout
