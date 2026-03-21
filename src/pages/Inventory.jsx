import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import Loader from '../components/Loader'
import { useToast } from '../components/Toast'
import { sparkle } from '../lib/celebrate'
import { Plus, Pencil, Trash2, Upload, X, ChevronLeft, ChevronRight, Copy } from 'lucide-react'
import { getCaratSizes, getGoldTypes } from './Settings'

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
  const [editImages, setEditImages] = useState([])
  const [uploading, setUploading] = useState(false)
  const [imageModal, setImageModal] = useState(null)
  const fileRef = useRef()
  const appraisalRef = useRef()
  const [uploadingAppraisal, setUploadingAppraisal] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const [skuRes, imgRes] = await Promise.all([
      supabase.from('skus').select('*').order('name').order('item_id'),
      supabase.from('sku_images').select('*').order('position'),
    ])
    setSkus(skuRes.data || [])

    const imgMap = {}
    for (const img of imgRes.data || []) {
      if (!imgMap[img.sku_id]) imgMap[img.sku_id] = []
      imgMap[img.sku_id].push(img)
    }
    setImages(imgMap)
    setLoading(false)
  }

  function openAdd() {
    setForm(emptySku)
    setEditImages([])
    setModal('add')
  }

  function openEdit(sku) {
    setForm(sku)
    setEditId(sku.id)
    setEditImages(images[sku.id] || [])
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
      await supabase.from('skus').insert(rest)
    } else {
      const { id, created_at, item_id, ...rest } = payload
      await supabase.from('skus').update(rest).eq('id', editId)
    }
    setModal(null)
    toast(modal === 'add' ? 'Item added' : 'Item updated')
    if (modal === 'add') sparkle()
    load()
  }

  async function duplicate(sku) {
    const { id, created_at, item_id, ...fields } = sku
    await supabase.from('skus').insert({ ...fields, status: 'available', quantity_available: 1 })
    toast('Item duplicated')
    sparkle()
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

  if (loading) return <div className="mt-4"><Loader rows={3} /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-4xl">Inventory</h1>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <Plus size={16} /> Add Item
        </button>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 sm:hidden">
        {skus.map(sku => (
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
              <span className={`badge text-xs ${STATUS_COLORS[sku.status] || STATUS_COLORS.available}`}>{sku.status}</span>
            </div>
            <div className="flex gap-5 text-xs text-gray-400 mb-3">
              <div><p className="font-semibold text-gray-700 text-sm">${sku.cost_price}</p>Cost</div>
              <div><p className="font-semibold text-gray-700 text-sm">${sku.sell_price}</p>Sell</div>
              <div className="ml-auto"><p className="font-semibold text-emerald-600 text-sm">${((sku.sell_price||0)-(sku.cost_price||0)-(sku.flat_fee||0)).toFixed(0)}</p>Margin</div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm flex-1" onClick={() => openEdit(sku)}><Pencil size={14} /> Edit</button>
              <button className="btn btn-secondary btn-sm" onClick={() => duplicate(sku)}><Copy size={14} /></button>
              <button className="btn btn-sm text-red-400 hover:text-red-600 hover:bg-red-50 bg-transparent border-0 px-3" onClick={() => remove(sku.id)}><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80">
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Item</th>
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">ID</th>
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Color</th>
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Clarity</th>
              <th className="text-right px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Cost</th>
              <th className="text-right px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Sell</th>
              <th className="text-right px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Margin</th>
              <th className="text-center px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Status</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {skus.map(sku => (
              <tr key={sku.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {getThumb(sku.id) ? (
                      <img src={getThumb(sku.id)} className="w-10 h-10 rounded-lg object-cover cursor-pointer"
                        onClick={() => setImageModal({ skuId: sku.id, index: 0 })} />
                    ) : (
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-[0.65rem] font-bold ${
                        sku.gold_type === 'WG' || sku.gold_type === 'White' ? 'bg-gradient-to-br from-gray-400 to-gray-600' : 'bg-gradient-to-br from-amber-400 to-amber-600'
                      }`}>{sku.gold_type}</div>
                    )}
                    <span className="font-semibold text-gray-900 text-sm">{sku.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs font-mono text-gray-500">{sku.item_id}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{sku.color || '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{sku.clarity || '—'}</td>
                <td className="px-6 py-4 text-sm text-gray-600 text-right">${sku.cost_price}</td>
                <td className="px-6 py-4 text-sm text-gray-600 text-right">${sku.sell_price}</td>
                <td className="px-6 py-4 text-sm font-semibold text-emerald-600 text-right">
                  ${((sku.sell_price||0)-(sku.cost_price||0)-(sku.flat_fee||0)).toFixed(0)}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`badge text-xs ${STATUS_COLORS[sku.status] || STATUS_COLORS.available}`}>{sku.status}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-1 justify-end">
                    <button className="p-2 rounded-lg text-gray-400 hover:text-[#5a6340] hover:bg-[#c3cca6]/20 transition-colors" onClick={() => duplicate(sku)} title="Duplicate"><Copy size={16} /></button>
                    <button className="p-2 rounded-lg text-gray-400 hover:text-[#5a6340] hover:bg-[#c3cca6]/20 transition-colors" onClick={() => openEdit(sku)}><Pencil size={16} /></button>
                    <button className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" onClick={() => remove(sku.id)}><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit/Add Modal */}
      {modal && (
        <Modal title={modal === 'add' ? 'Add Item' : `Edit ${form.item_id || 'Item'}`} onClose={() => setModal(null)}>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Carat Size</label>
                <select className="input" value={form.carat_size}
                  onChange={e => setForm({ ...form, carat_size: e.target.value, name: `${e.target.value} / ${form.gold_type}` })}>
                  {getCaratSizes().map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Gold Type</label>
                <select className="input" value={form.gold_type}
                  onChange={e => setForm({ ...form, gold_type: e.target.value, name: `${form.carat_size} / ${e.target.value}` })}>
                  {getGoldTypes().map(g => <option key={g}>{g}</option>)}
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
                  <div className="relative group">
                    <img src={form.appraisal_url} className="w-full rounded-xl border border-gray-100 cursor-pointer"
                      onClick={() => window.open(form.appraisal_url, '_blank')} />
                    <button onClick={removeAppraisal}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={14} className="text-white" />
                    </button>
                  </div>
                ) : (
                  <label className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#c3cca6] hover:bg-[#c3cca6]/5 transition-colors ${uploadingAppraisal ? 'opacity-50 pointer-events-none' : ''}`}>
                    {uploadingAppraisal ? <span className="text-sm text-gray-400">Uploading...</span> : (
                      <><Upload size={16} className="text-gray-400" /><span className="text-sm text-gray-500">Upload appraisal</span></>
                    )}
                    <input ref={appraisalRef} type="file" accept="image/*" className="hidden" onChange={uploadAppraisal} />
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
                      <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-100">
                        <img src={img.url} className="w-full h-full object-cover" />
                        <button onClick={() => removeImage(img)}
                          className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
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
