import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Package } from 'lucide-react'

export default function MyStock() {
  const { user } = useAuth()
  const [consignments, setConsignments] = useState([])

  useEffect(() => {
    if (user) load()
  }, [user])

  async function load() {
    const { data } = await supabase
      .from('consignments')
      .select('*, skus(name, carat_size, gold_type)')
      .eq('freelancer_id', user.id)
      .order('created_at', { ascending: false })
    setConsignments(data || [])
  }

  const total = consignments.reduce((s, c) => s + c.quantity, 0)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">My Stock</h1>

      <div className="stat-card mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#c3cca6] w-10 h-10 rounded-xl flex items-center justify-center text-white">
            <Package size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Items</p>
            <p className="text-xl font-bold">{total}</p>
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
                  {c.skus?.carat_size} / {c.skus?.gold_type} Gold
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Assigned {new Date(c.created_at).toLocaleDateString()}
                </p>
              </div>
              <span className="badge badge-info text-lg px-4 py-1">{c.quantity}</span>
            </div>
          </div>
        ))}
        {consignments.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">No stock assigned to you</p>
        )}
      </div>
    </div>
  )
}
