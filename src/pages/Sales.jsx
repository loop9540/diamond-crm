import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import Loader from '../components/Loader'
import { useToast } from '../components/Toast'
import { saleCelebration, moneyRain } from '../lib/celebrate'
import { Plus, CheckCircle, Clock, Pencil, Trash2, Search, Filter, X } from 'lucide-react'
import { freelancerColor } from '../lib/colors'

export default function Sales() {
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [sales, setSales] = useState([])
  const [freelancers, setFreelancers] = useState([])
  const [skus, setSkus] = useState([])
  const [clients, setClients] = useState([])
  const [consignments, setConsignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editSale, setEditSale] = useState(null)
  const [form, setForm] = useState({
    freelancer_id: '', sku_id: '', client_type: 'individual',
    client_id: '', sale_price: '', payment_status: 'unpaid'
  })
  const [editForm, setEditForm] = useState({
    sale_price: '', payment_status: '', client_type: '', client_id: ''
  })

  // Filters
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterFreelancer, setFilterFreelancer] = useState('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => { load() }, [])

  useEffect(() => {
    const freelancerId = searchParams.get('freelancer')
    const skuId = searchParams.get('sku')
    if (freelancerId && skuId && skus.length > 0) {
      const sku = skus.find(s => s.id === skuId)
      setForm({
        freelancer_id: freelancerId, sku_id: skuId, client_type: 'freelancer',
        client_id: '', sale_price: sku?.sell_price || '', payment_status: 'unpaid',
      })
      setModal('new')
      setSearchParams({})
    }
  }, [searchParams, skus])

  async function load() {
    const [s, f, sk, c, cn] = await Promise.all([
      supabase.from('sales').select('*, profiles(name), skus(item_id, name, sell_price, flat_fee, status), clients(name)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, name').eq('role', 'freelancer').order('name'),
      supabase.from('skus').select('*').order('name'),
      supabase.from('clients').select('*').order('name'),
      supabase.from('consignments').select('*, skus(id, item_id, name, sell_price, status)'),
    ])
    setSales(s.data || [])
    setFreelancers(f.data || [])
    setSkus(sk.data || [])
    setClients(c.data || [])
    setConsignments(cn.data || [])
    setLoading(false)
  }

  // Filtered sales
  const filtered = sales.filter(s => {
    if (filterStatus !== 'all' && s.payment_status !== filterStatus) return false
    if (filterFreelancer !== 'all' && s.freelancer_id !== filterFreelancer) return false
    if (filterDateFrom && new Date(s.created_at) < new Date(filterDateFrom)) return false
    if (filterDateTo && new Date(s.created_at) > new Date(filterDateTo + 'T23:59:59')) return false
    if (search) {
      const q = search.toLowerCase()
      const matchSku = s.skus?.name?.toLowerCase().includes(q)
      const matchItemId = s.skus?.item_id?.toLowerCase().includes(q)
      const matchFreelancer = s.profiles?.name?.toLowerCase().includes(q)
      const matchClient = s.clients?.name?.toLowerCase().includes(q)
      if (!matchSku && !matchItemId && !matchFreelancer && !matchClient) return false
    }
    return true
  })

  const hasFilters = filterStatus !== 'all' || filterFreelancer !== 'all' || filterDateFrom || filterDateTo || search

  function clearFilters() {
    setSearch(''); setFilterStatus('all'); setFilterFreelancer('all')
    setFilterDateFrom(''); setFilterDateTo('')
  }

  // Items available for sale depending on client type
  function getAvailableItems() {
    if (form.client_type === 'freelancer') {
      if (!form.freelancer_id) return []
      return consignments
        .filter(c => c.freelancer_id === form.freelancer_id && c.skus?.status === 'consigned')
        .map(c => c.skus)
        .filter(Boolean)
    }
    return skus.filter(s => s.status === 'available')
  }

  function onItemChange(skuId) {
    const sku = skus.find(s => s.id === skuId)
    setForm({ ...form, sku_id: skuId, sale_price: sku?.sell_price || '' })
  }

  async function createSale() {
    const price = parseFloat(form.sale_price)
    if (!form.sku_id) {
      toast('Please select an item', 'error')
      return
    }
    if (!price || price <= 0) {
      toast('Please enter a valid sale price', 'error')
      return
    }

    const isFreelancerSale = form.client_type === 'freelancer'

    if (isFreelancerSale && !form.freelancer_id) return

    if (isFreelancerSale) {
      const consignment = consignments.find(
        c => c.freelancer_id === form.freelancer_id && c.sku_id === form.sku_id
      )
      if (!consignment) {
        toast('Item is not consigned to this freelancer', 'error')
        return
      }
    } else {
      const sku = skus.find(s => s.id === form.sku_id)
      if (!sku || sku.status !== 'available') {
        toast('Item is not available', 'error')
        return
      }
    }

    await supabase.from('sales').insert({
      freelancer_id: isFreelancerSale ? form.freelancer_id : null,
      sku_id: form.sku_id,
      client_type: form.client_type,
      client_id: form.client_type === 'store' ? form.client_id : null,
      quantity: 1, sale_price: price, payment_status: form.payment_status,
    })

    // Update SKU status to sold
    await supabase.from('skus').update({ status: 'sold' }).eq('id', form.sku_id)

    // If freelancer sale, delete the consignment record
    if (isFreelancerSale) {
      await supabase.from('consignments').delete()
        .eq('freelancer_id', form.freelancer_id)
        .eq('sku_id', form.sku_id)
    }

    setModal(false)
    setForm({ freelancer_id: '', sku_id: '', client_type: 'individual', client_id: '', sale_price: '', payment_status: 'unpaid' })
    toast('Sale recorded successfully')
    saleCelebration()
    load()
  }

  function openEdit(sale) {
    setEditSale(sale)
    setEditForm({
      sale_price: sale.sale_price, payment_status: sale.payment_status,
      client_type: sale.client_type, client_id: sale.client_id || '',
    })
    setModal('edit')
  }

  async function saveEdit() {
    await supabase.from('sales').update({
      sale_price: parseFloat(editForm.sale_price) || 0,
      payment_status: editForm.payment_status,
      client_type: editForm.client_type,
      client_id: editForm.client_type === 'store' ? editForm.client_id : null,
    }).eq('id', editSale.id)
    setModal(false)
    setEditSale(null)
    toast('Sale updated')
    load()
  }

  async function deleteSale(sale) {
    if (!confirm('Delete this sale? Stock will be restored.')) return

    const isFreelancerSale = sale.client_type === 'freelancer' && sale.freelancer_id

    // Restore SKU status
    if (isFreelancerSale) {
      // Restore to consigned and recreate consignment record
      await supabase.from('skus').update({ status: 'consigned' }).eq('id', sale.sku_id)
      await supabase.from('consignments').insert({
        freelancer_id: sale.freelancer_id, sku_id: sale.sku_id, quantity: 1
      })
    } else {
      // Restore to available
      await supabase.from('skus').update({ status: 'available' }).eq('id', sale.sku_id)
    }

    await supabase.from('sales').delete().eq('id', sale.id)
    toast('Sale deleted, stock restored')
    load()
  }

  async function togglePayment(sale) {
    const newStatus = sale.payment_status === 'paid' ? 'unpaid' : 'paid'
    await supabase.from('sales').update({ payment_status: newStatus }).eq('id', sale.id)
    toast(newStatus === 'paid' ? 'Marked as paid' : 'Marked as unpaid')
    if (newStatus === 'paid') moneyRain()
    load()
  }

  if (loading) return <div className="mt-4"><Loader rows={4} /></div>

  const availableItems = getAvailableItems()

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-4xl">Sales</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setModal('new')}>
          <Plus size={16} /> New Sale
        </button>
      </div>

      {/* Search & Filters */}
      <div className="mb-4 flex flex-col gap-2">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" placeholder="Search item, freelancer, client..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className={`btn btn-sm ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowFilters(!showFilters)}>
            <Filter size={14} /> Filters
          </button>
          {hasFilters && (
            <button className="btn btn-sm btn-secondary text-red-500" onClick={clearFilters}>
              <X size={14} /> Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white rounded-xl border border-gray-100 p-3">
            <div>
              <label className="text-[0.65rem] uppercase tracking-wider text-gray-400 mb-1 block">Status</label>
              <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="all">All</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
            <div>
              <label className="text-[0.65rem] uppercase tracking-wider text-gray-400 mb-1 block">Freelancer</label>
              <select className="input" value={filterFreelancer} onChange={e => setFilterFreelancer(e.target.value)}>
                <option value="all">All</option>
                {freelancers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[0.65rem] uppercase tracking-wider text-gray-400 mb-1 block">From</label>
              <input type="date" className="input" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-[0.65rem] uppercase tracking-wider text-gray-400 mb-1 block">To</label>
              <input type="date" className="input" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
            </div>
          </div>
        )}

        {hasFilters && (
          <p className="text-xs text-gray-400">{filtered.length} of {sales.length} sales</p>
        )}
      </div>

      {/* Mobile */}
      <div className="flex flex-col gap-3 sm:hidden">
        {filtered.map(s => (
          <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: `linear-gradient(135deg, ${freelancerColor(s.profiles?.name).from}, ${freelancerColor(s.profiles?.name).to})` }}>
                  {s.profiles?.name?.charAt(0) || '$'}
                </div>
                <div>
                  <p className="font-semibold text-sm">{s.skus?.name}</p>
                  <p className="text-xs text-gray-400">
                    <span className="font-mono">{s.skus?.item_id}</span>
                    {s.profiles?.name ? ` · ${s.profiles.name}` : ''}
                  </p>
                </div>
              </div>
              <button onClick={() => togglePayment(s)}
                className={`badge cursor-pointer ${s.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                {s.payment_status === 'paid' ? <CheckCircle size={12} className="mr-1" /> : <Clock size={12} className="mr-1" />}
                {s.payment_status}
              </button>
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-400">
                {new Date(s.created_at).toLocaleDateString()} · {s.client_type === 'individual' ? 'Individual' : s.client_type === 'store' ? s.clients?.name : 'Freelancer'}
              </span>
              <span className="font-bold text-sm text-gray-900">${Number(s.sale_price).toLocaleString()}</span>
            </div>
            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
              <button className="btn btn-secondary btn-sm flex-1" onClick={() => openEdit(s)}>
                <Pencil size={14} /> Edit
              </button>
              <button className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" onClick={() => deleteSale(s)}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">{hasFilters ? 'No matching sales' : 'No sales recorded'}</p>
        )}
      </div>

      {/* Desktop */}
      <div className="hidden sm:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80">
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Date</th>
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Item</th>
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Item ID</th>
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Freelancer</th>
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Client</th>
              <th className="text-right px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Price</th>
              <th className="text-center px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Status</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4 text-sm text-gray-400">{new Date(s.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4 font-semibold text-gray-900 text-sm">{s.skus?.name}</td>
                <td className="px-6 py-4 text-xs font-mono text-gray-500">{s.skus?.item_id}</td>
                <td className="px-6 py-4 text-sm">
                  {s.profiles?.name ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[0.6rem] font-bold"
                        style={{ background: `linear-gradient(135deg, ${freelancerColor(s.profiles.name).from}, ${freelancerColor(s.profiles.name).to})` }}>
                        {s.profiles.name.charAt(0)}
                      </span>
                      {s.profiles.name}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{s.client_type === 'individual' ? 'Individual' : s.clients?.name}</td>
                <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">${Number(s.sale_price).toLocaleString()}</td>
                <td className="px-6 py-4 text-center">
                  <button onClick={() => togglePayment(s)}
                    className={`badge cursor-pointer ${s.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                    {s.payment_status}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-1 justify-end">
                    <button className="p-2 rounded-lg text-gray-400 hover:text-[#5a6340] hover:bg-[#c3cca6]/20 transition-colors" onClick={() => openEdit(s)}>
                      <Pencil size={16} />
                    </button>
                    <button className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" onClick={() => deleteSale(s)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">{hasFilters ? 'No matching sales' : 'No sales recorded'}</p>
        )}
      </div>

      {/* New Sale Modal */}
      {modal === 'new' && (
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
                <select className="input" value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
                  <option value="">Select...</option>
                  {clients.filter(c => c.type === 'store').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
              <label className="text-xs font-medium text-gray-500 mb-1 block">Item</label>
              {form.client_type === 'freelancer' ? (
                <select className="input" value={form.sku_id} onChange={e => onItemChange(e.target.value)} disabled={!form.freelancer_id}>
                  <option value="">{form.freelancer_id ? 'Select item...' : 'Pick a freelancer first'}</option>
                  {availableItems.map(item => (
                    <option key={item.id} value={item.id}>{item.item_id} — {item.name}</option>
                  ))}
                </select>
              ) : (
                <select className="input" value={form.sku_id} onChange={e => onItemChange(e.target.value)}>
                  <option value="">Select item...</option>
                  {availableItems.map(item => (
                    <option key={item.id} value={item.id}>{item.item_id} — {item.name}</option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Sale Price ($)</label>
              <input type="number" step="0.01" className="input" value={form.sale_price} onChange={e => setForm({ ...form, sale_price: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Payment</label>
              <select className="input" value={form.payment_status} onChange={e => setForm({ ...form, payment_status: e.target.value })}>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <button className="btn btn-primary w-full mt-2" onClick={createSale}>Record Sale</button>
          </div>
        </Modal>
      )}

      {/* Edit Sale Modal */}
      {modal === 'edit' && editSale && (
        <Modal title="Edit Sale" onClose={() => { setModal(false); setEditSale(null) }}>
          <div className="flex flex-col gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><p className="text-xs text-gray-400">Item</p><p className="font-medium">{editSale.skus?.name}</p></div>
                <div><p className="text-xs text-gray-400">Item ID</p><p className="font-medium font-mono">{editSale.skus?.item_id}</p></div>
                {editSale.profiles?.name && <div><p className="text-xs text-gray-400">Freelancer</p><p className="font-medium">{editSale.profiles.name}</p></div>}
                <div><p className="text-xs text-gray-400">Date</p><p className="font-medium">{new Date(editSale.created_at).toLocaleDateString()}</p></div>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Sale Price ($)</label>
              <input type="number" step="0.01" className="input" value={editForm.sale_price} onChange={e => setEditForm({ ...editForm, sale_price: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Payment Status</label>
              <select className="input" value={editForm.payment_status} onChange={e => setEditForm({ ...editForm, payment_status: e.target.value })}>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Client Type</label>
              <select className="input" value={editForm.client_type} onChange={e => setEditForm({ ...editForm, client_type: e.target.value, client_id: '' })}>
                <option value="individual">Individual</option>
                <option value="store">Store</option>
                <option value="freelancer">Freelancer</option>
              </select>
            </div>
            {editForm.client_type === 'store' && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Store</label>
                <select className="input" value={editForm.client_id} onChange={e => setEditForm({ ...editForm, client_id: e.target.value })}>
                  <option value="">Select...</option>
                  {clients.filter(c => c.type === 'store').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div className="flex gap-2 mt-2">
              <button className="btn btn-primary flex-1" onClick={saveEdit}>Save Changes</button>
              <button className="btn btn-danger" onClick={() => { setModal(false); deleteSale(editSale) }}><Trash2 size={16} /> Delete</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
