import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import Modal from '../components/Modal'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const CARAT_SIZES = ['1ct', '1.5ct', '2ct']
const GOLD_TYPES = ['WG', 'YG']

const emptySku = {
  name: '', carat_size: '1ct', gold_type: 'WG',
  cost_price: '', sell_price: '', flat_fee: '', quantity_available: 0
}

export default function Inventory() {
  const [skus, setSkus] = useState([])
  const [modal, setModal] = useState(null) // null | 'add' | 'edit'
  const [form, setForm] = useState(emptySku)
  const [editId, setEditId] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('skus').select('*').order('gold_type').order('carat_size')
    setSkus(data || [])
  }

  function openAdd() {
    setForm(emptySku)
    setModal('add')
  }

  function openEdit(sku) {
    setForm(sku)
    setEditId(sku.id)
    setModal('edit')
  }

  async function save() {
    const payload = {
      ...form,
      cost_price: parseFloat(form.cost_price) || 0,
      sell_price: parseFloat(form.sell_price) || 0,
      flat_fee: parseFloat(form.flat_fee) || 0,
      quantity_available: parseInt(form.quantity_available) || 0,
    }
    if (modal === 'add') {
      await supabase.from('skus').insert(payload)
    } else {
      const { id, created_at, ...rest } = payload
      await supabase.from('skus').update(rest).eq('id', editId)
    }
    setModal(null)
    load()
  }

  async function remove(id) {
    if (!confirm('Delete this SKU?')) return
    await supabase.from('skus').delete().eq('id', id)
    load()
  }

  function autoName() {
    return `${form.carat_size} / ${form.gold_type}`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <Plus size={16} /> Add SKU
        </button>
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-3 sm:hidden">
        {skus.map(sku => (
          <div key={sku.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
                  sku.gold_type === 'WG' || sku.gold_type === 'White' ? 'bg-gradient-to-br from-gray-400 to-gray-600' : 'bg-gradient-to-br from-amber-400 to-amber-600'
                }`}>{sku.gold_type}</div>
                <div>
                  <p className="font-semibold text-sm">{sku.name}</p>
                </div>
              </div>
              <span className={`text-xl font-bold ${sku.quantity_available > 0 ? 'text-emerald-500' : 'text-red-400'}`}>{sku.quantity_available}</span>
            </div>
            <div className="flex gap-5 text-xs text-gray-400 mb-3">
              <div><p className="font-semibold text-gray-700 text-sm">${sku.cost_price}</p>Cost</div>
              <div><p className="font-semibold text-gray-700 text-sm">${sku.sell_price}</p>Sell</div>
              <div><p className="font-semibold text-gray-700 text-sm">${sku.flat_fee}</p>Fee</div>
              <div className="ml-auto"><p className="font-semibold text-emerald-600 text-sm">${((sku.sell_price||0)-(sku.cost_price||0)-(sku.flat_fee||0)).toFixed(0)}</p>Margin</div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm flex-1" onClick={() => openEdit(sku)}><Pencil size={14} /> Edit</button>
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
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Product</th>
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Carat</th>
              <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Gold</th>
              <th className="text-right px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Cost</th>
              <th className="text-right px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Sell</th>
              <th className="text-right px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Fee</th>
              <th className="text-right px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Margin</th>
              <th className="text-center px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">Qty</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {skus.map(sku => (
              <tr key={sku.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-[0.65rem] font-bold ${
                      sku.gold_type === 'WG' || sku.gold_type === 'White' ? 'bg-gradient-to-br from-gray-400 to-gray-600' : 'bg-gradient-to-br from-amber-400 to-amber-600'
                    }`}>{sku.gold_type}</div>
                    <span className="font-semibold text-gray-900 text-sm">{sku.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{sku.carat_size}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{sku.gold_type}</td>
                <td className="px-6 py-4 text-sm text-gray-600 text-right">${sku.cost_price}</td>
                <td className="px-6 py-4 text-sm text-gray-600 text-right">${sku.sell_price}</td>
                <td className="px-6 py-4 text-sm text-gray-600 text-right">${sku.flat_fee}</td>
                <td className="px-6 py-4 text-sm font-semibold text-emerald-600 text-right">
                  ${((sku.sell_price||0)-(sku.cost_price||0)-(sku.flat_fee||0)).toFixed(0)}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl text-sm font-bold ${
                    sku.quantity_available > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                  }`}>{sku.quantity_available}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-1 justify-end">
                    <button className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" onClick={() => openEdit(sku)}>
                      <Pencil size={16} />
                    </button>
                    <button className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" onClick={() => remove(sku.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <Modal title={modal === 'add' ? 'Add SKU' : 'Edit SKU'} onClose={() => setModal(null)}>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Carat Size</label>
                <select className="input" value={form.carat_size}
                  onChange={e => setForm({ ...form, carat_size: e.target.value, name: `${e.target.value} / ${form.gold_type}` })}>
                  {CARAT_SIZES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Gold Type</label>
                <select className="input" value={form.gold_type}
                  onChange={e => setForm({ ...form, gold_type: e.target.value, name: `${form.carat_size} / ${e.target.value}` })}>
                  {GOLD_TYPES.map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Display Name</label>
              <input className="input" value={form.name || autoName()}
                onChange={e => setForm({ ...form, name: e.target.value })} />
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
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Quantity Available</label>
              <input type="number" className="input" value={form.quantity_available}
                onChange={e => setForm({ ...form, quantity_available: e.target.value })} />
            </div>
            <button className="btn btn-primary w-full mt-2" onClick={save}>
              {modal === 'add' ? 'Add SKU' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
