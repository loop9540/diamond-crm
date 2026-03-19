import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { Plus, RotateCcw, ShoppingCart, ChevronRight, Package } from 'lucide-react'
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
  const [modal, setModal] = useState(false) // false | 'assign' | 'return' | 'detail'
  const [returnTarget, setReturnTarget] = useState(null)
  const [returnQty, setReturnQty] = useState(1)
  const [form, setForm] = useState({ freelancer_id: '', sku_id: '', quantity: 1 })
  const [selectedFreelancer, setSelectedFreelancer] = useState(null)

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

    const sku = skus.find(s => s.id === form.sku_id)
    if (!sku || sku.quantity_available < qty) {
      alert('Not enough stock available')
      return
    }

    await supabase.from('consignments').insert({
      freelancer_id: form.freelancer_id,
      sku_id: form.sku_id,
      quantity: qty,
    })

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

    const sku = skus.find(s => s.id === c.sku_id)
    if (sku) {
      await supabase.from('skus').update({
        quantity_available: sku.quantity_available + qty
      }).eq('id', c.sku_id)
    }

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

  // Group consignments by freelancer
  const grouped = {}
  for (const c of consignments) {
    const fid = c.freelancer_id
    if (!grouped[fid]) {
      grouped[fid] = {
        freelancer_id: fid,
        name: c.profiles?.name || 'Unknown',
        items: [],
        totalPieces: 0,
      }
    }
    grouped[fid].items.push(c)
    grouped[fid].totalPieces += c.quantity
  }
  const freelancerGroups = Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name))

  function openDetail(group) {
    setSelectedFreelancer(group)
    setModal('detail')
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

      {/* Freelancer Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {freelancerGroups.map(g => (
          <div key={g.freelancer_id}
            onClick={() => openDetail(g)}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 cursor-pointer hover:shadow-md hover:border-gray-200 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                  {g.name?.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{g.name}</p>
                  <p className="text-xs text-gray-400">{g.items.length} SKU{g.items.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#5a6340]">{g.totalPieces}</p>
                  <p className="text-[0.6rem] uppercase tracking-wider text-gray-400">pieces</p>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
            </div>
            {/* SKU summary pills */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              {g.items.map(c => (
                <span key={c.id} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-gray-50 text-gray-600">
                  {c.skus?.name} <span className="font-semibold text-[#5a6340]">×{c.quantity}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {freelancerGroups.length === 0 && (
        <div className="text-center py-12">
          <Package size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 text-sm">No active consignments</p>
        </div>
      )}

      {/* Detail Modal */}
      {modal === 'detail' && selectedFreelancer && (
        <Modal title={`${selectedFreelancer.name}'s Stock`} onClose={() => { setModal(false); setSelectedFreelancer(null) }}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3 mb-1">
              <span className="text-sm text-gray-500">Total Pieces</span>
              <span className="text-xl font-bold text-[#5a6340]">{selectedFreelancer.totalPieces}</span>
            </div>
            {selectedFreelancer.items.map(c => (
              <div key={c.id} className="bg-white border border-gray-100 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{c.skus?.name}</p>
                    <p className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-sm font-bold bg-[#c3cca6]/20 text-[#5a6340]">{c.quantity}</span>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-secondary btn-sm flex-1" onClick={() => { setModal(false); setSelectedFreelancer(null); setTimeout(() => openReturn(c), 100) }}>
                    <RotateCcw size={14} /> Return
                  </button>
                  <button className="btn btn-success btn-sm flex-1" onClick={() => { setModal(false); setSelectedFreelancer(null); navigate(`/sales?freelancer=${c.freelancer_id}&sku=${c.sku_id}`) }}>
                    <ShoppingCart size={14} /> Sale
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

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
