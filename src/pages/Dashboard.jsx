import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Loader from '../components/Loader'
import { Package, Users, ShoppingCart, DollarSign, AlertCircle, ArrowLeftRight, Trophy, TrendingUp } from 'lucide-react'

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

const MEDALS = ['🥇', '🥈', '🥉']

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
  return null
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('all')
  const [allSales, setAllSales] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [stats, setStats] = useState({
    totalInventory: 0, freelancers: 0, totalSales: 0,
    revenue: 0, unpaid: 0, consigned: 0,
  })

  useEffect(() => {
    async function load() {
      const [inv, freelancers, sales, consignments] = await Promise.all([
        supabase.from('skus').select('quantity_available'),
        supabase.from('profiles').select('id, name').eq('role', 'freelancer'),
        supabase.from('sales').select('quantity, sale_price, payment_status, created_at, freelancer_id, skus(flat_fee)'),
        supabase.from('consignments').select('quantity'),
      ])

      const freelancerMap = {}
      for (const f of freelancers.data || []) {
        freelancerMap[f.id] = { name: f.name, sales: 0, revenue: 0, fees: 0 }
      }

      setAllSales(sales.data || [])
      setStats(prev => ({
        ...prev,
        totalInventory: (inv.data || []).reduce((s, r) => s + (r.quantity_available || 0), 0),
        freelancers: (freelancers.data || []).length,
        consigned: (consignments.data || []).reduce((s, r) => s + (r.quantity || 0), 0),
        _freelancerMap: freelancerMap,
      }))
      setLoading(false)
    }
    load()
  }, [])

  // Recalculate sales stats + leaderboard when range changes
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

    // Build leaderboard
    if (stats._freelancerMap) {
      const board = {}
      for (const [id, f] of Object.entries(stats._freelancerMap)) {
        board[id] = { ...f, sales: 0, revenue: 0, fees: 0 }
      }
      for (const s of filtered) {
        if (s.freelancer_id && board[s.freelancer_id]) {
          board[s.freelancer_id].sales += s.quantity || 0
          board[s.freelancer_id].revenue += (s.sale_price || 0) * (s.quantity || 0)
          board[s.freelancer_id].fees += (s.skus?.flat_fee || 0) * (s.quantity || 0)
        }
      }
      const sorted = Object.values(board)
        .filter(f => f.sales > 0)
        .sort((a, b) => b.revenue - a.revenue)
      setLeaderboard(sorted)
    }
  }, [range, allSales, stats._freelancerMap])

  if (loading) return <div className="mt-4"><Loader rows={3} /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl">Dashboard</h1>
        <div className="flex gap-1 overflow-x-auto">
          {RANGES.map(r => (
            <button key={r.value}
              onClick={() => setRange(r.value)}
              className={`btn btn-sm ${range === r.value ? 'btn-primary' : 'btn-secondary'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <StatCard icon={Package} label="In Stock" value={stats.totalInventory} color="sage" onClick={() => navigate('/inventory')} />
        <StatCard icon={ArrowLeftRight} label="Consigned" value={stats.consigned} color="purple" onClick={() => navigate('/consignments')} />
        <StatCard icon={Users} label="Freelancers" value={stats.freelancers} color="blue" onClick={() => navigate('/freelancers')} />
        <StatCard icon={ShoppingCart} label="Total Sales" value={stats.totalSales} color="emerald" onClick={() => navigate('/sales')} />
        <StatCard icon={DollarSign} label="Revenue" value={`$${stats.revenue.toLocaleString()}`} color="amber" onClick={() => navigate('/reports')} />
        <StatCard icon={AlertCircle} label="Unpaid" value={`$${stats.unpaid.toLocaleString()}`} color="rose" onClick={() => navigate('/reports')} />
      </div>

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-2 border-b border-gray-50">
            <Trophy size={20} className="text-amber-500" />
            <h2 className="text-lg font-semibold m-0" style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>
              Top Sellers
            </h2>
            <span className="text-xs text-gray-400 ml-1">
              {range === 'all' ? 'All Time' : range === 'month' ? 'This Month' : range === 'week' ? 'This Week' : 'Today'}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {leaderboard.map((f, i) => {
              const isTop3 = i < 3
              const barWidth = leaderboard[0].revenue > 0
                ? Math.max(8, (f.revenue / leaderboard[0].revenue) * 100)
                : 0
              return (
                <div key={f.name} className={`px-5 py-3 flex items-center gap-4 transition-colors ${isTop3 ? 'hover:bg-amber-50/30' : 'hover:bg-gray-50/50'}`}>
                  {/* Rank */}
                  <div className="w-8 text-center shrink-0">
                    {isTop3 ? (
                      <span className="text-2xl">{MEDALS[i]}</span>
                    ) : (
                      <span className="text-sm font-bold text-gray-300">#{i + 1}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    i === 0 ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-md shadow-amber-200' :
                    i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' :
                    i === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-500 text-white' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {f.name?.charAt(0)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm truncate ${isTop3 ? 'font-bold' : 'font-medium'}`}>{f.name}</p>
                      {i === 0 && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">MVP</span>}
                    </div>
                    {/* Progress bar */}
                    <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          i === 0 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                          i === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400' :
                          i === 2 ? 'bg-gradient-to-r from-orange-300 to-orange-400' :
                          'bg-[#c3cca6]'
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="text-right shrink-0">
                    <p className={`text-sm ${isTop3 ? 'font-bold' : 'font-medium'}`}>${f.revenue.toLocaleString()}</p>
                    <p className="text-[0.65rem] text-gray-400">{f.sales} sales · ${f.fees.toLocaleString()} fees</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {leaderboard.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <Trophy size={32} className="text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No sales yet for this period</p>
        </div>
      )}
    </div>
  )
}
