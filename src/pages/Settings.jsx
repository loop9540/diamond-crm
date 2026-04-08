import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useToast } from '../components/Toast'
import { supabase } from '../lib/supabase'
import Loader from '../components/Loader'

const DEFAULT_CARAT_SIZES = Array.from({ length: 951 }, (_, i) => {
  const val = (i + 50) / 100
  return val.toFixed(2) + 'ct'
})
const DEFAULT_GOLD_TYPES = ['WG', 'YG', 'RG']
const DEFAULT_AD_TEMPLATE = `{name} - Diamond Ring
💎 {carat} carat | {gold_type} Gold
💰 \${price}

Screw back backing.
Authentic lab grown diamond. Perfect for any occasion!

Comes with a jewellery box.

Can meet at any public place or other location.

Thank you 🙏🏻`

// Cache for settings so other pages don't need to fetch every render
let settingsCache = {}

async function fetchSetting(key, fallback) {
  if (settingsCache[key] !== undefined) return settingsCache[key]
  const { data } = await supabase.from('settings').select('value').eq('key', key).single()
  const val = data?.value ?? fallback
  settingsCache[key] = val
  return val
}

export async function getCaratSizes() {
  return fetchSetting('carat_sizes', DEFAULT_CARAT_SIZES)
}

export async function getGoldTypes() {
  return fetchSetting('gold_types', DEFAULT_GOLD_TYPES)
}

export async function getCategories() {
  return fetchSetting('categories', ['Studs', 'Tennis Bracelet', 'Pendant', 'Ring', 'Chain', 'Other'])
}

export async function getAdTemplate() {
  return fetchSetting('ad_template', DEFAULT_AD_TEMPLATE)
}

export function clearSettingsCache() {
  settingsCache = {}
}

export default function Settings() {
  const toast = useToast()
  const [caratSizes, setCaratSizes] = useState([])
  const [goldTypes, setGoldTypes] = useState([])
  const [adTemplate, setAdTemplate] = useState('')
  const [newCarat, setNewCarat] = useState('')
  const [newGold, setNewGold] = useState('')
  const [categories, setCategories] = useState([])
  const [newCategory, setNewCategory] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const [c, g, a, cat] = await Promise.all([
      getCaratSizes(),
      getGoldTypes(),
      getAdTemplate(),
      getCategories(),
    ])
    setCaratSizes(c)
    setGoldTypes(g)
    setAdTemplate(a)
    setCategories(cat)
    setLoading(false)
  }

  async function saveSetting(key, value) {
    await supabase.from('settings').upsert({ key, value, updated_at: new Date().toISOString() })
    settingsCache[key] = value
  }

  async function addCarat() {
    const val = newCarat.trim()
    if (!val || caratSizes.includes(val)) return
    const updated = [...caratSizes, val]
    setCaratSizes(updated)
    await saveSetting('carat_sizes', updated)
    setNewCarat('')
    toast('Carat size added')
  }

  async function removeCarat(idx) {
    const updated = caratSizes.filter((_, i) => i !== idx)
    setCaratSizes(updated)
    await saveSetting('carat_sizes', updated)
    toast('Carat size removed')
  }

  async function addGold() {
    const val = newGold.trim()
    if (!val || goldTypes.includes(val)) return
    const updated = [...goldTypes, val]
    setGoldTypes(updated)
    await saveSetting('gold_types', updated)
    setNewGold('')
    toast('Gold type added')
  }

  async function removeGold(idx) {
    const updated = goldTypes.filter((_, i) => i !== idx)
    setGoldTypes(updated)
    await saveSetting('gold_types', updated)
    toast('Gold type removed')
  }

  async function addCategory() {
    const val = newCategory.trim()
    if (!val || categories.includes(val)) return
    const updated = [...categories, val]
    setCategories(updated)
    await saveSetting('categories', updated)
    setNewCategory('')
    toast('Category added')
  }

  async function removeCategory(idx) {
    const updated = categories.filter((_, i) => i !== idx)
    setCategories(updated)
    await saveSetting('categories', updated)
    toast('Category removed')
  }

  if (loading) return <div className="mt-4"><Loader rows={3} /></div>

  return (
    <div>
      <h1 className="text-4xl mb-6">Settings</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Carat Sizes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-lg font-semibold mb-2">Carat Sizes</h2>
          <p className="text-xs text-gray-400 mb-4">{caratSizes.length} sizes</p>
          <div className="flex flex-col gap-2 mb-4 max-h-64 overflow-y-auto">
            {caratSizes.map((size, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                <span className="text-sm font-medium">{size}</span>
                <button className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  onClick={() => removeCarat(i)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="e.g. 12ct" value={newCarat}
              onChange={e => setNewCarat(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCarat()} />
            <button className="btn btn-primary btn-sm" onClick={addCarat}>
              <Plus size={14} /> Add
            </button>
          </div>
        </div>

        {/* Gold Types */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-lg font-semibold mb-2">Gold Types</h2>
          <p className="text-xs text-gray-400 mb-4">{goldTypes.length} types</p>
          <div className="flex flex-col gap-2 mb-4">
            {goldTypes.map((type, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                <span className="text-sm font-medium">{type}</span>
                <button className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  onClick={() => removeGold(i)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="e.g. PG" value={newGold}
              onChange={e => setNewGold(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addGold()} />
            <button className="btn btn-primary btn-sm" onClick={addGold}>
              <Plus size={14} /> Add
            </button>
          </div>
        </div>
        {/* Categories */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-lg font-semibold mb-2">Categories</h2>
          <p className="text-xs text-gray-400 mb-4">{categories.length} categories</p>
          <div className="flex flex-col gap-2 mb-4">
            {categories.map((cat, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                <span className="text-sm font-medium">{cat}</span>
                <button className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  onClick={() => removeCategory(i)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="e.g. Earrings" value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCategory()} />
            <button className="btn btn-primary btn-sm" onClick={addCategory}>
              <Plus size={14} /> Add
            </button>
          </div>
        </div>
      </div>

      {/* Ad Template */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mt-6">
        <h2 className="text-lg font-semibold mb-2">Ad Template</h2>
        <p className="text-xs text-gray-400 mb-3">
          Variables: <code className="bg-gray-100 px-1 rounded">{'{name}'}</code> <code className="bg-gray-100 px-1 rounded">{'{carat}'}</code> <code className="bg-gray-100 px-1 rounded">{'{gold_type}'}</code> <code className="bg-gray-100 px-1 rounded">{'{price}'}</code> <code className="bg-gray-100 px-1 rounded">{'{color}'}</code> <code className="bg-gray-100 px-1 rounded">{'{clarity}'}</code> <code className="bg-gray-100 px-1 rounded">{'{category}'}</code>
        </p>
        <textarea
          className="input min-h-[160px] font-mono text-sm leading-relaxed"
          value={adTemplate}
          onChange={e => setAdTemplate(e.target.value)}
        />
        <div className="flex gap-2 mt-3">
          <button className="btn btn-primary btn-sm" onClick={async () => {
            await saveSetting('ad_template', adTemplate)
            toast('Template saved')
          }}>Save Template</button>
          <button className="btn btn-secondary btn-sm" onClick={async () => {
            setAdTemplate(DEFAULT_AD_TEMPLATE)
            await saveSetting('ad_template', DEFAULT_AD_TEMPLATE)
            toast('Template reset to default')
          }}>Reset</button>
        </div>
      </div>
    </div>
  )
}
