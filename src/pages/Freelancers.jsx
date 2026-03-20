import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { Plus, Pencil, Trash2, UserPlus, KeyRound, Eye } from 'lucide-react'
import Loader from '../components/Loader'
import { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { sparkle } from '../lib/celebrate'
import { freelancerColor } from '../lib/colors'

const emptyForm = { name: '', email: '', phone: '' }

export default function Freelancers() {
  const toast = useToast()
  const { impersonate } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [freelancers, setFreelancers] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [inviteModal, setInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', password: '', name: '' })
  const [inviteMsg, setInviteMsg] = useState('')
  const [passwordModal, setPasswordModal] = useState(null)
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'freelancer').order('name')
    setFreelancers(data || [])
    setLoading(false)
  }

  function openEdit(f) {
    setForm({ name: f.name, email: f.email || '', phone: f.phone || '' })
    setEditId(f.id)
    setModal('edit')
  }

  async function saveEdit() {
    await supabase.from('profiles').update({
      name: form.name, email: form.email, phone: form.phone
    }).eq('id', editId)

    // Sync email and name to auth user
    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/admin/users/${editId}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({
          email: form.email,
          email_confirm: true,
          user_metadata: { name: form.name, role: 'freelancer' },
        }),
      }
    )

    setModal(null)
    toast('Freelancer updated')
    load()
  }

  async function remove(id) {
    if (!confirm('Remove this freelancer?')) return
    await supabase.from('profiles').delete().eq('id', id)
    load()
  }

  async function invite() {
    setInviteMsg('')
    // Use admin invite endpoint via Edge Function or direct admin API
    // This creates the user without switching the admin's session
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/admin/users`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({
          email: inviteForm.email,
          password: inviteForm.password,
          email_confirm: true,
          user_metadata: { name: inviteForm.name, role: 'freelancer' },
        }),
      }
    )
    const result = await res.json()
    if (!res.ok) {
      setInviteMsg(result.msg || result.message || 'Failed to create account')
      return
    }
    setInviteMsg('Freelancer account created!')
    sparkle()
    setInviteForm({ email: '', password: '', name: '' })
    load()
  }

  async function setPassword() {
    if (!passwordModal || newPassword.length < 6) {
      toast('Password must be at least 6 characters', 'error')
      return
    }
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/admin/users/${passwordModal.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({ password: newPassword, email_confirm: true }),
      }
    )
    if (!res.ok) {
      toast('Failed to update password', 'error')
      return
    }
    setPasswordModal(null)
    setNewPassword('')
    toast('Password updated')
  }

  if (loading) return <div className="mt-4"><Loader rows={3} /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-4xl">Freelancers</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setInviteModal(true)}>
          <UserPlus size={16} /> Invite
        </button>
      </div>

      {/* Mobile */}
      <div className="flex flex-col gap-3 sm:hidden">
        {freelancers.map(f => (
          <div key={f.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: `linear-gradient(135deg, ${freelancerColor(f.name).from}, ${freelancerColor(f.name).to})` }}>
                  {f.name?.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-sm">{f.name}</p>
                  <p className="text-xs text-gray-400">{f.email}</p>
                  {f.phone && <p className="text-xs text-gray-400">{f.phone}</p>}
                </div>
              </div>
              <div className="flex gap-1">
                <button className="p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" onClick={() => { impersonate(f); navigate('/') }} title="View as freelancer"><Eye size={16} /></button>
                <button className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" onClick={() => { setPasswordModal(f); setNewPassword('') }} title="Set password"><KeyRound size={16} /></button>
                <button className="p-2 rounded-lg text-gray-400 hover:text-[#5a6340] hover:bg-[#c3cca6]/20 transition-colors" onClick={() => openEdit(f)}><Pencil size={16} /></button>
                <button className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" onClick={() => remove(f.id)}><Trash2 size={16} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop */}
      <div className="hidden sm:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80">
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Name</th>
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Email</th>
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Phone</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {freelancers.map(f => (
              <tr key={f.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[0.65rem] font-bold"
                      style={{ background: `linear-gradient(135deg, ${freelancerColor(f.name).from}, ${freelancerColor(f.name).to})` }}>
                      {f.name?.charAt(0)}
                    </div>
                    <span className="font-semibold text-gray-900 text-sm">{f.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{f.email}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{f.phone || '—'}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-1 justify-end">
                    <button className="p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors" onClick={() => { impersonate(f); navigate('/') }} title="View as freelancer"><Eye size={16} /></button>
                    <button className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" onClick={() => { setPasswordModal(f); setNewPassword('') }} title="Set password"><KeyRound size={16} /></button>
                    <button className="p-2 rounded-lg text-gray-400 hover:text-[#5a6340] hover:bg-[#c3cca6]/20 transition-colors" onClick={() => openEdit(f)}><Pencil size={16} /></button>
                    <button className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" onClick={() => remove(f.id)}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {modal === 'edit' && (
        <Modal title="Edit Freelancer" onClose={() => setModal(null)}>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Name</label>
              <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
              <input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Phone</label>
              <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <button className="btn btn-primary w-full mt-2" onClick={saveEdit}>Save</button>
          </div>
        </Modal>
      )}

      {/* Password Modal */}
      {passwordModal && (
        <Modal title={`Set Password — ${passwordModal.name}`} onClose={() => setPasswordModal(null)}>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">New Password</label>
              <input type="text" className="input" value={newPassword} placeholder="Min 6 characters"
                onChange={e => setNewPassword(e.target.value)} />
            </div>
            <button className="btn btn-primary w-full mt-2" onClick={setPassword}>Update Password</button>
          </div>
        </Modal>
      )}

      {/* Invite Modal */}
      {inviteModal && (
        <Modal title="Invite Freelancer" onClose={() => { setInviteModal(false); setInviteMsg('') }}>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Name</label>
              <input className="input" value={inviteForm.name}
                onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
              <input type="email" className="input" value={inviteForm.email}
                onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Password</label>
              <input type="password" className="input" value={inviteForm.password}
                onChange={e => setInviteForm({ ...inviteForm, password: e.target.value })} />
            </div>
            {inviteMsg && (
              <div className={`text-sm rounded-lg px-3 py-2 ${inviteMsg.includes('created') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                {inviteMsg}
              </div>
            )}
            <button className="btn btn-primary w-full mt-2" onClick={invite}>Create Account</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
