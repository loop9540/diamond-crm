import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Package, Users, ShoppingCart, DollarSign, AlertCircle, ArrowLeftRight } from 'lucide-react'

function StatCard({ icon: Icon, label, value, color = 'sage' }) {
  const colors = {
    sage: 'bg-[#c3cca6] text-[#3a4025]',
    emerald: 'bg-emerald-500 text-white',
    amber: 'bg-amber-500 text-white',
    rose: 'bg-rose-500 text-white',
    blue: 'bg-blue-500 text-white',
    purple: 'bg-purple-500 text-white',
  }
  return (
    <div className="stat-card">
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

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalInventory: 0,
    freelancers: 0,
    totalSales: 0,
    revenue: 0,
    unpaid: 0,
    consigned: 0,
  })

  useEffect(() => {
    async function load() {
      const [inv, freelancers, sales, consignments] = await Promise.all([
        supabase.from('skus').select('quantity_available'),
        supabase.from('profiles').select('id').eq('role', 'freelancer'),
        supabase.from('sales').select('quantity, sale_price, payment_status'),
        supabase.from('consignments').select('quantity'),
      ])

      const totalInventory = (inv.data || []).reduce((s, r) => s + (r.quantity_available || 0), 0)
      const salesData = sales.data || []
      const totalSales = salesData.reduce((s, r) => s + (r.quantity || 0), 0)
      const revenue = salesData.reduce((s, r) => s + (r.sale_price || 0) * (r.quantity || 0), 0)
      const unpaid = salesData.filter(r => r.payment_status === 'unpaid')
        .reduce((s, r) => s + (r.sale_price || 0) * (r.quantity || 0), 0)
      const consigned = (consignments.data || []).reduce((s, r) => s + (r.quantity || 0), 0)

      setStats({
        totalInventory,
        freelancers: (freelancers.data || []).length,
        totalSales,
        revenue,
        unpaid,
        consigned,
      })
    }
    load()
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard icon={Package} label="In Stock" value={stats.totalInventory} color="sage" />
        <StatCard icon={ArrowLeftRight} label="Consigned" value={stats.consigned} color="purple" />
        <StatCard icon={Users} label="Freelancers" value={stats.freelancers} color="blue" />
        <StatCard icon={ShoppingCart} label="Total Sales" value={stats.totalSales} color="emerald" />
        <StatCard icon={DollarSign} label="Revenue" value={`$${stats.revenue.toLocaleString()}`} color="amber" />
        <StatCard icon={AlertCircle} label="Unpaid" value={`$${stats.unpaid.toLocaleString()}`} color="rose" />
      </div>
    </div>
  )
}
