import { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'

const ToastContext = createContext()

export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  const dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-80 z-[60] flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-[slideUp_0.3s_ease] ${
              t.type === 'success' ? 'bg-white border-emerald-200 text-emerald-700' :
              t.type === 'error' ? 'bg-white border-red-200 text-red-700' :
              'bg-white border-gray-200 text-gray-700'
            }`}>
            {t.type === 'success' && <CheckCircle size={18} className="text-emerald-500 shrink-0" />}
            {t.type === 'error' && <AlertCircle size={18} className="text-red-500 shrink-0" />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="shrink-0 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
