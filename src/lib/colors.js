const COLORS = [
  { from: '#8b5cf6', to: '#6d28d9' }, // purple
  { from: '#3b82f6', to: '#1d4ed8' }, // blue
  { from: '#f59e0b', to: '#d97706' }, // amber
  { from: '#10b981', to: '#059669' }, // emerald
  { from: '#ef4444', to: '#dc2626' }, // red
  { from: '#ec4899', to: '#db2777' }, // pink
  { from: '#14b8a6', to: '#0d9488' }, // teal
  { from: '#f97316', to: '#ea580c' }, // orange
]

// Deterministic color based on name — uses a better hash to avoid collisions
export function freelancerColor(name) {
  let hash = 5381
  for (let i = 0; i < (name || '').length; i++) {
    hash = ((hash << 5) + hash + name.charCodeAt(i)) >>> 0
  }
  return COLORS[hash % COLORS.length]
}
