import { useState } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { useToast } from '../components/Toast'

const DEFAULT_CARAT_SIZES = ['0.5ct', '0.75ct', '1ct', '1.5ct', '2ct', '3ct']
const DEFAULT_GOLD_TYPES = ['WG', 'YG', 'RG']

export function getCaratSizes() {
  try {
    const saved = localStorage.getItem('diamond-crm-carat-sizes')
    if (saved) return JSON.parse(saved)
  } catch {}
  return DEFAULT_CARAT_SIZES
}

export function getGoldTypes() {
  try {
    const saved = localStorage.getItem('diamond-crm-gold-types')
    if (saved) return JSON.parse(saved)
  } catch {}
  return DEFAULT_GOLD_TYPES
}

export default function Settings() {
  const toast = useToast()
  const [caratSizes, setCaratSizes] = useState(getCaratSizes)
  const [goldTypes, setGoldTypes] = useState(getGoldTypes)
  const [newCarat, setNewCarat] = useState('')
  const [newGold, setNewGold] = useState('')

  function addCarat() {
    const val = newCarat.trim()
    if (!val || caratSizes.includes(val)) return
    const updated = [...caratSizes, val]
    setCaratSizes(updated)
    localStorage.setItem('diamond-crm-carat-sizes', JSON.stringify(updated))
    setNewCarat('')
    toast('Carat size added')
  }

  function removeCarat(idx) {
    const updated = caratSizes.filter((_, i) => i !== idx)
    setCaratSizes(updated)
    localStorage.setItem('diamond-crm-carat-sizes', JSON.stringify(updated))
    toast('Carat size removed')
  }

  function addGold() {
    const val = newGold.trim()
    if (!val || goldTypes.includes(val)) return
    const updated = [...goldTypes, val]
    setGoldTypes(updated)
    localStorage.setItem('diamond-crm-gold-types', JSON.stringify(updated))
    setNewGold('')
    toast('Gold type added')
  }

  function removeGold(idx) {
    const updated = goldTypes.filter((_, i) => i !== idx)
    setGoldTypes(updated)
    localStorage.setItem('diamond-crm-gold-types', JSON.stringify(updated))
    toast('Gold type removed')
  }

  return (
    <div>
      <h1 className="text-4xl mb-6">Settings</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Carat Sizes */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-lg font-semibold mb-4">Carat Sizes</h2>
          <div className="flex flex-col gap-2 mb-4">
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
            <input className="input flex-1" placeholder="e.g. 4ct" value={newCarat}
              onChange={e => setNewCarat(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCarat()} />
            <button className="btn btn-primary btn-sm" onClick={addCarat}>
              <Plus size={14} /> Add
            </button>
          </div>
        </div>

        {/* Gold Types */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-lg font-semibold mb-4">Gold Types</h2>
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
      </div>
    </div>
  )
}
