import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/profile', label: 'Profile' },
  { to: '/scores', label: 'Scores' },
  { to: '/charity', label: 'Charity' },
  { to: '/admin', label: 'Admin' },
]

function AppLayout() {
  const { user, logout } = useAuth()
  const adminEmail = (import.meta.env.VITE_ADMIN_EMAIL || 'admin@golf.com').toLowerCase()
  const isAdminUser = String(user?.email || '').toLowerCase() === adminEmail
  const navLinks = isAdminUser
    ? links.filter((link) => link.to === '/admin')
    : links.filter((link) => link.to !== '/admin')

  return (
    <div className="min-h-screen bg-slate-100 p-2 sm:p-4">
      <div className="mx-auto grid min-h-[calc(100vh-1rem)] w-full max-w-7xl gap-4 lg:grid-cols-[250px_1fr]">
        <aside className="panel flex flex-col p-4">
          <div className="mb-8 rounded-2xl bg-slate-950 px-4 py-4 text-white">
            <p className="font-display text-lg">CharityOS</p>
            <p className="text-sm text-slate-300">Subscription Control Center</p>
          </div>

          <nav className="flex flex-col gap-1.5">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    isActive ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="panel flex min-h-0 flex-col overflow-hidden">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">SaaS Dashboard</p>
              <p className="font-display text-lg text-slate-900">Welcome back</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-sm">
                <p className="font-semibold text-slate-800">{user?.email ?? 'Account'}</p>
                <p className="text-slate-500">{user?.isSubscribed ? 'Subscribed' : 'Not subscribed'}</p>
              </div>
              <button onClick={logout} className="btn btn-secondary">
                Logout
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}

export default AppLayout
