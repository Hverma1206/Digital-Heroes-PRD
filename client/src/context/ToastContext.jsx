import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const addToast = useCallback((message, type = 'info', timeout = 2600) => {
    const id = Date.now() + Math.random()

    setToasts((current) => [...current, { id, message, type }])

    window.setTimeout(() => {
      removeToast(id)
    }, timeout)
  }, [removeToast])

  const value = useMemo(
    () => ({
      addToast,
      removeToast,
    }),
    [addToast, removeToast],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-80 max-w-[90vw] flex-col gap-3">
        {toasts.map((toast) => {
          const tone =
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : toast.type === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-900'
                : 'border-cyan-200 bg-cyan-50 text-cyan-900'

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto animate-[fadein_300ms_ease-out] rounded-xl border px-4 py-3 text-sm shadow-sm ${tone}`}
            >
              {toast.message}
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }

  return context
}
