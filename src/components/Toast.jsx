import { createContext, useContext, useState, useCallback } from 'react'
import { X } from 'lucide-react'

const ToastContext = createContext()

export const useToast = () => useContext(ToastContext)

const EMOJIS = {
  success: ['🎉', '✨', '💎', '🙌', '🔥', '⚡', '💫', '🌟'],
  error: ['😅', '🙈', '💀'],
}

function randomEmoji(type) {
  const list = EMOJIS[type] || EMOJIS.success
  return list[Math.floor(Math.random() * list.length)]
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'success') => {
    const id = Date.now()
    const emoji = randomEmoji(type)
    setToasts(prev => [...prev, { id, message, type, emoji }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  const dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-80 z-[60] flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-bounce-in ${
              t.type === 'success' ? 'bg-white border-emerald-200 text-emerald-700' :
              t.type === 'error' ? 'bg-white border-red-200 text-red-700' :
              'bg-white border-gray-200 text-gray-700'
            }`}>
            <span className="text-lg animate-wiggle">{t.emoji}</span>
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
