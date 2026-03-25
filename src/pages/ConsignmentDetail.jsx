import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, RotateCcw, ShoppingCart, Package } from 'lucide-react'
import Loader from '../components/Loader'
import { useToast } from '../components/Toast'
import { pop } from '../lib/celebrate'
import { freelancerColor } from '../lib/colors'
import { logAction } from '../lib/audit'

export default function ConsignmentDetail() {
  const { freelancerId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [consignments, setConsignments] = useState([])
  const [freelancer, setFreelancer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [freelancerId])

  async function load() {
    const [c, f] = await Promise.all([
      supabase.from('consignments').select('*, skus(id, item_id, name, color, clarity)').eq('freelancer_id', freelancerId).order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, name').eq('id', freelancerId).single(),
    ])
    setConsignments(c.data || [])
    setFreelancer(f.data)
    setLoading(false)
  }

  async function returnItem(consignment) {
    await supabase.from('consignments').delete().eq('id', consignment.id)
    await supabase.from('skus').update({ status: 'available' }).eq('id', consignment.sku_id)
    await logAction({ sku_id: consignment.sku_id, item_id: consignment.skus?.item_id, action: 'returned', details: `Returned from ${freelancer?.name}` })
    toast('Item returned to inventory')
    pop()
    load()
  }

  const color = freelancerColor(freelancer?.name)

  if (loading) return <div className="mt-4"><Loader rows={3} /></div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/consignments')} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold"
            style={{ background: `linear-gradient(135deg, ${color.from}, ${color.to})` }}>
            {freelancer?.name?.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{freelancer?.name}</h1>
            <p className="text-xs text-gray-400">{consignments.length} item{consignments.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <span className="text-sm text-gray-500">Total Items</span>
        <span className="text-2xl font-bold text-[#5a6340]">{consignments.length}</span>
      </div>

      <div className="flex flex-col gap-3">
        {consignments.map(c => (
          <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[#c3cca6]/20 text-[#5a6340] font-bold">{c.skus?.item_id}</span>
                  <p className="font-semibold text-gray-900">{c.skus?.name}</p>
                </div>
                <div className="flex gap-3 mt-1">
                  {c.skus?.color && (
                    <p className="text-xs text-gray-400">Color: <span className="text-gray-600">{c.skus.color}</span></p>
                  )}
                  {c.skus?.clarity && (
                    <p className="text-xs text-gray-400">Clarity: <span className="text-gray-600">{c.skus.clarity}</span></p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm flex-1" onClick={() => returnItem(c)}>
                <RotateCcw size={14} /> Return
              </button>
              <button className="btn btn-success btn-sm flex-1" onClick={() => navigate(`/sales?freelancer=${freelancerId}&sku=${c.sku_id}`)}>
                <ShoppingCart size={14} /> Sale
              </button>
            </div>
          </div>
        ))}
      </div>

      {consignments.length === 0 && (
        <div className="text-center py-12">
          <Package size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 text-sm">No active consignments</p>
        </div>
      )}
    </div>
  )
}
