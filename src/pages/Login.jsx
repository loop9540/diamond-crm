import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Gem, Loader2, ArrowLeft } from 'lucide-react'

export default function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('login') // 'login' | 'reset'
  const [resetMsg, setResetMsg] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) setError(error.message)
    setLoading(false)
  }

  async function handleReset(e) {
    e.preventDefault()
    setError('')
    setResetMsg('')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname,
    })
    if (error) setError(error.message)
    else setResetMsg('Check your email for a password reset link')
    setLoading(false)
  }

  return (
    <div className="min-h-screen min-h-[100dvh] flex items-center justify-center p-4">
      <div className="card w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#c3cca6] text-black mb-3">
            <Gem size={28} />
          </div>
          <h1 className="text-xl m-0">My Diamonds Shop</h1>
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'login' ? 'Sign in to your account' : 'Reset your password'}
          </p>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
              <input type="email" className="input" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Password</label>
              <input type="password" className="input" value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Your password" required />
            </div>

            {error && <div className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

            <button type="submit" className="btn btn-primary w-full mt-1" disabled={loading}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Sign In'}
            </button>

            <button type="button" onClick={() => { setMode('reset'); setError('') }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors mt-1">
              Forgot password?
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
              <input type="email" className="input" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>

            {error && <div className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</div>}
            {resetMsg && <div className="text-sm text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">{resetMsg}</div>}

            <button type="submit" className="btn btn-primary w-full mt-1" disabled={loading}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Send Reset Link'}
            </button>

            <button type="button" onClick={() => { setMode('login'); setError(''); setResetMsg('') }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors mt-1 flex items-center justify-center gap-1">
              <ArrowLeft size={12} /> Back to sign in
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
