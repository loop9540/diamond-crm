import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { ArrowLeft, RotateCcw, ShoppingCart, Package, Pencil } from 'lucide-react'
import Loader from '../components/Loader'
import { useToast } from '../components/Toast'
import { pop } from '../lib/celebrate'
import { freelancerColor } from '../lib/colors'
import { logAction } from '../lib/audit'
import { getCaratSizes, getGoldTypes, getCategories } from './Settings'

export default function ConsignmentDetail() {
  const { freelancerId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [consignments, setConsignments] = useState([])
  const [freelancer, setFreelancer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [caratOptions, setCaratOptions] = useState([])
  const [goldOptions, setGoldOptions] = useState([])
  const [categoryOptions, setCategoryOptions] = useState([])

  useEffect(() => { load() }, [freelancerId])

  async function load() {
    const [c, f, cs, gs, cats] = await Promise.all([
      supabase.from('consignments').select('*, skus(*)').eq('freelancer_id', freelancerId).order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, name').eq('id', freelancerId).single(),
      getCaratSizes(),
      getGoldTypes(),
      getCategories(),
    ])
    setConsignments(c.data || [])
    setFreelancer(f.data)
    setCaratOptions(cs)
    setGoldOptions(gs)
    setCategoryOptions(cats)
    setLoading(false)
  }

  async function returnItem(consignment) {
    await supabase.from('consignments').delete().eq('id', consignment.id)
    await supabase.from('skus').update({ status: 'available' }).eq('id', consignment.sku_id)
    await logAction({ sku_id: consignment.sku_id, item_id: consignment.skus?.item_id, action: 'returned', details: `Returned from ${freelancer?.name}` })
    toast('Item returned to inventory')
    pop()
    load()
  }

  function openEdit(sku) {
    setEditItem(sku)
    setEditForm({
      name: sku.name || '',
      category: sku.category || '',
      carat_size: sku.carat_size || '',
      gold_type: sku.gold_type || '',
      color: sku.color || '',
      clarity: sku.clarity || '',
      cost_price: sku.cost_price ?? '',
      sell_price: sku.sell_price ?? '',
      flat_fee: sku.flat_fee ?? '',
    })
  }

  async function saveEdit() {
    const payload = {
      ...editForm,
      cost_price: parseFloat(editForm.cost_price) || 0,
      sell_price: parseFloat(editForm.sell_price) || 0,
      flat_fee: parseFloat(editForm.flat_fee) || 0,
    }
    await supabase.from('skus').update(payload).eq('id', editItem.id)
    await logAction({ sku_id: editItem.id, item_id: editItem.item_id, action: 'edited', details: `Item details updated` })
    setEditItem(null)
    toast('Item updated')
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
            <p className="text-xs text-gray-400">{consignments.length} item{consignments.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <span className="text-sm text-gray-500">Total Items</span>
        <span className="text-2xl font-bold text-[#5a6340]">{consignments.length}</span>
      </div>

      <div className="flex flex-col gap-3">
        {consignments.map(c => (
          <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[#c3cca6]/20 text-[#5a6340] font-bold">{c.skus?.item_id}</span>
                  <p className="font-semibold text-gray-900">{c.skus?.name}</p>
                </div>
                <div className="flex gap-3 mt-1 flex-wrap">
                  {c.skus?.category && (
                    <p className="text-xs text-gray-400">Category: <span className="text-gray-600">{c.skus.category}</span></p>
                  )}
                  {c.skus?.color && (
                    <p className="text-xs text-gray-400">Color: <span className="text-gray-600">{c.skus.color}</span></p>
                  )}
                  {c.skus?.clarity && (
                    <p className="text-xs text-gray-400">Clarity: <span className="text-gray-600">{c.skus.clarity}</span></p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm flex-1" onClick={() => openEdit(c.skus)}>
                <Pencil size={14} /> Edit
              </button>
              <button className="btn btn-secondary btn-sm flex-1" onClick={() => returnItem(c)}>
                <RotateCcw size={14} /> Return
              </button>
              <button className="btn btn-success btn-sm flex-1" onClick={() => navigate(`/sales?freelancer=${freelancerId}&sku=${c.sku_id}`)}>
                <ShoppingCart size={14} /> Sale
              </button>
            </div>
          </div>
        ))}
      </div>

      {consignments.length === 0 && (
        <div className="text-center py-12">
          <Package size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 text-sm">No active consignments</p>
        </div>
      )}

      {editItem && (
        <Modal title={`Edit ${editItem.item_id}`} onClose={() => setEditItem(null)}>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Category</label>
              <select className="input" value={editForm.category}
                onChange={e => setEditForm({ ...editForm, category: e.target.value })}>
                <option value="">Select category...</option>
                {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Carat</label>
                <select className="input" value={editForm.carat_size}
                  onChange={e => setEditForm({ ...editForm, carat_size: e.target.value, name: `${e.target.value} / ${editForm.gold_type}` })}>
                  {caratOptions.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Gold</label>
                <select className="input" value={editForm.gold_type}
                  onChange={e => setEditForm({ ...editForm, gold_type: e.target.value, name: `${editForm.carat_size} / ${e.target.value}` })}>
                  {goldOptions.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Name</label>
              <input className="input" value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Color</label>
                <input className="input" value={editForm.color}
                  onChange={e => setEditForm({ ...editForm, color: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Clarity</label>
                <input className="input" value={editForm.clarity}
                  onChange={e => setEditForm({ ...editForm, clarity: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Cost</label>
                <input type="number" step="0.01" className="input" value={editForm.cost_price}
                  onChange={e => setEditForm({ ...editForm, cost_price: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Sell</label>
                <input type="number" step="0.01" className="input" value={editForm.sell_price}
                  onChange={e => setEditForm({ ...editForm, sell_price: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Fee</label>
                <input type="number" step="0.01" className="input" value={editForm.flat_fee}
                  onChange={e => setEditForm({ ...editForm, flat_fee: e.target.value })} />
              </div>
            </div>
            <button className="btn btn-primary w-full mt-2" onClick={saveEdit}>Save Changes</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
