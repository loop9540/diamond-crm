import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import Loader from '../components/Loader'
import { useToast } from '../components/Toast'
import { sparkle } from '../lib/celebrate'
import { Plus, Pencil, Trash2, Upload, X, ChevronLeft, ChevronRight, Search, ShoppingCart } from 'lucide-react'
import { getCaratSizes, getGoldTypes, getCategories } from './Settings'
import { logAction } from '../lib/audit'
import { saleCelebration } from '../lib/celebrate'

const STATUS_COLORS = {
  available: 'bg-emerald-50 text-emerald-600',
  consigned: 'bg-amber-50 text-amber-600',
  sold: 'bg-red-50 text-red-500',
}

const emptySku = {
  name: '', carat_size: '1ct', gold_type: 'WG',
  cost_price: '', sell_price: '', flat_fee: '',
  color: '', clarity: '', status: 'available'
}

export default function Inventory() {
  const toast = useToast()
  const [skus, setSkus] = useState([])
  const [loading, setLoading] = useState(true)
  const [images, setImages] = useState({})
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(emptySku)
  const [editId, setEditId] = useState(null)
  const [auditLog, setAuditLog] = useState([])
  const [editImages, setEditImages] = useState([])
  const [uploading, setUploading] = useState(false)
  const [imageModal, setImageModal] = useState(null)
  const fileRef = useRef()
  const appraisalRef = useRef()
  const [uploadingAppraisal, setUploadingAppraisal] = useState(false)
  const [sellItem, setSellItem] = useState(null)
  const [sellPrice, setSellPrice] = useState('')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('available')
  const [filterSize, setFilterSize] = useState('all')
  const [filterFreelancer, setFilterFreelancer] = useState('all')
  const [caratOptions, setCaratOptions] = useState([])
  const [goldOptions, setGoldOptions] = useState([])
  const [categoryOptions, setCategoryOptions] = useState([])
  const [filterCategory, setFilterCategory] = useState('all')
  const [freelancers, setFreelancers] = useState([])

  useEffect(() => { load() }, [])

  const [consignedTo, setConsignedTo] = useState({})
  const [consignedToId, setConsignedToId] = useState({}) // { sku_id: freelancer_name }

  async function load() {
    const [skuRes, imgRes, conRes, fRes] = await Promise.all([
      supabase.from('skus').select('*'),
      supabase.from('sku_images').select('*').order('position'),
      supabase.from('consignments').select('sku_id, freelancer_id, profiles(name)'),
      supabase.from('profiles').select('id, name').eq('role', 'freelancer').order('name'),
    ])
    setFreelancers(fRes.data || [])
    const sorted = (skuRes.data || []).sort((a, b) => {
      const ca = parseFloat(a.carat_size) || 0
      const cb = parseFloat(b.carat_size) || 0
      if (ca !== cb) return ca - cb
      if (a.gold_type !== b.gold_type) return a.gold_type.localeCompare(b.gold_type)
      return (a.item_id || '').localeCompare(b.item_id || '')
    })
    setSkus(sorted)

    const conMap = {}
    const conFreelancerMap = {}
    for (const c of conRes.data || []) {
      conMap[c.sku_id] = c.profiles?.name
      conFreelancerMap[c.sku_id] = c.freelancer_id
    }
    setConsignedTo(conMap)
    setConsignedToId(conFreelancerMap)

    const imgMap = {}
    for (const img of imgRes.data || []) {
      if (!imgMap[img.sku_id]) imgMap[img.sku_id] = []
      imgMap[img.sku_id].push(img)
    }
    setImages(imgMap)
    const [cs, gs, cats] = await Promise.all([getCaratSizes(), getGoldTypes(), getCategories()])
    setCaratOptions(cs)
    setGoldOptions(gs)
    setCategoryOptions(cats)
    setLoading(false)
  }

  function openAdd() {
    setForm(emptySku)
    setEditImages([])
    setModal('add')
  }

  async function openEdit(sku) {
    setForm(sku)
    setEditId(sku.id)
    setEditImages(images[sku.id] || [])
    const { data } = await supabase.from('audit_log').select('*').eq('sku_id', sku.id).order('created_at', { ascending: false })
    setAuditLog(data || [])
    setModal('edit')
  }

  async function save() {
    const payload = {
      ...form,
      cost_price: parseFloat(form.cost_price) || 0,
      sell_price: parseFloat(form.sell_price) || 0,
      flat_fee: parseFloat(form.flat_fee) || 0,
      quantity_available: form.status === 'available' ? 1 : 0,
    }
    if (modal === 'add') {
      const { id, created_at, item_id, ...rest } = payload
      const { data: inserted } = await supabase.from('skus').insert(rest).select().single()
      if (inserted) {
        await logAction({ sku_id: inserted.id, item_id: inserted.item_id, action: 'created', details: `${inserted.name} added to inventory` })
      }
    } else {
      const { id, created_at, item_id, ...rest } = payload
      await supabase.from('skus').update(rest).eq('id', editId)
    }
    setModal(null)
    toast(modal === 'add' ? 'Item added' : 'Item updated')
    if (modal === 'add') sparkle()
    load()
  }

  function openSell(sku) {
    setSellItem(sku)
    setSellPrice(sku.sell_price || '')
    setModal('sell')
  }

  async function confirmSell() {
    const price = parseFloat(sellPrice)
    if (!sellItem) return
    if (!price || price <= 0) {
      toast('Please enter a valid sale price', 'error')
      return
    }

    await supabase.from('sales').insert({
      freelancer_id: null,
      sku_id: sellItem.id,
      client_type: 'individual',
      quantity: 1,
      sale_price: price,
      payment_status: 'unpaid',
    })

    await supabase.from('skus').update({ status: 'sold' }).eq('id', sellItem.id)
    await logAction({ sku_id: sellItem.id, item_id: sellItem.item_id, action: 'sold', details: `Sold for $${price} (direct sale)` })

    setModal(null)
    setSellItem(null)
    toast('Sale recorded')
    saleCelebration()
    load()
  }

  async function remove(id) {
    if (!confirm('Delete this item?')) return
    const skuImages = images[id] || []
    for (const img of skuImages) {
      const path = img.url.split('/sku-images/')[1]
      if (path) await supabase.storage.from('sku-images').remove([path])
    }
    await supabase.from('skus').delete().eq('id', id)
    toast('Item deleted')
    load()
  }

  async function uploadImages(e) {
    const files = Array.from(e.target.files)
    if (!files.length || !editId) return
    setUploading(true)

    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `${editId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage.from('sku-images').upload(path, file)
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('sku-images').getPublicUrl(path)
        await supabase.from('sku_images').insert({ sku_id: editId, url: publicUrl, position: editImages.length })
      }
    }

    const { data } = await supabase.from('sku_images').select('*').eq('sku_id', editId).order('position')
    setEditImages(data || [])
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
    load()
  }

  async function removeImage(img) {
    const path = img.url.split('/sku-images/')[1]
    if (path) await supabase.storage.from('sku-images').remove([path])
    await supabase.from('sku_images').delete().eq('id', img.id)
    setEditImages(editImages.filter(i => i.id !== img.id))
    load()
  }

  async function uploadAppraisal(e) {
    const file = e.target.files[0]
    if (!file || !editId) return
    setUploadingAppraisal(true)
    const ext = file.name.split('.').pop()
    const path = `appraisals/${editId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('sku-images').upload(path, file)
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('sku-images').getPublicUrl(path)
      await supabase.from('skus').update({ appraisal_url: publicUrl }).eq('id', editId)
      setForm({ ...form, appraisal_url: publicUrl })
    }
    setUploadingAppraisal(false)
    if (appraisalRef.current) appraisalRef.current.value = ''
    load()
  }

  async function removeAppraisal() {
    if (!editId || !form.appraisal_url) return
    const path = form.appraisal_url.split('/sku-images/')[1]
    if (path) await supabase.storage.from('sku-images').remove([path])
    await supabase.from('skus').update({ appraisal_url: null }).eq('id', editId)
    setForm({ ...form, appraisal_url: null })
    load()
  }

  function autoName() {
    return `${form.carat_size} / ${form.gold_type}`
  }

  useEffect(() => {
    if (!imageModal) return
    function handleKey(e) {
      const imgs = images[imageModal.skuId]
      if (!imgs) return
      if (e.key === 'ArrowRight' && imageModal.index < imgs.length - 1) setImageModal({ ...imageModal, index: imageModal.index + 1 })
      else if (e.key === 'ArrowLeft' && imageModal.index > 0) setImageModal({ ...imageModal, index: imageModal.index - 1 })
      else if (e.key === 'Escape') setImageModal(null)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [imageModal, images])

  function getThumb(skuId) {
    return images[skuId]?.[0]?.url || null
  }

  const SIZE_FILTERS = [
    { label: 'All', value: 'all' },
    { label: 'Small (1.00–1.49ct)', value: 'small', match: s => { const v = parseFloat(s); return v >= 1 && v < 1.5 } },
    { label: 'Medium (1.50–1.99ct)', value: 'medium', match: s => { const v = parseFloat(s); return v >= 1.5 && v < 2 } },
    { label: 'Large (2ct+)', value: 'large', match: s => parseFloat(s) >= 2 },
  ]

  const filtered = skus.filter(sku => {
    if (filterSize !== 'all') {
      const sizeFilter = SIZE_FILTERS.find(f => f.value === filterSize)
      if (sizeFilter && !sizeFilter.match(sku.carat_size)) return false
    }
    if (filterStatus !== 'all' && sku.status !== filterStatus) return false
    if (filterCategory !== 'all' && sku.category !== filterCategory) return false
    if (filterFreelancer !== 'all' && consignedToId[sku.id] !== filterFreelancer) return false
    if (search) {
      const q = search.toLowerCase()
      if (!sku.name?.toLowerCase().includes(q) && !sku.item_id?.toLowerCase().includes(q) && !sku.color?.toLowerCase().includes(q) && !sku.clarity?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const hasFilters = filterStatus !== 'all' || filterSize !== 'all' || filterCategory !== 'all' || filterFreelancer !== 'all' || search

  // Summary by gold type within each size group
  const goldSummary = {}
  for (const sku of skus) {
    const key = sku.gold_type
    if (!goldSummary[key]) goldSummary[key] = { gold_type: key, available: 0, consigned: 0, sold: 0, total: 0, carats: [] }
    goldSummary[key][sku.status] = (goldSummary[key][sku.status] || 0) + 1
    goldSummary[key].total++
    goldSummary[key].carats.push(sku.carat_size)
  }

  const totalCost = skus.reduce((s, sku) => s + (parseFloat(sku.cost_price) || 0), 0)
  const totalSell = skus.reduce((s, sku) => s + (parseFloat(sku.sell_price) || 0), 0)
  const consignedCost = skus.filter(s => s.status === 'consigned').reduce((s, sku) => s + (parseFloat(sku.cost_price) || 0), 0)
  const consignedSell = skus.filter(s => s.status === 'consigned').reduce((s, sku) => s + (parseFloat(sku.sell_price) || 0), 0)

  if (loading) return <div className="mt-4"><Loader rows={3} /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-4xl">Inventory</h1>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <Plus size={16} /> Add Item
        </button>
      </div>

      {/* Total value */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="stat-card">
          <p className="text-xs text-gray-500">Total Cost</p>
          <p className="text-xl font-bold">${totalCost.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-gray-500">Total Sell</p>
          <p className="text-xl font-bold">${totalSell.toLocaleString()}</p>
        </div>
<div className="stat-card">
          <p className="text-xs text-gray-500">Consigned Cost</p>
          <p className="text-xl font-bold text-amber-600">${consignedCost.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="text-xs text-gray-500">Consigned Sell</p>
          <p className="text-xl font-bold text-amber-600">${consignedSell.toLocaleString()}</p>
        </div>
      </div>

      {/* Summary cards: one per size group per gold type */}
      {SIZE_FILTERS.filter(f => f.value !== 'all').map(group => {
        const groupSkus = skus.filter(sku => group.match(sku.carat_size))
        if (groupSkus.length === 0) return null
        const byGold = {}
        for (const sku of groupSkus) {
          const gt = sku.gold_type
          if (!byGold[gt]) byGold[gt] = { available: 0, consigned: 0, sold: 0 }
          byGold[gt][sku.status] = (byGold[gt][sku.status] || 0) + 1
        }
        const goldTypes = Object.entries(byGold).sort((a, b) => a[0].localeCompare(b[0]))
        return (
          <div key={group.value} className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">{group.label}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {goldTypes.map(([gt, counts]) => (
                <div key={gt} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
                  <p className="font-semibold text-sm text-gray-900 mb-2">{gt === 'WG' ? 'White Gold' : gt === 'YG' ? 'Yellow Gold' : gt}</p>
                  <div className="flex gap-3 text-xs">
                    <div><span className="font-bold text-emerald-600">{counts.available}</span> <span className="text-gray-400">avail</span></div>
                    <div><span className="font-bold text-amber-600">{counts.consigned}</span> <span className="text-gray-400">out</span></div>
                    <div><span className="font-bold text-red-400">{counts.sold}</span> <span className="text-gray-400">sold</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {/* Size filter buttons */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {SIZE_FILTERS.map(f => (
          <button key={f.value}
            className={`btn btn-sm whitespace-nowrap ${filterSize === f.value ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterSize(f.value)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Search & status filter */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[140px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input className="input pl-8 w-full" placeholder="Search ID, color, clarity..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All status</option>
          <option value="available">Available</option>
          <option value="consigned">Consigned</option>
          <option value="sold">Sold</option>
        </select>
        <select className="input w-auto" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="all">All categories</option>
          {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input w-auto" value={filterFreelancer} onChange={e => setFilterFreelancer(e.target.value)}>
          <option value="all">All freelancers</option>
          {freelancers.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        {hasFilters && (
          <button className="btn btn-sm btn-secondary text-red-500" onClick={() => { setSearch(''); setFilterStatus('all'); setFilterSize('all'); setFilterCategory('all'); setFilterFreelancer('all') }}>
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {hasFilters && (
        <p className="text-xs text-gray-400 mb-3">{filtered.length} of {skus.length} items</p>
      )}

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 sm:hidden">
        {filtered.map(sku => (
          <div key={sku.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {getThumb(sku.id) ? (
                  <img src={getThumb(sku.id)} className="w-12 h-12 rounded-lg object-cover cursor-pointer"
                    onClick={() => setImageModal({ skuId: sku.id, index: 0 })} />
                ) : (
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
                    sku.gold_type === 'WG' || sku.gold_type === 'White' ? 'bg-gradient-to-br from-gray-400 to-gray-600' : 'bg-gradient-to-br from-amber-400 to-amber-600'
                  }`}>{sku.gold_type}</div>
                )}
                <div>
                  <p className="font-semibold text-sm">{sku.name}</p>
                  <p className="text-[0.65rem] text-gray-400 font-mono">{sku.item_id}</p>
                </div>
              </div>
              <span className={`badge text-xs ${STATUS_COLORS[sku.status] || STATUS_COLORS.available}`}>{sku.status === 'consigned' && consignedTo[sku.id] ? `→ ${consignedTo[sku.id]}` : sku.status}</span>
            </div>
            <div className="flex gap-5 text-xs text-gray-400 mb-3">
              <div><p className="font-semibold text-gray-700 text-sm">${sku.cost_price}</p>Cost</div>
              <div><p className="font-semibold text-gray-700 text-sm">${sku.sell_price}</p>Sell</div>
              <div className="ml-auto"><p className="font-semibold text-emerald-600 text-sm">${((sku.sell_price||0)-(sku.cost_price||0)-(sku.flat_fee||0)).toFixed(0)}</p>Margin</div>
            </div>
            <div className="flex gap-2">
              {sku.status === 'available' && (
                <button className="btn btn-success btn-sm" onClick={() => openSell(sku)}><ShoppingCart size={14} /> Sell</button>
              )}
              <button className="btn btn-secondary btn-sm flex-1" onClick={() => openEdit(sku)}><Pencil size={14} /> Edit</button>
              <button className="btn btn-sm text-red-400 hover:text-red-600 hover:bg-red-50 bg-transparent border-0 px-3" onClick={() => remove(sku.id)}><Trash2 size={14} /></button>
            </div>
          </div>
            ))}
          </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80">
              <th className="text-left px-4 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Item</th>
              <th className="text-left px-4 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">ID</th>
              <th className="text-right px-4 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Cost</th>
              <th className="text-right px-4 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Sell</th>
              <th className="text-center px-4 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Status</th>
              <th className="px-4 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(sku => (
                  <tr key={sku.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {getThumb(sku.id) ? (
                          <img src={getThumb(sku.id)} className="w-10 h-10 rounded-lg object-cover cursor-pointer"
                            onClick={() => setImageModal({ skuId: sku.id, index: 0 })} />
                        ) : (
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-[0.65rem] font-bold ${
                            sku.gold_type === 'WG' || sku.gold_type === 'White' ? 'bg-gradient-to-br from-gray-400 to-gray-600' : 'bg-gradient-to-br from-amber-400 to-amber-600'
                          }`}>{sku.gold_type}</div>
                        )}
                        <div>
                          <span className="font-semibold text-gray-900 text-sm">{sku.name}</span>
                          {(sku.color || sku.clarity) && (
                            <p className="text-[0.65rem] text-gray-400">{[sku.color, sku.clarity].filter(Boolean).join(' / ')}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-gray-500">{sku.item_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">${sku.cost_price}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-right">${sku.sell_price}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`badge text-xs ${STATUS_COLORS[sku.status] || STATUS_COLORS.available}`}>{sku.status === 'consigned' && consignedTo[sku.id] ? `→ ${consignedTo[sku.id]}` : sku.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        {sku.status === 'available' && (
                          <button className="p-2 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors" onClick={() => openSell(sku)} title="Sell"><ShoppingCart size={16} /></button>
                        )}
                        <button className="p-2 rounded-lg text-gray-400 hover:text-[#5a6340] hover:bg-[#c3cca6]/20 transition-colors" onClick={() => openEdit(sku)} title="Edit"><Pencil size={16} /></button>
                        <button className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" onClick={() => remove(sku.id)} title="Delete"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sell Modal */}
      {modal === 'sell' && sellItem && (
        <Modal title={`Sell ${sellItem.item_id}`} onClose={() => { setModal(null); setSellItem(null) }}>
          <div className="flex flex-col gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-sm font-medium">{sellItem.name}</p>
              <p className="text-xs text-gray-400">{sellItem.item_id}{sellItem.color || sellItem.clarity ? ` · ${[sellItem.color, sellItem.clarity].filter(Boolean).join(' / ')}` : ''}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Sale Price</label>
              <input type="number" min="0" step="0.01" className="input" value={sellPrice}
                onChange={e => setSellPrice(e.target.value)} />
            </div>
            <button className="btn btn-primary w-full mt-2" onClick={confirmSell}>Record Sale</button>
          </div>
        </Modal>
      )}

      {/* Edit/Add Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <Modal title={modal === 'add' ? 'Add Item' : `Edit ${form.item_id || 'Item'}`} onClose={() => setModal(null)}>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Category</label>
              <select className="input" value={form.category || ''}
                onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="">Select category...</option>
                {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Carat Size</label>
                <select className="input" value={form.carat_size}
                  onChange={e => setForm({ ...form, carat_size: e.target.value, name: `${e.target.value} / ${form.gold_type}` })}>
                  {caratOptions.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Gold Type</label>
                <select className="input" value={form.gold_type}
                  onChange={e => setForm({ ...form, gold_type: e.target.value, name: `${form.carat_size} / ${e.target.value}` })}>
                  {goldOptions.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Display Name</label>
              <input className="input" value={form.name || autoName()}
                onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Color</label>
                <input className="input" placeholder="e.g. D, E, F" value={form.color || ''}
                  onChange={e => setForm({ ...form, color: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Clarity</label>
                <input className="input" placeholder="e.g. VS1, VVS2" value={form.clarity || ''}
                  onChange={e => setForm({ ...form, clarity: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Cost ($)</label>
                <input type="number" step="0.01" className="input" value={form.cost_price}
                  onChange={e => setForm({ ...form, cost_price: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Sell ($)</label>
                <input type="number" step="0.01" className="input" value={form.sell_price}
                  onChange={e => setForm({ ...form, sell_price: e.target.value })} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Fee ($)</label>
                <input type="number" step="0.01" className="input" value={form.flat_fee}
                  onChange={e => setForm({ ...form, flat_fee: e.target.value })} />
              </div>
            </div>

            {/* Appraisal section - only show when editing */}
            {modal === 'edit' && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">Appraisal</label>
                {form.appraisal_url ? (
                  <div>
                    {form.appraisal_url.toLowerCase().endsWith('.pdf') ? (
                      <a href={form.appraisal_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100 text-sm text-[#5a6340] font-medium mb-2 hover:bg-gray-100 transition-colors">
                        <Upload size={16} /> View Appraisal PDF
                      </a>
                    ) : (
                      <img src={form.appraisal_url} className="w-full rounded-xl border border-gray-100 cursor-pointer mb-2"
                        onClick={() => window.open(form.appraisal_url, '_blank')} />
                    )}
                    <button onClick={removeAppraisal}
                      className="btn btn-sm text-red-500 btn-secondary w-full">
                      <Trash2 size={14} /> Remove Appraisal
                    </button>
                  </div>
                ) : (
                  <label className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#c3cca6] hover:bg-[#c3cca6]/5 transition-colors ${uploadingAppraisal ? 'opacity-50 pointer-events-none' : ''}`}>
                    {uploadingAppraisal ? <span className="text-sm text-gray-400">Uploading...</span> : (
                      <><Upload size={16} className="text-gray-400" /><span className="text-sm text-gray-500">Upload appraisal</span></>
                    )}
                    <input ref={appraisalRef} type="file" accept="image/*,.pdf" className="hidden" onChange={uploadAppraisal} />
                  </label>
                )}
              </div>
            )}

            {/* Images section - only show when editing */}
            {modal === 'edit' && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">Photos</label>
                {editImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {editImages.map(img => (
                      <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden border border-gray-100">
                        <img src={img.url} className="w-full h-full object-cover" />
                        <button onClick={() => removeImage(img)}
                          className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center">
                          <X size={12} className="text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#c3cca6] hover:bg-[#c3cca6]/5 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  {uploading ? <span className="text-sm text-gray-400">Uploading...</span> : (
                    <><Upload size={16} className="text-gray-400" /><span className="text-sm text-gray-500">Add photos</span></>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={uploadImages} />
                </label>
              </div>
            )}

            {/* Audit log timeline - only show when editing */}
            {modal === 'edit' && auditLog.length > 0 && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">History</label>
                <div className="bg-gray-50 rounded-xl p-3 max-h-48 overflow-y-auto">
                  {auditLog.map(log => (
                    <div key={log.id} className="flex gap-3 pb-3 mb-3 border-b border-gray-100 last:border-0 last:pb-0 last:mb-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-xs text-gray-700">{log.details || log.action}</p>
                        <p className="text-[0.65rem] text-gray-400">
                          {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {log.actor_name && ` — ${log.actor_name}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button className="btn btn-primary w-full mt-2" onClick={save}>
              {modal === 'add' ? 'Add Item' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}

      {/* Image lightbox */}
      {imageModal && images[imageModal.skuId] && (() => {
        const imgs = images[imageModal.skuId]
        const idx = imageModal.index
        return (
          <div className="modal-backdrop" onClick={() => setImageModal(null)}>
            <div className="relative max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
              <img src={imgs[idx]?.url} className="w-full rounded-2xl shadow-2xl" />
              <button onClick={() => setImageModal(null)}
                className="absolute top-3 right-3 w-10 h-10 bg-black/60 rounded-full flex items-center justify-center">
                <X size={18} className="text-white" />
              </button>
              <div className="absolute top-3 left-3 bg-black/60 text-white text-xs font-medium px-3 py-1.5 rounded-full">
                {idx + 1} / {imgs.length}
              </div>
              {idx > 0 && (
                <button onClick={() => setImageModal({ ...imageModal, index: idx - 1 })}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center transition-colors">
                  <ChevronLeft size={24} className="text-white" />
                </button>
              )}
              {idx < imgs.length - 1 && (
                <button onClick={() => setImageModal({ ...imageModal, index: idx + 1 })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center transition-colors">
                  <ChevronRight size={24} className="text-white" />
                </button>
              )}
              {imgs.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                  {imgs.map((_, i) => (
                    <button key={i} onClick={() => setImageModal({ ...imageModal, index: i })}
                      className={`h-2 rounded-full transition-all ${i === idx ? 'bg-white w-6' : 'bg-white/50 w-2'}`} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
