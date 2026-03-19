import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { User, Loader2 } from 'lucide-react'
import { pop } from '../lib/celebrate'

export default function Profile() {
  const { user, profile, fetchProfile } = useAuth()
  const toast = useToast()
  const [name, setName] = useState(profile?.name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) {
      toast('Name is required', 'error')
      return
    }
    setLoading(true)
    const { error } = await supabase.from('profiles').update({
      name: name.trim(),
      phone: phone.trim(),
    }).eq('id', user.id)

    if (error) {
      toast(error.message, 'error')
    } else {
      toast('Profile updated')
      pop()
      fetchProfile(user.id)
    }
    setLoading(false)
  }

  return (
    <div>
      <h1 className="text-4xl mb-6">Profile</h1>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#c3cca6] flex items-center justify-center text-[#3a4025]">
            <User size={20} />
          </div>
          <div>
            <p className="font-medium text-sm">Your details</p>
            <p className="text-xs text-gray-400">{profile?.email}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Name</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Phone</label>
            <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Optional" />
          </div>
          <button type="submit" className="btn btn-primary w-full mt-2" disabled={loading}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Save'}
          </button>
        </form>
      </div>
    </div>
  )
}
