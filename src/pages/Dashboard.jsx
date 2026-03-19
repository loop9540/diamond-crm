import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Loader from '../components/Loader'
import { Package, Users, ShoppingCart, DollarSign, AlertCircle, ArrowLeftRight } from 'lucide-react'

function StatCard({ icon: Icon, label, value, color = 'sage', onClick }) {
  const colors = {
    sage: 'bg-[#c3cca6] text-[#3a4025]',
    emerald: 'bg-emerald-500 text-white',
    amber: 'bg-amber-500 text-white',
    rose: 'bg-rose-500 text-white',
    blue: 'bg-blue-500 text-white',
    purple: 'bg-purple-500 text-white',
  }
  return (
    <div className="stat-card cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all active:scale-100" onClick={onClick}>
      <div className="flex items-center gap-3">
        <div className={`${colors[color]} w-10 h-10 rounded-xl flex items-center justify-center shrink-0`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-400 truncate">{label}</p>
          <p className="text-xl font-bold mt-0.5">{value}</p>
        </div>
      </div>
    </div>
  )
}

const RANGES = [
  { label: 'This Month', value: 'month' },
  { label: 'This Week', value: 'week' },
  { label: 'Today', value: 'today' },
  { label: 'All Time', value: 'all' },
]

function getDateFrom(range) {
  const now = new Date()
  if (range === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (range === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - d.getDay())
    d.setHours(0, 0, 0, 0)
    return d
  }
  if (range === 'month') return new Date(now.getFullYear(), now.getMonth(), 1)
  return null // all time
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('all')
  const [allSales, setAllSales] = useState([])
  const [stats, setStats] = useState({
    totalInventory: 0, freelancers: 0, totalSales: 0,
    revenue: 0, unpaid: 0, consigned: 0,
  })

  useEffect(() => {
    async function load() {
      const [inv, freelancers, sales, consignments] = await Promise.all([
        supabase.from('skus').select('quantity_available'),
        supabase.from('profiles').select('id').eq('role', 'freelancer'),
        supabase.from('sales').select('quantity, sale_price, payment_status, created_at'),
        supabase.from('consignments').select('quantity'),
      ])
      setAllSales(sales.data || [])
      setStats(prev => ({
        ...prev,
        totalInventory: (inv.data || []).reduce((s, r) => s + (r.quantity_available || 0), 0),
        freelancers: (freelancers.data || []).length,
        consigned: (consignments.data || []).reduce((s, r) => s + (r.quantity || 0), 0),
      }))
      setLoading(false)
    }
    load()
  }, [])

  // Recalculate sales stats when range changes
  useEffect(() => {
    const dateFrom = getDateFrom(range)
    const filtered = dateFrom
      ? allSales.filter(s => new Date(s.created_at) >= dateFrom)
      : allSales

    setStats(prev => ({
      ...prev,
      totalSales: filtered.reduce((s, r) => s + (r.quantity || 0), 0),
      revenue: filtered.reduce((s, r) => s + (r.sale_price || 0) * (r.quantity || 0), 0),
      unpaid: filtered.filter(r => r.payment_status === 'unpaid')
        .reduce((s, r) => s + (r.sale_price || 0) * (r.quantity || 0), 0),
    }))
  }, [range, allSales])

  if (loading) return <div className="mt-4"><Loader rows={3} /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl">Dashboard</h1>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button key={r.value}
              onClick={() => setRange(r.value)}
              className={`btn btn-sm ${range === r.value ? 'btn-primary' : 'btn-secondary'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard icon={Package} label="In Stock" value={stats.totalInventory} color="sage" onClick={() => navigate('/inventory')} />
        <StatCard icon={ArrowLeftRight} label="Consigned" value={stats.consigned} color="purple" onClick={() => navigate('/consignments')} />
        <StatCard icon={Users} label="Freelancers" value={stats.freelancers} color="blue" onClick={() => navigate('/freelancers')} />
        <StatCard icon={ShoppingCart} label="Total Sales" value={stats.totalSales} color="emerald" onClick={() => navigate('/sales')} />
        <StatCard icon={DollarSign} label="Revenue" value={`$${stats.revenue.toLocaleString()}`} color="amber" onClick={() => navigate('/reports')} />
        <StatCard icon={AlertCircle} label="Unpaid" value={`$${stats.unpaid.toLocaleString()}`} color="rose" onClick={() => navigate('/reports')} />
      </div>
    </div>
  )
}
