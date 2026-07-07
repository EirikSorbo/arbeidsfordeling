import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const navItems = [
  { to: '/', label: 'Hjem', end: true },
  { to: '/historikk', label: 'Historikk' },
  { to: '/kategorier', label: 'Kategorier' },
  { to: '/rapporter', label: 'Rapporter' },
  { to: '/innstillinger', label: 'Innstillinger' },
]

export function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="app">
      <header className="app-header">
        <span className="brand">Arbeidsfordeling</span>
        <div className="header-user">
          {user?.photoURL && (
            <img
              className="avatar"
              src={user.photoURL}
              alt=""
              referrerPolicy="no-referrer"
            />
          )}
          <button className="btn btn-ghost btn-small" onClick={logout}>
            Logg ut
          </button>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <nav className="app-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              isActive ? 'nav-item nav-item-active' : 'nav-item'
            }
          >
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
