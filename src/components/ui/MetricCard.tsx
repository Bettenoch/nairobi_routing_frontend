//src/components/ui/MetricCard.tsx
import { Info } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'

interface MetricCardProps {
  label: string
  value: string | number
  unit?: string
  color?: string
  conceptId?: string
  pulse?: boolean
}

export default function MetricCard({ 
  label, value, unit, color = '#7fb3d0', conceptId, pulse 
}: MetricCardProps) {
  const { openDrawer } = useUIStore()

  return (
    <div className="panel-glass p-3 relative overflow-hidden">
      <div className="flex items-center justify-between mb-1">
        <span className="label-mono">{label}</span>
        {conceptId && (
          <button onClick={() => openDrawer('concept', conceptId)} className="text-[#3a6080] hover:text-cyan-400">
            <Info size={12} />
          </button>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span 
          className={`stat-value text-2xl ${pulse ? 'animate-count' : ''}`}
          style={{ color }}
        >
          {value}
        </span>
        {unit && <span className="text-xs text-[#3a6080]">{unit}</span>}
      </div>
    </div>
  )
}