import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Package, DollarSign, Users, AlertCircle, Download } from 'lucide-react'
import Loader from '../components/Loader'
import { useToast } from '../components/Toast'

export default function Reports() {
  const toast = useToast()
  const [tab, setTab] = useState('consignment')
  const [loading, setLoading] = useState(true)
  const [consignmentData, setConsignmentData] = useState([])
  const [unpaidData, setUnpaidData] = useState([])
  const [profitData, setProfitData] = useState([])
  const [performanceData, setPerformanceData] = useState([])

  useEffect(() => { load() }, [])

  async function load() {
    const [consignments, sales, skus, profiles] = await Promise.all([
      supabase.from('consignments').select('*, profiles(name), skus(name)'),
      supabase.from('sales').select('*, profiles(name), skus(name, cost_price, sell_price, flat_fee)'),
      supabase.from('skus').select('*'),
      supabase.from('profiles').select('*').eq('role', 'freelancer'),
    ])

    // Consignment report - group by freelancer
    const consMap = {}
    for (const c of consignments.data || []) {
      const name = c.profiles?.name || 'Unknown'
      if (!consMap[name]) consMap[name] = []
      consMap[name].push({ sku: c.skus?.name, quantity: c.quantity })
    }
    setConsignmentData(Object.entries(consMap).map(([name, items]) => ({
      name, items, total: items.reduce((s, i) => s + i.quantity, 0)
    })))

    // Unpaid sales
    setUnpaidData(
      (sales.data || [])
        .filter(s => s.payment_status === 'unpaid')
        .map(s => ({
          freelancer: s.profiles?.name,
          sku: s.skus?.name,
          quantity: s.quantity,
          total: s.quantity * s.sale_price,
          date: new Date(s.created_at).toLocaleDateString(),
        }))
    )

    // Profit per SKU
    const profitMap = {}
    for (const sku of skus.data || []) {
      profitMap[sku.id] = {
        name: sku.name,
        cost: sku.cost_price,
        sell: sku.sell_price,
        fee: sku.flat_fee,
        sold: 0,
        revenue: 0,
        totalCost: 0,
        totalFees: 0,
      }
    }
    for (const s of sales.data || []) {
      if (profitMap[s.sku_id]) {
        profitMap[s.sku_id].sold += s.quantity
        profitMap[s.sku_id].revenue += s.quantity * s.sale_price
        profitMap[s.sku_id].totalCost += s.quantity * (s.skus?.cost_price || 0)
        profitMap[s.sku_id].totalFees += s.quantity * (s.skus?.flat_fee || 0)
      }
    }
    setProfitData(Object.values(profitMap).map(p => ({
      ...p,
      profit: p.revenue - p.totalCost - p.totalFees,
    })))

    // Freelancer performance
    const perfMap = {}
    for (const p of profiles.data || []) {
      perfMap[p.id] = { name: p.name, sales: 0, revenue: 0, fees: 0 }
    }
    for (const s of sales.data || []) {
      if (perfMap[s.freelancer_id]) {
        perfMap[s.freelancer_id].sales += s.quantity
        perfMap[s.freelancer_id].revenue += s.quantity * s.sale_price
        perfMap[s.freelancer_id].fees += s.quantity * (s.skus?.flat_fee || 0)
      }
    }
    setPerformanceData(Object.values(perfMap).sort((a, b) => b.revenue - a.revenue))
    setLoading(false)
  }

  function exportCSV() {
    let csv = ''
    let filename = ''

    if (tab === 'consignment') {
      csv = 'Freelancer,SKU,Quantity\n'
      consignmentData.forEach(f => f.items.forEach(item => {
        csv += `"${f.name}","${item.sku}",${item.quantity}\n`
      }))
      filename = 'consignment-report.csv'
    } else if (tab === 'unpaid') {
      csv = 'Freelancer,SKU,Quantity,Total,Date\n'
      unpaidData.forEach(s => {
        csv += `"${s.freelancer}","${s.sku}",${s.quantity},${s.total},"${s.date}"\n`
      })
      filename = 'unpaid-sales-report.csv'
    } else if (tab === 'profit') {
      csv = 'SKU,Sold,Revenue,Cost,Fees,Profit\n'
      profitData.forEach(p => {
        csv += `"${p.name}",${p.sold},${p.revenue},${p.totalCost},${p.totalFees},${p.profit}\n`
      })
      filename = 'profit-per-sku-report.csv'
    } else if (tab === 'performance') {
      csv = 'Freelancer,Sales,Revenue,Fees\n'
      performanceData.forEach(p => {
        csv += `"${p.name}",${p.sales},${p.revenue},${p.fees}\n`
      })
      filename = 'freelancer-performance-report.csv'
    }

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    toast('Report exported')
  }

  const tabs = [
    { id: 'consignment', label: 'Consignment', icon: Package },
    { id: 'unpaid', label: 'Unpaid', icon: AlertCircle },
    { id: 'profit', label: 'Profit/SKU', icon: DollarSign },
    { id: 'performance', label: 'Performance', icon: Users },
  ]

  if (loading) return <div className="mt-4"><Loader rows={4} /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-4xl">Reports</h1>
        <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {tabs.map(t => (
          <button key={t.id}
            onClick={() => setTab(t.id)}
            className={`btn btn-sm whitespace-nowrap ${tab === t.id ? 'btn-primary' : 'btn-secondary'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Outstanding Consignment */}
      {tab === 'consignment' && (
        <div className="flex flex-col gap-3">
          {consignmentData.map(f => (
            <div key={f.name} className="card">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-sm">{f.name}</p>
                <span className="badge badge-info">{f.total} total</span>
              </div>
              {f.items.map((item, i) => (
                <div key={i} className="flex justify-between text-xs text-gray-500 py-1">
                  <span>{item.sku}</span>
                  <span className="font-medium text-gray-700">{item.quantity} pcs</span>
                </div>
              ))}
            </div>
          ))}
          {consignmentData.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">No active consignments</p>
          )}
        </div>
      )}

      {/* Unpaid Sales */}
      {tab === 'unpaid' && (
        <div className="flex flex-col gap-3">
          {unpaidData.map((s, i) => (
            <div key={i} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-sm">{s.sku}</p>
                  <p className="text-xs text-gray-500">by {s.freelancer}</p>
                  <p className="text-xs text-gray-400">{s.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-rose-600">${s.total.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{s.quantity} pcs</p>
                </div>
              </div>
            </div>
          ))}
          {unpaidData.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">All payments received</p>
          )}
          {unpaidData.length > 0 && (
            <div className="stat-card mt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Total Unpaid</span>
                <span className="text-xl font-bold text-rose-600">
                  ${unpaidData.reduce((s, r) => s + r.total, 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Profit per SKU */}
      {tab === 'profit' && (
        <div className="flex flex-col gap-3">
          {profitData.map(p => (
            <div key={p.name} className="card">
              <div className="flex items-start justify-between mb-2">
                <p className="font-semibold text-sm">{p.name}</p>
                <span className={`badge ${p.profit >= 0 ? 'badge-success' : 'badge-danger'}`}>
                  ${p.profit.toLocaleString()}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs text-gray-500">
                <div><p className="font-medium text-gray-700">{p.sold}</p><p>Sold</p></div>
                <div><p className="font-medium text-gray-700">${p.revenue.toLocaleString()}</p><p>Revenue</p></div>
                <div><p className="font-medium text-gray-700">${p.totalCost.toLocaleString()}</p><p>Cost</p></div>
                <div><p className="font-medium text-gray-700">${p.totalFees.toLocaleString()}</p><p>Fees</p></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Freelancer Performance */}
      {tab === 'performance' && (
        <div className="flex flex-col gap-3">
          {performanceData.map((p, i) => (
            <div key={p.name} className="card">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#c3cca6]/30 text-[#5a6340] flex items-center justify-center text-sm font-bold shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{p.name}</p>
                  <div className="flex gap-4 text-xs text-gray-500 mt-1">
                    <span>{p.sales} sales</span>
                    <span>${p.revenue.toLocaleString()} revenue</span>
                    <span>${p.fees.toLocaleString()} fees</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {performanceData.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">No freelancer data</p>
          )}
        </div>
      )}
    </div>
  )
}
