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
          <div key={c.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-sm">{c.name}</p>
                <span className={`badge ${typeBadge(c.type)} mt-1`}>{c.type}</span>
                {c.contact_info && <p className="text-xs text-gray-500 mt-1">{c.contact_info}</p>}
              </div>
              <div className="flex gap-1">
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>
                  <Pencil size={14} />
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => remove(c.id)}>
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
            <tr><th>Name</th><th>Type</th><th>Contact</th><th></th></tr>
          </thead>
          <tbody>
            {clients.map(c => (
              <tr key={c.id}>
                <td className="font-medium">{c.name}</td>
                <td><span className={`badge ${typeBadge(c.type)}`}>{c.type}</span></td>
                <td>{c.contact_info || '—'}</td>
                <td>
                  <div className="flex gap-1">
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>
                      <Pencil size={14} />
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => remove(c.id)}>
                      <Trash2 size={14} />
                    </button>
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
