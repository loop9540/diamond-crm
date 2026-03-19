import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { Plus, CheckCircle, Clock } from 'lucide-react'

export default function Sales() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [sales, setSales] = useState([])
  const [freelancers, setFreelancers] = useState([])
  const [skus, setSkus] = useState([])
  const [clients, setClients] = useState([])
  const [consignments, setConsignments] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({
    freelancer_id: '', sku_id: '', client_type: 'individual',
    client_id: '', quantity: 1, sale_price: '', payment_status: 'unpaid'
  })

  useEffect(() => { load() }, [])

  // Auto-open modal when navigating from Consignments with params
  useEffect(() => {
    const freelancerId = searchParams.get('freelancer')
    const skuId = searchParams.get('sku')
    if (freelancerId && skuId && skus.length > 0) {
      const sku = skus.find(s => s.id === skuId)
      setForm({
        freelancer_id: freelancerId,
        sku_id: skuId,
        client_type: 'freelancer',
        client_id: '',
        quantity: 1,
        sale_price: sku?.sell_price || '',
        payment_status: 'unpaid',
      })
      setModal(true)
      setSearchParams({})
    }
  }, [searchParams, skus])

  async function load() {
    const [s, f, sk, c, cn] = await Promise.all([
      supabase.from('sales').select('*, profiles(name), skus(name, sell_price, flat_fee), clients(name)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, name').eq('role', 'freelancer').order('name'),
      supabase.from('skus').select('*').order('name'),
      supabase.from('clients').select('*').order('name'),
      supabase.from('consignments').select('*'),
    ])
    setSales(s.data || [])
    setFreelancers(f.data || [])
    setSkus(sk.data || [])
    setClients(c.data || [])
    setConsignments(cn.data || [])
  }

  async function createSale() {
    const qty = parseInt(form.quantity)
    const price = parseFloat(form.sale_price)
    if (!form.sku_id || qty <= 0) return

    const isFreelancerSale = form.client_type === 'freelancer'

    if (isFreelancerSale) {
      if (!form.freelancer_id) return
      // Check consignment
      const consignment = consignments.find(
        c => c.freelancer_id === form.freelancer_id && c.sku_id === form.sku_id && c.quantity >= qty
      )
      if (!consignment) {
        alert('Freelancer does not have enough consigned stock for this SKU')
        return
      }
    } else {
      // Direct sale — check inventory
      const sku = skus.find(s => s.id === form.sku_id)
      if (!sku || sku.quantity_available < qty) {
        alert('Not enough stock available')
        return
      }
    }

    // Create sale
    await supabase.from('sales').insert({
      freelancer_id: isFreelancerSale ? form.freelancer_id : null,
      sku_id: form.sku_id,
      client_type: form.client_type,
      client_id: form.client_type === 'store' ? form.client_id : null,
      quantity: qty,
      sale_price: price,
      payment_status: form.payment_status,
    })

    if (isFreelancerSale) {
      // Reduce consignment
      const consignment = consignments.find(
        c => c.freelancer_id === form.freelancer_id && c.sku_id === form.sku_id && c.quantity >= qty
      )
      const newQty = consignment.quantity - qty
      if (newQty <= 0) {
        await supabase.from('consignments').delete().eq('id', consignment.id)
      } else {
        await supabase.from('consignments').update({ quantity: newQty }).eq('id', consignment.id)
      }
    } else {
      // Reduce inventory directly
      const sku = skus.find(s => s.id === form.sku_id)
      await supabase.from('skus').update({
        quantity_available: sku.quantity_available - qty
      }).eq('id', form.sku_id)
    }

    setModal(false)
    setForm({
      freelancer_id: '', sku_id: '', client_type: 'individual',
      client_id: '', quantity: 1, sale_price: '', payment_status: 'unpaid'
    })
    load()
  }

  async function togglePayment(sale) {
    const newStatus = sale.payment_status === 'paid' ? 'unpaid' : 'paid'
    await supabase.from('sales').update({ payment_status: newStatus }).eq('id', sale.id)
    load()
  }

  function onSkuChange(skuId) {
    const sku = skus.find(s => s.id === skuId)
    setForm({ ...form, sku_id: skuId, sale_price: sku?.sell_price || '' })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Sales</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>
          <Plus size={16} /> New Sale
        </button>
      </div>

      {/* Mobile */}
      <div className="flex flex-col gap-3 sm:hidden">
        {sales.map(s => (
          <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                  {s.profiles?.name?.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-sm">{s.skus?.name}</p>
                  <p className="text-xs text-gray-400">by {s.profiles?.name} &middot; {s.client_type === 'individual' ? 'Individual' : s.clients?.name}</p>
                </div>
              </div>
              <button onClick={() => togglePayment(s)}
                className={`badge cursor-pointer ${s.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                {s.payment_status === 'paid' ? <CheckCircle size={12} className="mr-1" /> : <Clock size={12} className="mr-1" />}
                {s.payment_status}
              </button>
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString()} &middot; {s.quantity} pcs × ${s.sale_price}</span>
              <span className="font-bold text-sm text-gray-900">${(s.quantity * s.sale_price).toLocaleString()}</span>
            </div>
          </div>
        ))}
        {sales.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">No sales recorded</p>
        )}
      </div>

      {/* Desktop */}
      <div className="hidden sm:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80">
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Date</th>
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">SKU</th>
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Freelancer</th>
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Client</th>
              <th className="text-center px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Qty</th>
              <th className="text-right px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Price</th>
              <th className="text-right px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Total</th>
              <th className="text-center px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sales.map(s => (
              <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-400">{new Date(s.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4 font-semibold text-gray-900 text-sm">{s.skus?.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{s.profiles?.name}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{s.client_type === 'individual' ? 'Individual' : s.clients?.name}</td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-sm font-bold bg-indigo-50 text-indigo-600">{s.quantity}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 text-right">${s.sale_price}</td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">${(s.quantity * s.sale_price).toLocaleString()}</td>
                <td className="px-6 py-4 text-center">
                  <button onClick={() => togglePayment(s)}
                    className={`badge cursor-pointer ${s.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                    {s.payment_status}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title="Record Sale" onClose={() => setModal(false)}>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Client Type</label>
              <select className="input" value={form.client_type}
                onChange={e => setForm({ ...form, client_type: e.target.value, client_id: '', freelancer_id: '', sku_id: '', sale_price: '' })}>
                <option value="individual">Individual</option>
                <option value="store">Store</option>
                <option value="freelancer">Freelancer</option>
              </select>
            </div>
            {form.client_type === 'store' && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Store</label>
                <select className="input" value={form.client_id}
                  onChange={e => setForm({ ...form, client_id: e.target.value })}>
                  <option value="">Select...</option>
                  {clients.filter(c => c.type === 'store').map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            {form.client_type === 'freelancer' && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Freelancer</label>
                <select className="input" value={form.freelancer_id}
                  onChange={e => setForm({ ...form, freelancer_id: e.target.value, sku_id: '', sale_price: '' })}>
                  <option value="">Select...</option>
                  {freelancers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">SKU</label>
              {form.client_type === 'freelancer' ? (
                <select className="input" value={form.sku_id} onChange={e => onSkuChange(e.target.value)}
                  disabled={!form.freelancer_id}>
                  <option value="">{form.freelancer_id ? 'Select...' : 'Pick a freelancer first'}</option>
                  {consignments
                    .filter(c => c.freelancer_id === form.freelancer_id && c.quantity > 0)
                    .map(c => {
                      const sku = skus.find(s => s.id === c.sku_id)
                      return sku ? (
                        <option key={c.id} value={sku.id}>{sku.name} ({c.quantity} available)</option>
                      ) : null
                    })}
                </select>
              ) : (
                <select className="input" value={form.sku_id} onChange={e => onSkuChange(e.target.value)}>
                  <option value="">Select...</option>
                  {skus.filter(s => s.quantity_available > 0).map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.quantity_available} in stock)</option>
                  ))}
                </select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Quantity</label>
                <input type="number" min="1" className="input" value={form.quantity}
                  onChange={e => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Sale Price ($)</label>
                <input type="number" step="0.01" className="input" value={form.sale_price}
                  onChange={e => setForm({ ...form, sale_price: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Payment</label>
              <select className="input" value={form.payment_status}
                onChange={e => setForm({ ...form, payment_status: e.target.value })}>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <button className="btn btn-primary w-full mt-2" onClick={createSale}>Record Sale</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
