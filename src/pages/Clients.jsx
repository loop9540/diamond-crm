import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const emptyForm = { name: '', type: 'store', contact_info: '' }

export default function Clients() {
  const [clients, setClients] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('clients').select('*').order('name')
    setClients(data || [])
  }

  function openAdd() { setForm(emptyForm); setModal('add') }
  function openEdit(c) { setForm(c); setEditId(c.id); setModal('edit') }

  async function save() {
    if (modal === 'add') {
      await supabase.from('clients').insert(form)
    } else {
      const { id, created_at, ...rest } = form
      await supabase.from('clients').update(rest).eq('id', editId)
    }
    setModal(null)
    load()
  }

  async function remove(id) {
    if (!confirm('Delete this client?')) return
    await supabase.from('clients').delete().eq('id', id)
    load()
  }

  const typeBadge = (type) => {
    const map = { store: 'badge-info', freelancer: 'badge-warning' }
    return map[type] || 'badge-info'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Clients</h1>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <Plus size={16} /> Add Client
        </button>
      </div>

      {/* Mobile */}
      <div className="flex flex-col gap-3 sm:hidden">
        {clients.map(c => (
          <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
                  c.type === 'store' ? 'bg-gradient-to-br from-blue-400 to-blue-600' : 'bg-gradient-to-br from-amber-400 to-amber-600'
                }`}>{c.name?.charAt(0)}</div>
                <div>
                  <p className="font-semibold text-sm">{c.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`badge ${typeBadge(c.type)}`}>{c.type}</span>
                    {c.contact_info && <span className="text-xs text-gray-400">{c.contact_info}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <button className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" onClick={() => openEdit(c)}><Pencil size={16} /></button>
                <button className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" onClick={() => remove(c.id)}><Trash2 size={16} /></button>
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
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Type</th>
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Contact</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {clients.map(c => (
              <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-[0.65rem] font-bold ${
                      c.type === 'store' ? 'bg-gradient-to-br from-blue-400 to-blue-600' : 'bg-gradient-to-br from-amber-400 to-amber-600'
                    }`}>{c.name?.charAt(0)}</div>
                    <span className="font-semibold text-gray-900 text-sm">{c.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4"><span className={`badge ${typeBadge(c.type)}`}>{c.type}</span></td>
                <td className="px-6 py-4 text-sm text-gray-600">{c.contact_info || '—'}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-1 justify-end">
                    <button className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" onClick={() => openEdit(c)}><Pencil size={16} /></button>
                    <button className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" onClick={() => remove(c.id)}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal === 'add' ? 'Add Client' : 'Edit Client'} onClose={() => setModal(null)}>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Name</label>
              <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Type</label>
              <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="store">Store</option>
                <option value="freelancer">Freelancer</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Contact Info</label>
              <input className="input" value={form.contact_info}
                onChange={e => setForm({ ...form, contact_info: e.target.value })}
                placeholder="Phone, email, etc." />
            </div>
            <button className="btn btn-primary w-full mt-2" onClick={save}>
              {modal === 'add' ? 'Add Client' : 'Save'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
