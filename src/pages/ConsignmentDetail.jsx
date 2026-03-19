import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { ArrowLeft, RotateCcw, ShoppingCart } from 'lucide-react'
import Loader from '../components/Loader'
import { useToast } from '../components/Toast'
import { pop } from '../lib/celebrate'
import { freelancerColor } from '../lib/colors'

export default function ConsignmentDetail() {
  const { freelancerId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [consignments, setConsignments] = useState([])
  const [skus, setSkus] = useState([])
  const [freelancer, setFreelancer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [returnTarget, setReturnTarget] = useState(null)
  const [returnQty, setReturnQty] = useState(1)
  const [modal, setModal] = useState(false)

  useEffect(() => { load() }, [freelancerId])

  async function load() {
    const [c, f, s] = await Promise.all([
      supabase.from('consignments').select('*, skus(name, quantity_available)').eq('freelancer_id', freelancerId).order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, name').eq('id', freelancerId).single(),
      supabase.from('skus').select('*').order('name'),
    ])
    setConsignments(c.data || [])
    setFreelancer(f.data)
    setSkus(s.data || [])
    setLoading(false)
  }

  const totalPieces = consignments.reduce((sum, c) => sum + c.quantity, 0)

  // Group consignments by SKU
  const grouped = {}
  for (const c of consignments) {
    if (!grouped[c.sku_id]) {
      grouped[c.sku_id] = {
        sku_id: c.sku_id,
        sku_name: c.skus?.name,
        totalQty: 0,
        records: [],
      }
    }
    grouped[c.sku_id].totalQty += c.quantity
    grouped[c.sku_id].records.push(c)
  }
  const skuGroups = Object.values(grouped).sort((a, b) => (a.sku_name || '').localeCompare(b.sku_name || ''))

  function openReturn(group) {
    setReturnTarget(group)
    setReturnQty(group.totalQty)
    setModal('return')
  }

  async function confirmReturn() {
    const group = returnTarget
    let qty = parseInt(returnQty)
    if (!group || qty <= 0 || qty > group.totalQty) {
      toast('Invalid quantity', 'error')
      return
    }

    // Return to inventory
    const sku = skus.find(s => s.id === group.sku_id)
    if (sku) {
      await supabase.from('skus').update({
        quantity_available: sku.quantity_available + qty
      }).eq('id', group.sku_id)
    }

    // Deduct from consignment records (oldest first)
    const sorted = [...group.records].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    let remaining = qty
    for (const rec of sorted) {
      if (remaining <= 0) break
      if (remaining >= rec.quantity) {
        await supabase.from('consignments').delete().eq('id', rec.id)
        remaining -= rec.quantity
      } else {
        await supabase.from('consignments').update({ quantity: rec.quantity - remaining }).eq('id', rec.id)
        remaining = 0
      }
    }

    setModal(false)
    setReturnTarget(null)
    toast(`${qty} returned to inventory`)
    pop()
    load()
  }

  const color = freelancerColor(freelancer?.name)

  if (loading) return <div className="mt-4"><Loader rows={3} /></div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/consignments')} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold"
            style={{ background: `linear-gradient(135deg, ${color.from}, ${color.to})` }}>
            {freelancer?.name?.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{freelancer?.name}</h1>
            <p className="text-xs text-gray-400">{skuGroups.length} SKU{skuGroups.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <span className="text-sm text-gray-500">Total Pieces</span>
        <span className="text-2xl font-bold text-[#5a6340]">{totalPieces}</span>
      </div>

      <div className="flex flex-col gap-3">
        {skuGroups.map(g => (
          <div key={g.sku_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-gray-900">{g.sku_name}</p>
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-sm font-bold bg-[#c3cca6]/20 text-[#5a6340]">{g.totalQty}</span>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm flex-1" onClick={() => openReturn(g)}>
                <RotateCcw size={14} /> Return
              </button>
              <button className="btn btn-success btn-sm flex-1" onClick={() => navigate(`/sales?freelancer=${freelancerId}&sku=${g.sku_id}`)}>
                <ShoppingCart size={14} /> Sale
              </button>
            </div>
          </div>
        ))}
      </div>

      {skuGroups.length === 0 && (
        <p className="text-center text-gray-400 text-sm py-8">No active consignments</p>
      )}

      {modal === 'return' && returnTarget && (
        <Modal title="Return Stock" onClose={() => { setModal(false); setReturnTarget(null) }}>
          <div className="flex flex-col gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><p className="text-xs text-gray-400">Freelancer</p><p className="font-medium">{freelancer?.name}</p></div>
                <div><p className="text-xs text-gray-400">SKU</p><p className="font-medium">{returnTarget.sku_name}</p></div>
                <div><p className="text-xs text-gray-400">Currently Held</p><p className="font-medium">{returnTarget.totalQty} pcs</p></div>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Quantity to Return</label>
              <input type="number" min="1" max={returnTarget.totalQty} className="input" value={returnQty}
                onChange={e => setReturnQty(e.target.value)} />
              <p className="text-xs text-gray-400 mt-1">Max: {returnTarget.totalQty}</p>
            </div>
            <button className="btn btn-primary w-full mt-2" onClick={confirmReturn}>Return Stock</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
