import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { getCurrentUser, login as loginRequest, signup as signupRequest } from '../services/authService'

const AuthContext = createContext(null)

const extractToken = (payload) =>
  payload?.token ?? payload?.accessToken ?? payload?.data?.token ?? payload?.data?.accessToken ?? null

const extractUser = (payload) => payload?.user ?? payload?.data?.user ?? null

const normalizeUser = (rawUser) => {
  if (!rawUser) {
    return null
  }

  return {
    ...rawUser,
    isSubscribed: rawUser?.isSubscribed ?? rawUser?.is_subscribed ?? false,
    charityId: rawUser?.charityId ?? rawUser?.charity_id ?? null,
    charityPercent: Number(rawUser?.charityPercent ?? rawUser?.charity_percent ?? 10),
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)

  const saveToken = useCallback((nextToken) => {
    if (nextToken) {
      localStorage.setItem('token', nextToken)
      setToken(nextToken)
      return
    }

    localStorage.removeItem('token')
    setToken(null)
  }, [])

  const refreshUser = useCallback(async () => {
    if (!token) {
      setUser(null)
      return null
    }

    const profile = await getCurrentUser()
    const nextUser = normalizeUser(extractUser(profile) ?? profile)
    setUser(nextUser)
    return nextUser
  }, [token])

  const logout = useCallback(() => {
    saveToken(null)
    setUser(null)
  }, [saveToken])

  const login = useCallback(
    async (credentials) => {
      const payload = await loginRequest(credentials)
      const nextToken = extractToken(payload)

      if (!nextToken) {
        throw new Error('Login succeeded but token was not returned.')
      }

      saveToken(nextToken)

      const embeddedUser = extractUser(payload)
      if (embeddedUser) {
        const nextUser = normalizeUser(embeddedUser)
        setUser(nextUser)
        return nextUser
      }

      return refreshUser()
    },
    [refreshUser, saveToken],
  )

  const signup = useCallback(
    async (credentials) => {
      const payload = await signupRequest(credentials)
      const nextToken = extractToken(payload)

      if (nextToken) {
        saveToken(nextToken)

        const embeddedUser = extractUser(payload)
        if (embeddedUser) {
          const nextUser = normalizeUser(embeddedUser)
          setUser(nextUser)
          return nextUser
        }

        return refreshUser()
      }

      return payload
    },
    [refreshUser, saveToken],
  )

  useEffect(() => {
    const bootstrap = async () => {
      if (!token) {
        setIsAuthLoading(false)
        return
      }

      try {
        await refreshUser()
      } catch {
        logout()
      } finally {
        setIsAuthLoading(false)
      }
    }

    bootstrap()
  }, [logout, refreshUser, token])

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      isAuthLoading,
      login,
      signup,
      logout,
      refreshUser,
      setUser,
    }),
    [token, user, isAuthLoading, login, signup, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
