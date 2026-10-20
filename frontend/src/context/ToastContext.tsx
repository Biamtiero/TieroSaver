import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
}

export interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [confirmState, setConfirmState] = useState<{
    options: ConfirmOptions
    resolve: (value: boolean) => void
  } | null>(null)

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    setToasts((prev) => [...prev, { id, message, type }])

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ options, resolve })
    })
  }, [])

  const handleConfirmClose = (result: boolean) => {
    if (confirmState) {
      confirmState.resolve(result)
      setConfirmState(null)
    }
  }

  return (
    <ToastContext.Provider value={{ showToast, confirm }}>
      {children}

      {/* Floating Toasts Stack */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl shadow-xl border backdrop-blur-md transition-all duration-300 transform translate-y-0 opacity-100 ${
              toast.type === 'success'
                ? 'bg-white/95 dark:bg-slate-900/95 border-emerald-500/30 text-slate-800 dark:text-slate-100'
                : toast.type === 'error'
                ? 'bg-white/95 dark:bg-slate-900/95 border-rose-500/30 text-slate-800 dark:text-slate-100'
                : 'bg-white/95 dark:bg-slate-900/95 border-indigo-500/30 text-slate-800 dark:text-slate-100'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              )}
              {toast.type === 'error' && (
                <AlertCircle className="w-5 h-5 text-rose-500" />
              )}
              {toast.type === 'info' && (
                <Info className="w-5 h-5 text-indigo-500" />
              )}
            </div>

            <div className="flex-1 text-xs font-medium leading-relaxed">
              {toast.message}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-0.5 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {confirmState && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 transition-opacity">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3.5 mb-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmState.options.danger
                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60'
                    : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {confirmState.options.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {confirmState.options.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => handleConfirmClose(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                {confirmState.options.cancelText || 'Batal'}
              </button>
              <button
                onClick={() => handleConfirmClose(true)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-xs transition ${
                  confirmState.options.danger
                    ? 'bg-rose-600 hover:bg-rose-500'
                    : 'bg-indigo-600 hover:bg-indigo-500'
                }`}
              >
                {confirmState.options.confirmText || 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
