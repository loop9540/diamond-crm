import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { Package, ShoppingCart } from 'lucide-react'
import { saleCelebration } from '../lib/celebrate'

export default function MyStock() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const [consignments, setConsignments] = useState([])
  const [skus, setSkus] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ sku_id: '', quantity: 1, sale_price: '' })

  useEffect(() => {
    if (user) load()
  }, [user])

  async function load() {
    const [c, s] = await Promise.all([
      supabase.from('consignments').select('*, skus(name, carat_size, gold_type, sell_price)').eq('freelancer_id', user.id).order('created_at', { ascending: false }),
      supabase.from('skus').select('*').order('name'),
    ])
    setConsignments(c.data || [])
    setSkus(s.data || [])
  }

  // Group by SKU
  const grouped = {}
  for (const c of consignments) {
    if (!grouped[c.sku_id]) {
      grouped[c.sku_id] = { sku_id: c.sku_id, sku: c.skus, totalQty: 0, records: [] }
    }
    grouped[c.sku_id].totalQty += c.quantity
    grouped[c.sku_id].records.push(c)
  }
  const skuGroups = Object.values(grouped).sort((a, b) => (a.sku?.name || '').localeCompare(b.sku?.name || ''))

  const total = consignments.reduce((s, c) => s + c.quantity, 0)

  function openSale(group) {
    setForm({ sku_id: group.sku_id, quantity: 1, sale_price: group.sku?.sell_price || '' })
    setModal('sale')
  }

  async function reportSale() {
    const qty = parseInt(form.quantity)
    const price = parseFloat(form.sale_price)
    if (!form.sku_id || qty <= 0 || !price) return

    const group = grouped[form.sku_id]
    if (!group || group.totalQty < qty) {
      toast('Not enough stock', 'error')
      return
    }

    // Create sale — always unpaid, only admin can mark as paid
    await supabase.from('sales').insert({
      freelancer_id: user.id,
      sku_id: form.sku_id,
      client_type: 'freelancer',
      quantity: qty,
      sale_price: price,
      payment_status: 'unpaid',
    })

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
    toast('Sale reported!')
    saleCelebration()
    load()
  }

  return (
    <div>
      <h1 className="text-4xl mb-4">My Stock</h1>

      <div className="stat-card mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#c3cca6] w-10 h-10 rounded-xl flex items-center justify-center text-white">
            <Package size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Items</p>
            <p className="text-xl font-bold">{total}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {skuGroups.map(g => (
          <div key={g.sku_id} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{g.sku?.name}</p>
                <p className="text-xs text-gray-500">
                  {g.sku?.carat_size} / {g.sku?.gold_type} Gold
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="badge badge-info text-lg px-4 py-1">{g.totalQty}</span>
                <button className="btn btn-success btn-sm" onClick={() => openSale(g)}>
                  <ShoppingCart size={14} /> Sell
                </button>
              </div>
            </div>
          </div>
        ))}
        {consignments.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">No stock assigned to you</p>
        )}
      </div>

      {modal === 'sale' && (
        <Modal title="Report a Sale" onClose={() => setModal(false)}>
          <div className="flex flex-col gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-sm font-medium">{grouped[form.sku_id]?.sku?.name}</p>
              <p className="text-xs text-gray-400">Available: {grouped[form.sku_id]?.totalQty} pcs</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Quantity</label>
              <input type="number" min="1" max={grouped[form.sku_id]?.totalQty} className="input" value={form.quantity}
                onChange={e => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Sale Price</label>
              <input type="number" min="0" step="0.01" className="input" value={form.sale_price}
                onChange={e => setForm({ ...form, sale_price: e.target.value })} />
            </div>
            <button className="btn btn-primary w-full mt-2" onClick={reportSale}>Report Sale</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
