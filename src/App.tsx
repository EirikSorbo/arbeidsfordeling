import { HashRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { HistoryPage } from './pages/HistoryPage'
import { CategoriesPage } from './pages/CategoriesPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'

// HashRouter fordi GitHub Pages ikke kan rewrite vilkårlige stier
// til index.html — hash-ruting fungerer uten server-konfigurasjon.
export function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="historikk" element={<HistoryPage />} />
              <Route path="kategorier" element={<CategoriesPage />} />
              <Route path="rapporter" element={<ReportsPage />} />
              <Route path="innstillinger" element={<SettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </HashRouter>
  )
}
