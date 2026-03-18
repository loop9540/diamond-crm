import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { ShoppingCart, CheckCircle, Clock } from 'lucide-react'

export default function MySales() {
  const { user } = useAuth()
  const [sales, setSales] = useState([])

  useEffect(() => {
    if (user) load()
  }, [user])

  async function load() {
    const { data } = await supabase
      .from('sales')
      .select('*, skus(name, flat_fee), clients(name)')
      .eq('freelancer_id', user.id)
      .order('created_at', { ascending: false })
    setSales(data || [])
  }

  const totalSales = sales.reduce((s, r) => s + r.quantity, 0)
  const totalFees = sales.reduce((s, r) => s + r.quantity * (r.skus?.flat_fee || 0), 0)

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">My Sales</h1>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 w-10 h-10 rounded-xl flex items-center justify-center text-white">
              <ShoppingCart size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Sales</p>
              <p className="text-xl font-bold">{totalSales}</p>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 w-10 h-10 rounded-xl flex items-center justify-center text-white">
              <ShoppingCart size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-500">Fees Earned</p>
              <p className="text-xl font-bold">${totalFees.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {sales.map(s => (
          <div key={s.id} className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-sm">{s.skus?.name}</p>
                <p className="text-xs text-gray-500">
                  {s.client_type === 'individual' ? 'Individual' : s.clients?.name}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(s.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <span className={`badge ${s.payment_status === 'paid' ? 'badge-success' : 'badge-warning'}`}>
                  {s.payment_status === 'paid' ? <CheckCircle size={12} className="mr-1" /> : <Clock size={12} className="mr-1" />}
                  {s.payment_status}
                </span>
                <p className="text-xs text-gray-500 mt-1">{s.quantity} pcs</p>
                <p className="text-xs font-medium mt-0.5">Fee: ${(s.quantity * (s.skus?.flat_fee || 0)).toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
        {sales.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-8">No sales yet</p>
        )}
      </div>
    </div>
  )
}
