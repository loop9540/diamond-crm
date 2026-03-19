import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Freelancers from './pages/Freelancers'
import Clients from './pages/Clients'
import Consignments from './pages/Consignments'
import Sales from './pages/Sales'
import Reports from './pages/Reports'
import MyStock from './pages/MyStock'
import MySales from './pages/MySales'
import { ToastProvider } from './components/Toast'
import { Loader2 } from 'lucide-react'

function AppRoutes() {
  const { user, profile, loading, isAdmin } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-white" />
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <Routes>
      <Route element={<Layout />}>
        {isAdmin ? (
          <>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/freelancers" element={<Freelancers />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/consignments" element={<Consignments />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/reports" element={<Reports />} />
          </>
        ) : (
          <>
            <Route path="/" element={<MyStock />} />
            <Route path="/my-sales" element={<MySales />} />
          </>
        )}
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </HashRouter>
  )
}
