import axios from 'axios'

const TOKEN_KEY = 'molade_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

// All requests to our backend go through this, so the login token is added automatically
const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Molade's opening briefing. If one is already being fetched, share it instead of asking the AI
// twice (e.g. React running effects twice in development, or two pages opening at once).
let briefingInFlight = null
export function requestBriefing() {
  if (!briefingInFlight) {
    briefingInFlight = api.post('/assistant/briefing').finally(() => {
      briefingInFlight = null
    })
  }
  return briefingInFlight
}

// Turns any failed request into a message we can show the user
export function errorMessage(err) {
  return err.response?.data?.error || 'Could not reach the server. Is it running?'
}

export default api
