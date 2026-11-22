import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Wrap a page in this to make it logged-in only.
// With guestOnly, it does the opposite (e.g. logged-in users skip the login page).
function ProtectedRoute({ children, guestOnly = false }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <p className="p-8 text-center text-muted">Loading...</p>
  }
  if (guestOnly && user) return <Navigate to="/today" replace />
  if (!guestOnly && !user) return <Navigate to="/login" replace />

  return children
}

export default ProtectedRoute
