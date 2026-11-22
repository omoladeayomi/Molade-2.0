import { createContext, useContext, useEffect, useState } from 'react'
import api, { clearToken, getToken, setToken } from '../api'

const AuthContext = createContext(null)

// Keeps track of who is logged in, for every page in the app
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // Only need to wait for the server if there's a saved token to check
  const [loading, setLoading] = useState(() => Boolean(getToken()))

  // On page load, if we have a saved token, ask the server who it belongs to
  useEffect(() => {
    if (!getToken()) return
    api
      .get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => clearToken())
      .finally(() => setLoading(false))
  }, [])

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password })
    setToken(data.token)
    setUser(data.user)
  }

  async function register(name, email, password) {
    const { data } = await api.post('/auth/register', { name, email, password })
    setToken(data.token)
    setUser(data.user)
  }

  function logout() {
    clearToken()
    setUser(null)
  }

  // After the server changes the user (email confirmed, settings saved), keep the app in step.
  // Only applies when that same user is logged in on this browser.
  function updateUser(updated) {
    setUser((current) => (current && current.id === updated.id ? updated : current))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
