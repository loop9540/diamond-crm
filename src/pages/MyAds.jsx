import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { Copy, Check, Megaphone } from 'lucide-react'
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
      supabase.from('consignments').select('*, skus(name, carat_size, gold_type, sell_price, color, clarity, item_id, appraisal_url)').eq('freelancer_id', user.id).order('created_at', { ascending: false }),
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

  async function copyAd(consignmentId, text) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(consignmentId)
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
        {consignments.map(c => {
          const ad = generateAd(c.skus)
          const itemImages = images[c.sku_id] || []
          return (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">{c.skus?.name}</p>
                  <p className="text-xs text-gray-400">
                    {c.skus?.item_id} &middot; {c.skus?.color} / {c.skus?.clarity}
                  </p>
                </div>
                <span className="text-lg font-bold text-[#5a6340]">${c.skus?.sell_price}</span>
              </div>

              {/* Images */}
              {itemImages.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                  {itemImages.map(img => (
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
                className={`btn w-full ${copied === c.id ? 'btn-success' : 'btn-primary'}`}
                onClick={() => copyAd(c.id, ad)}>
                {copied === c.id ? (
                  <><Check size={16} /> Copied!</>
                ) : (
                  <><Copy size={16} /> Copy Ad</>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {consignments.length === 0 && (
        <div className="text-center py-12">
          <Megaphone size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 text-sm">No stock to advertise</p>
        </div>
      )}
    </div>
  )
}
