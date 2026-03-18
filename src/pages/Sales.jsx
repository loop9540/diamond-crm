import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { Plus, CheckCircle, Clock } from 'lucide-react'

export default function Sales() {
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
    if (!form.freelancer_id || !form.sku_id || qty <= 0) return

    // Check consignment
    const consignment = consignments.find(
      c => c.freelancer_id === form.freelancer_id && c.sku_id === form.sku_id && c.quantity >= qty
    )
    if (!consignment) {
      alert('Freelancer does not have enough consigned stock for this SKU')
      return
    }

    // Create sale
    await supabase.from('sales').insert({
      freelancer_id: form.freelancer_id,
      sku_id: form.sku_id,
      client_type: form.client_type,
      client_id: form.client_type !== 'individual' ? form.client_id : null,
      quantity: qty,
      sale_price: price,
      payment_status: form.payment_status,
    })

    // Reduce consignment
    const newQty = consignment.quantity - qty
    if (newQty <= 0) {
      await supabase.from('consignments').delete().eq('id', consignment.id)
    } else {
      await supabase.from('consignments').update({ quantity: newQty }).eq('id', consignment.id)
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
          <div key={s.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-sm">{s.skus?.name}</p>
                <p className="text-xs text-gray-500">by {s.profiles?.name}</p>
                <p className="text-xs text-gray-500">
                  to {s.client_type === 'individual' ? 'Individual' : s.clients?.name}
                </p>
              </div>
              <button onClick={() => togglePayment(s)}
                className={`badge cursor-pointer ${s.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                {s.payment_status === 'paid' ? <CheckCircle size={12} className="mr-1" /> : <Clock size={12} className="mr-1" />}
                {s.payment_status}
              </button>
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
              <span>{s.quantity} pcs × ${s.sale_price}</span>
              <span className="font-semibold text-gray-700">${(s.quantity * s.sale_price).toLocaleString()}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {new Date(s.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
        {sales.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">No sales recorded</p>
        )}
      </div>

      {/* Desktop */}
      <div className="hidden sm:block card p-0 overflow-hidden">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>SKU</th>
              <th>Freelancer</th>
              <th>Client</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sales.map(s => (
              <tr key={s.id}>
                <td className="text-gray-500">{new Date(s.created_at).toLocaleDateString()}</td>
                <td className="font-medium">{s.skus?.name}</td>
                <td>{s.profiles?.name}</td>
                <td>{s.client_type === 'individual' ? 'Individual' : s.clients?.name}</td>
                <td>{s.quantity}</td>
                <td>${s.sale_price}</td>
                <td className="font-medium">${(s.quantity * s.sale_price).toLocaleString()}</td>
                <td>
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
              <label className="text-xs font-medium text-gray-500 mb-1 block">Freelancer</label>
              <select className="input" value={form.freelancer_id}
                onChange={e => setForm({ ...form, freelancer_id: e.target.value })}>
                <option value="">Select...</option>
                {freelancers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">SKU</label>
              <select className="input" value={form.sku_id} onChange={e => onSkuChange(e.target.value)}>
                <option value="">Select...</option>
                {skus.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Client Type</label>
              <select className="input" value={form.client_type}
                onChange={e => setForm({ ...form, client_type: e.target.value, client_id: '' })}>
                <option value="individual">Individual</option>
                <option value="store">Store</option>
                <option value="freelancer">Freelancer</option>
              </select>
            </div>
            {form.client_type !== 'individual' && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Client</label>
                <select className="input" value={form.client_id}
                  onChange={e => setForm({ ...form, client_id: e.target.value })}>
                  <option value="">Select...</option>
                  {clients.filter(c => c.type === form.client_type).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
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
