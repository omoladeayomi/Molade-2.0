import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ProtectedRoute from './ProtectedRoute'

// Logged-in admins only; everyone else goes to Today. (The server enforces this as well.)
function AdminRoute({ children }) {
  const { user } = useAuth()
  return (
    <ProtectedRoute>
      {user?.role === 'ADMIN' ? children : <Navigate to="/today" replace />}
    </ProtectedRoute>
  )
}

export default AdminRoute
