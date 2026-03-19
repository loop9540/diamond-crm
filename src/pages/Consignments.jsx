import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { Plus, ChevronRight, Package } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Loader from '../components/Loader'
import { useToast } from '../components/Toast'
import { assignBurst } from '../lib/celebrate'
import { freelancerColor } from '../lib/colors'

export default function Consignments() {
  const [consignments, setConsignments] = useState([])
  const [freelancers, setFreelancers] = useState([])
  const [skus, setSkus] = useState([])
  const navigate = useNavigate()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
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
        {freelancerGroups.map(g => {
          const color = freelancerColor(g.name)
          return (
            <div key={g.freelancer_id}
              onClick={() => navigate(`/consignments/${g.freelancer_id}`)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 cursor-pointer hover:shadow-md hover:border-gray-200 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: `linear-gradient(135deg, ${color.from}, ${color.to})` }}>
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
          )
        })}
      </div>

      {freelancerGroups.length === 0 && (
        <div className="text-center py-12">
          <Package size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 text-sm">No active consignments</p>
        </div>
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
    </div>
  )
}
