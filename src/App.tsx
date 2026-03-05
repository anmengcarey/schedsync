import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { Navbar } from '@/components/layout/Navbar'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { Landing } from '@/pages/Landing'
import { Auth } from '@/pages/Auth'
import { Onboarding } from '@/pages/Onboarding'
import { Dashboard } from '@/pages/Dashboard'
import { CreateRequest } from '@/pages/CreateRequest'
import { InviteLanding } from '@/pages/InviteLanding'
import { Results } from '@/pages/Results'
import { Confirm } from '@/pages/Confirm'
import { Success } from '@/pages/Success'
import { ManualAvailability } from '@/pages/ManualAvailability'
import { Settings } from '@/pages/Settings'

const HIDE_NAVBAR = ['/', '/auth']

function AppShell() {
  const location = useLocation()
  const showNav = !HIDE_NAVBAR.includes(location.pathname)

  return (
    <div className="min-h-screen bg-gray-50">
      {showNav && <Navbar />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/create" element={<ProtectedRoute><CreateRequest /></ProtectedRoute>} />
        <Route path="/invite/:shareToken" element={<InviteLanding />} />
        <Route path="/invite/:shareToken/manual" element={<ManualAvailability />} />
        <Route path="/request/:requestId/results" element={<ProtectedRoute><Results /></ProtectedRoute>} />
        <Route path="/request/:requestId/confirm" element={<ProtectedRoute><Confirm /></ProtectedRoute>} />
        <Route path="/request/:requestId/success" element={<ProtectedRoute><Success /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  )
}
