import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { Plus, Pencil, Trash2, UserPlus } from 'lucide-react'

const emptyForm = { name: '', email: '', phone: '' }

export default function Freelancers() {
  const [freelancers, setFreelancers] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [inviteModal, setInviteModal] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', password: '', name: '' })
  const [inviteMsg, setInviteMsg] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'freelancer').order('name')
    setFreelancers(data || [])
  }

  function openEdit(f) {
    setForm({ name: f.name, email: f.email || '', phone: f.phone || '' })
    setEditId(f.id)
    setModal('edit')
  }

  async function saveEdit() {
    await supabase.from('profiles').update({
      name: form.name, phone: form.phone
    }).eq('id', editId)
    setModal(null)
    load()
  }

  async function remove(id) {
    if (!confirm('Remove this freelancer?')) return
    await supabase.from('profiles').delete().eq('id', id)
    load()
  }

  async function invite() {
    setInviteMsg('')
    const { data, error } = await supabase.auth.signUp({
      email: inviteForm.email,
      password: inviteForm.password,
    })
    if (error) {
      setInviteMsg(error.message)
      return
    }
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: inviteForm.email,
        name: inviteForm.name,
        role: 'freelancer',
      })
    }
    setInviteMsg('Freelancer account created!')
    setInviteForm({ email: '', password: '', name: '' })
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Freelancers</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setInviteModal(true)}>
          <UserPlus size={16} /> Invite
        </button>
      </div>

      {/* Mobile */}
      <div className="flex flex-col gap-3 sm:hidden">
        {freelancers.map(f => (
          <div key={f.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-sm">{f.name}</p>
                <p className="text-xs text-gray-500">{f.email}</p>
                {f.phone && <p className="text-xs text-gray-500">{f.phone}</p>}
              </div>
              <div className="flex gap-1">
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(f)}>
                  <Pencil size={14} />
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(f.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop */}
      <div className="hidden sm:block card p-0 overflow-hidden">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {freelancers.map(f => (
              <tr key={f.id}>
                <td className="font-medium">{f.name}</td>
                <td>{f.email}</td>
                <td>{f.phone || '—'}</td>
                <td>
                  <div className="flex gap-1">
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(f)}>
                      <Pencil size={14} />
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(f.id)}>
                      <Trash2 size={14} />
                    </button>
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
              <label className="text-xs font-medium text-gray-500 mb-1 block">Phone</label>
              <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <button className="btn btn-primary w-full mt-2" onClick={saveEdit}>Save</button>
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
