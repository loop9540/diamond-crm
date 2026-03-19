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

// Deterministic color based on name — same name always gets same color
export function freelancerColor(name) {
  let hash = 0
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}
