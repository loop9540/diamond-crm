import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { Plus, RotateCcw, ShoppingCart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Loader from '../components/Loader'
import { useToast } from '../components/Toast'
import { assignBurst, pop } from '../lib/celebrate'

export default function Consignments() {
  const [consignments, setConsignments] = useState([])
  const [freelancers, setFreelancers] = useState([])
  const [skus, setSkus] = useState([])
  const navigate = useNavigate()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false) // false | 'assign' | 'return'
  const [returnTarget, setReturnTarget] = useState(null)
  const [returnQty, setReturnQty] = useState(1)
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
    setLoading(false)
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
    toast('Stock assigned')
    assignBurst()
    load()
  }

  function openReturn(c) {
    setReturnTarget(c)
    setReturnQty(c.quantity)
    setModal('return')
  }

  async function confirmReturn() {
    const c = returnTarget
    const qty = parseInt(returnQty)
    if (!c || qty <= 0 || qty > c.quantity) {
      toast('Invalid quantity', 'error')
      return
    }

    // Return to inventory
    const sku = skus.find(s => s.id === c.sku_id)
    if (sku) {
      await supabase.from('skus').update({
        quantity_available: sku.quantity_available + qty
      }).eq('id', c.sku_id)
    }

    // Update or delete consignment
    const remaining = c.quantity - qty
    if (remaining <= 0) {
      await supabase.from('consignments').delete().eq('id', c.id)
    } else {
      await supabase.from('consignments').update({ quantity: remaining }).eq('id', c.id)
    }

    setModal(false)
    setReturnTarget(null)
    toast(`${qty} returned to inventory`)
    pop()
    load()
  }

  if (loading) return <div className="mt-4"><Loader rows={3} /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-4xl">Consignments</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setModal('assign')}>
          <Plus size={16} /> Assign Stock
        </button>
      </div>

      {/* Mobile */}
      <div className="flex flex-col gap-3 sm:hidden">
        {consignments.map(c => (
          <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                  {c.profiles?.name?.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-sm">{c.profiles?.name}</p>
                  <p className="text-xs text-gray-400">{c.skus?.name}</p>
                </div>
              </div>
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-sm font-bold bg-[#c3cca6]/20 text-[#5a6340]">{c.quantity}</span>
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => openReturn(c)}><RotateCcw size={14} /> Return</button>
              <button className="btn btn-success btn-sm" onClick={() => navigate(`/sales?freelancer=${c.freelancer_id}&sku=${c.sku_id}`)}><ShoppingCart size={14} /> Sale</button>
            </div>
          </div>
        ))}
        {consignments.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">No active consignments</p>
        )}
      </div>

      {/* Desktop */}
      <div className="hidden sm:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80">
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Freelancer</th>
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">SKU</th>
              <th className="text-center px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Qty</th>
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Date</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {consignments.map(c => (
              <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-[0.65rem] font-bold">
                      {c.profiles?.name?.charAt(0)}
                    </div>
                    <span className="font-semibold text-gray-900 text-sm">{c.profiles?.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{c.skus?.name}</td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-sm font-bold bg-[#c3cca6]/20 text-[#5a6340]">{c.quantity}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-400">{new Date(c.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  <div className="flex justify-end">
                    <button className="btn btn-secondary btn-sm" onClick={() => openReturn(c)}><RotateCcw size={14} /> Return</button>
                    <button className="btn btn-success btn-sm" onClick={() => navigate(`/sales?freelancer=${c.freelancer_id}&sku=${c.sku_id}`)}><ShoppingCart size={14} /> Sale</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal === 'assign' && (
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

      {modal === 'return' && returnTarget && (
        <Modal title="Return Stock" onClose={() => { setModal(false); setReturnTarget(null) }}>
          <div className="flex flex-col gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><p className="text-xs text-gray-400">Freelancer</p><p className="font-medium">{returnTarget.profiles?.name}</p></div>
                <div><p className="text-xs text-gray-400">SKU</p><p className="font-medium">{returnTarget.skus?.name}</p></div>
                <div><p className="text-xs text-gray-400">Currently Held</p><p className="font-medium">{returnTarget.quantity} pcs</p></div>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Quantity to Return</label>
              <input type="number" min="1" max={returnTarget.quantity} className="input" value={returnQty}
                onChange={e => setReturnQty(e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">Max: {returnTarget.quantity}</p>
            </div>
            <button className="btn btn-primary w-full mt-2" onClick={confirmReturn}>Return Stock</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
