import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { Lock, Loader2 } from 'lucide-react'
import { sparkle } from '../lib/celebrate'

export default function ChangePassword() {
  const toast = useToast()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 6) {
      toast('Password must be at least 6 characters', 'error')
      return
    }
    if (password !== confirm) {
      toast('Passwords do not match', 'error')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Password changed successfully')
      sparkle()
      setPassword('')
      setConfirm('')
    }
    setLoading(false)
  }

  return (
    <div>
      <h1 className="text-4xl mb-6">Change Password</h1>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#c3cca6] flex items-center justify-center text-[#3a4025]">
            <Lock size={20} />
          </div>
          <div>
            <p className="font-medium text-sm">Update your password</p>
            <p className="text-xs text-gray-400">Minimum 6 characters</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">New Password</label>
            <input type="password" className="input" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="Enter new password" required />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Confirm Password</label>
            <input type="password" className="input" value={confirm}
              onChange={e => setConfirm(e.target.value)} placeholder="Confirm new password" required />
          </div>
          <button type="submit" className="btn btn-primary w-full mt-2" disabled={loading}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  )
}
