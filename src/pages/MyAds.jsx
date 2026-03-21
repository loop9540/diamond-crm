import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { Copy, Check, Megaphone, Download } from 'lucide-react'
import { getAdTemplate } from './Settings'

export default function MyAds() {
  const { user } = useAuth()
  const toast = useToast()
  const [consignments, setConsignments] = useState([])
  const [images, setImages] = useState({})
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    if (user) load()
  }, [user])

  async function load() {
    const [c, img] = await Promise.all([
      supabase.from('consignments').select('*, skus(name, carat_size, gold_type, sell_price, color, clarity)').eq('freelancer_id', user.id).order('created_at', { ascending: false }),
      supabase.from('sku_images').select('*').order('position'),
    ])
    setConsignments(c.data || [])

    const imgMap = {}
    for (const i of img.data || []) {
      if (!imgMap[i.sku_id]) imgMap[i.sku_id] = []
      imgMap[i.sku_id].push(i)
    }
    setImages(imgMap)
  }

  // Group by SKU
  const grouped = {}
  for (const c of consignments) {
    if (!grouped[c.sku_id]) {
      grouped[c.sku_id] = { sku_id: c.sku_id, sku: c.skus, totalQty: 0 }
    }
    grouped[c.sku_id].totalQty += c.quantity
  }
  const skuGroups = Object.values(grouped).sort((a, b) => (a.sku?.name || '').localeCompare(b.sku?.name || ''))

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

  async function copyAd(skuId, text) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(skuId)
      toast('Ad copied!')
      setTimeout(() => setCopied(null), 2000)
    } catch {
      toast('Failed to copy', 'error')
    }
  }

  return (
    <div>
      <h1 className="text-4xl mb-4">My Ads</h1>

      <div className="flex flex-col gap-4">
        {skuGroups.map(g => {
          const ad = generateAd(g.sku)
          const skuImages = images[g.sku_id] || []
          return (
            <div key={g.sku_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">{g.sku?.name}</p>
                  <p className="text-xs text-gray-400">{g.totalQty} in stock</p>
                </div>
                <span className="text-lg font-bold text-[#5a6340]">${g.sku?.sell_price}</span>
              </div>

              {/* Images */}
              {skuImages.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                  {skuImages.map(img => (
                    <a key={img.id} href={img.url} download target="_blank" rel="noopener noreferrer"
                      className="shrink-0">
                      <img src={img.url} className="w-20 h-20 rounded-xl object-cover border border-gray-100" />
                    </a>
                  ))}
                  <p className="text-[0.6rem] text-gray-400 self-end shrink-0 pb-1">Tap to save</p>
                </div>
              )}

              {/* Ad preview */}
              <div className="bg-gray-50 rounded-xl p-3 mb-3">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed m-0">{ad}</pre>
              </div>

              {/* Copy button */}
              <button
                className={`btn w-full ${copied === g.sku_id ? 'btn-success' : 'btn-primary'}`}
                onClick={() => copyAd(g.sku_id, ad)}>
                {copied === g.sku_id ? (
                  <><Check size={16} /> Copied!</>
                ) : (
                  <><Copy size={16} /> Copy Ad</>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {skuGroups.length === 0 && (
        <div className="text-center py-12">
          <Megaphone size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 text-sm">No stock to advertise</p>
        </div>
      )}
    </div>
  )
}
