import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Package, Users, Building2, ArrowLeftRight,
  ShoppingCart, BarChart3, LogOut, Diamond, Menu, X
} from 'lucide-react'
import { useState } from 'react'

const adminNav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/freelancers', icon: Users, label: 'Freelancers' },
  { to: '/clients', icon: Building2, label: 'Clients' },
  { to: '/consignments', icon: ArrowLeftRight, label: 'Consignments' },
  { to: '/sales', icon: ShoppingCart, label: 'Sales' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
]

const freelancerNav = [
  { to: '/', icon: Package, label: 'My Stock' },
  { to: '/my-sales', icon: ShoppingCart, label: 'My Sales' },
]

export default function Layout() {
  const { profile, signOut, isAdmin } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const nav = isAdmin ? adminNav : freelancerNav

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col">
      {/* Top bar */}
      <header className="glass sticky top-0 z-40 px-4 py-3 flex items-center justify-between safe-top">
        <div className="flex items-center gap-3">
          <button className="sm:hidden p-1" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div className="flex items-center gap-2">
            <Diamond size={22} className="text-indigo-600" />
            <span className="font-semibold text-sm hidden sm:inline">Diamond CRM</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 hidden sm:inline">{profile?.name}</span>
          <span className="badge badge-info text-[0.65rem]">{isAdmin ? 'Admin' : 'Freelancer'}</span>
          <button onClick={signOut} className="p-1.5 rounded-lg hover:bg-white/50 transition-colors" title="Sign out">
            <LogOut size={18} className="text-gray-500" />
          </button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar - desktop */}
        <nav className="hidden sm:flex flex-col w-56 p-3 gap-1 glass border-t-0 rounded-none">
          {nav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/25'
                    : 'text-gray-600 hover:bg-white/60'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Mobile nav overlay */}
        {menuOpen && (
          <div className="fixed inset-0 z-30 sm:hidden" onClick={() => setMenuOpen(false)}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <nav className="absolute top-[53px] left-0 right-0 glass p-3 flex flex-col gap-1 border-t-0 rounded-b-2xl shadow-xl"
              onClick={e => e.stopPropagation()}>
              {nav.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-indigo-500 text-white shadow-md'
                        : 'text-gray-600 hover:bg-white/60'
                    }`
                  }
                >
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
