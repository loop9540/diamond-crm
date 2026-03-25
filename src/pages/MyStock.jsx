import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import { useToast } from '../components/Toast'
import { Package, ShoppingCart, Copy, Check, FileText } from 'lucide-react'
import { saleCelebration } from '../lib/celebrate'
import { getAdTemplate } from './Settings'
import { logAction } from '../lib/audit'

export default function MyStock() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const [consignments, setConsignments] = useState([])
  const [modal, setModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [salePrice, setSalePrice] = useState('')
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    if (user) load()
  }, [user])

  async function load() {
    const { data } = await supabase
      .from('consignments')
      .select('*, skus(name, carat_size, gold_type, sell_price, color, clarity, appraisal_url, item_id)')
      .eq('freelancer_id', user.id)
      .order('created_at', { ascending: false })
    setConsignments(data || [])
  }

  function generateAd(sku) {
    const template = getAdTemplate()
    return template
      .replace(/\{name\}/g, sku.name || '')
      .replace(/\{carat\}/g, sku.carat_size || '')
      .replace(/\{gold_type\}/g, sku.gold_type || '')
      .replace(/\{price\}/g, sku.sell_price?.toString() || '')
      .replace(/\{color\}/g, sku.color || '')
      .replace(/\{clarity\}/g, sku.clarity || '')
  }

  async function copyAd(consignmentId, sku) {
    try {
      await navigator.clipboard.writeText(generateAd(sku))
      setCopied(consignmentId)
      toast('Ad copied!')
      setTimeout(() => setCopied(null), 2000)
    } catch {
      toast('Failed to copy', 'error')
    }
  }

  function openSale(consignment) {
    setSelectedItem(consignment)
    setSalePrice(consignment.skus?.sell_price || '')
    setModal('sale')
  }

  async function reportSale() {
    const price = parseFloat(salePrice)
    if (!selectedItem) return
    if (!price || price <= 0) {
      toast('Please enter a valid sale price', 'error')
      return
    }

    // Create sale with quantity=1
    await supabase.from('sales').insert({
      freelancer_id: user.id,
      sku_id: selectedItem.sku_id,
      client_type: 'freelancer',
      quantity: 1,
      sale_price: price,
      payment_status: 'unpaid',
    })

    // Delete the consignment record
    await supabase.from('consignments').delete().eq('id', selectedItem.id)

    // Set SKU status to sold
    await supabase.from('skus').update({ status: 'sold' }).eq('id', selectedItem.sku_id)

    await logAction({ sku_id: selectedItem.sku_id, item_id: selectedItem.skus?.item_id, action: 'sold', actor_name: profile?.name, details: `Sold for $${price} by ${profile?.name} (unpaid)` })

    setModal(false)
    setSelectedItem(null)
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
            <p className="text-xl font-bold">{consignments.length}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {consignments.map(c => (
          <div key={c.id} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{c.skus?.name}</p>
                <p className="text-xs text-gray-500">
                  {c.skus?.item_id} &middot; {c.skus?.carat_size} / {c.skus?.gold_type} Gold
                </p>
                <p className="text-xs text-gray-400">
                  {c.skus?.color} / {c.skus?.clarity}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {c.skus?.appraisal_url && (
                  <button className="btn btn-secondary btn-sm" onClick={() => window.open(c.skus.appraisal_url, '_blank')}>
                    <FileText size={14} />
                  </button>
                )}
                <button className={`btn btn-sm ${copied === c.id ? 'btn-success' : 'btn-secondary'}`} onClick={() => copyAd(c.id, c.skus)}>
                  {copied === c.id ? <Check size={14} /> : <Copy size={14} />} {copied === c.id ? 'Copied' : 'Ad'}
                </button>
                <button className="btn btn-success btn-sm" onClick={() => openSale(c)}>
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

      {modal === 'sale' && selectedItem && (
        <Modal title="Report a Sale" onClose={() => setModal(false)}>
          <div className="flex flex-col gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-sm font-medium">{selectedItem.skus?.name}</p>
              <p className="text-xs text-gray-400">
                {selectedItem.skus?.item_id} &middot; {selectedItem.skus?.color} / {selectedItem.skus?.clarity}
              </p>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Sale Price</label>
              <input type="number" min="0" step="0.01" className="input" value={salePrice}
                onChange={e => setSalePrice(e.target.value)} />
            </div>
            <button className="btn btn-primary w-full mt-2" onClick={reportSale}>Report Sale</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
