import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { Plus, RotateCcw } from 'lucide-react'

export default function Consignments() {
  const [consignments, setConsignments] = useState([])
  const [freelancers, setFreelancers] = useState([])
  const [skus, setSkus] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ freelancer_id: '', sku_id: '', quantity: 1 })

  useEffect(() => { load() }, [])

  async function load() {
    const [c, f, s] = await Promise.all([
      supabase.from('consignments').select('*, profiles(name), skus(name, quantity_available)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, name').eq('role', 'freelancer').order('name'),
      supabase.from('skus').select('*').order('name'),
    ])
    setConsignments(c.data || [])
    setFreelancers(f.data || [])
    setSkus(s.data || [])
  }

  async function assign() {
    const qty = parseInt(form.quantity)
    if (!form.freelancer_id || !form.sku_id || qty <= 0) return

    // Check stock
    const sku = skus.find(s => s.id === form.sku_id)
    if (!sku || sku.quantity_available < qty) {
      alert('Not enough stock available')
      return
    }

    // Create consignment
    await supabase.from('consignments').insert({
      freelancer_id: form.freelancer_id,
      sku_id: form.sku_id,
      quantity: qty,
    })

    // Decrease inventory
    await supabase.from('skus').update({
      quantity_available: sku.quantity_available - qty
    }).eq('id', form.sku_id)

    setModal(false)
    setForm({ freelancer_id: '', sku_id: '', quantity: 1 })
    load()
  }

  async function returnStock(c) {
    if (!confirm(`Return ${c.quantity} units from ${c.profiles?.name}?`)) return

    // Return to inventory
    const sku = skus.find(s => s.id === c.sku_id)
    if (sku) {
      await supabase.from('skus').update({
        quantity_available: sku.quantity_available + c.quantity
      }).eq('id', c.sku_id)
    }

    await supabase.from('consignments').delete().eq('id', c.id)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Consignments</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>
          <Plus size={16} /> Assign Stock
        </button>
      </div>

      {/* Mobile */}
      <div className="flex flex-col gap-3 sm:hidden">
        {consignments.map(c => (
          <div key={c.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-sm">{c.profiles?.name}</p>
                <p className="text-xs text-gray-500">{c.skus?.name}</p>
                <span className="badge badge-info mt-1">{c.quantity} pcs</span>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => returnStock(c)}>
                <RotateCcw size={14} /> Return
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {new Date(c.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
        {consignments.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">No active consignments</p>
        )}
      </div>

      {/* Desktop */}
      <div className="hidden sm:block card p-0 overflow-hidden">
        <table>
          <thead>
            <tr>
              <th>Freelancer</th>
              <th>SKU</th>
              <th>Qty</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {consignments.map(c => (
              <tr key={c.id}>
                <td className="font-medium">{c.profiles?.name}</td>
                <td>{c.skus?.name}</td>
                <td><span className="badge badge-info">{c.quantity}</span></td>
                <td className="text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                <td>
                  <button className="btn btn-secondary btn-sm" onClick={() => returnStock(c)}>
                    <RotateCcw size={14} /> Return
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Assign Stock to Freelancer" onClose={() => setModal(false)}>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Freelancer</label>
              <select className="input" value={form.freelancer_id}
                onChange={e => setForm({ ...form, freelancer_id: e.target.value })}>
                <option value="">Select freelancer...</option>
                {freelancers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">SKU</label>
              <select className="input" value={form.sku_id}
                onChange={e => setForm({ ...form, sku_id: e.target.value })}>
                <option value="">Select SKU...</option>
                {skus.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.quantity_available} available)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Quantity</label>
              <input type="number" min="1" className="input" value={form.quantity}
                onChange={e => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <button className="btn btn-primary w-full mt-2" onClick={assign}>Assign</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
