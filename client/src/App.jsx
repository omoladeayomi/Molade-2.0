import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import Today from './pages/Today'
import Tasks from './pages/Tasks'
import Assistant from './pages/Assistant'
import Settings from './pages/Settings'
import Admin from './pages/Admin'
import AdminRoute from './components/AdminRoute'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<ProtectedRoute guestOnly><Login /></ProtectedRoute>} />
      <Route path="/register" element={<ProtectedRoute guestOnly><Register /></ProtectedRoute>} />
      <Route path="/forgot-password" element={<ProtectedRoute guestOnly><ForgotPassword /></ProtectedRoute>} />
      {/* Opened from email links, so they work whether or not someone is logged in */}
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/today" element={<ProtectedRoute><Today /></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
      <Route path="/assistant" element={<ProtectedRoute><Assistant /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
      <Route path="*" element={<Navigate to="/today" replace />} />
    </Routes>
  )
}

export default App
