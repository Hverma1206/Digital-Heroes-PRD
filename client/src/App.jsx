import { Navigate, Route, Routes } from 'react-router-dom'
import AdminRoute from './components/AdminRoute'
import AppLayout from './components/AppLayout'
import PrivateRoute from './components/PrivateRoute'
import PublicRoute from './components/PublicRoute'
import { useAuth } from './context/AuthContext'
import AdminPage from './pages/AdminPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminSignupPage from './pages/AdminSignupPage'
import CharityPage from './pages/CharityPage'
import DashboardPage from './pages/DashboardPage'
import LoginPage from './pages/LoginPage'
import PricingPage from './pages/PricingPage'
import ProfilePage from './pages/ProfilePage'
import PublicCharityProfilePage from './pages/PublicCharityProfilePage'
import PublicHomePage from './pages/PublicHomePage'
import ScoresPage from './pages/ScoresPage'
import SignupPage from './pages/SignupPage'

function App() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/" element={<PublicHomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/discover/charities/:charityId" element={<PublicCharityProfilePage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/signup" element={<AdminSignupPage />} />

      <Route element={<PrivateRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/scores" element={<ScoresPage />} />
          <Route path="/charity" element={<CharityPage />} />
        </Route>
      </Route>

      <Route element={<AdminRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/'} replace />} />
    </Routes>
  )
}

export default App
