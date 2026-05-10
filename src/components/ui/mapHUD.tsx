// src/components/ui/mapHUD.tsx — FIXED
// Fix: Removed the bottom-left LEGEND block from here entirely.
// The legend now lives exclusively in NairobiMap (MapLegend component)
// where it's properly toggleable. Having it in both places caused the
// double-legend the user reported.

import { useSimulationStore } from '@/store/simulationStore'

export default function MapHUD() {
  const { orders, routes, metrics, status } = useSimulationStore()

  const orderCount = Object.keys(orders).length
  const isActive = status && !['completed', 'failed'].includes(status)

  if (orderCount === 0) return null

  return (
    <>
      {/* Top-center status bar — only shown while simulation is running */}
      {isActive && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: 60, // below the toggle control bar
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
          }}
        >
          <div
            style={{
              background: 'rgba(8,12,24,0.9)',
              border: '1px solid rgba(0,204,255,0.2)',
              borderRadius: 20,
              padding: '6px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            }}
          >
            <HUDStat value={orderCount} label="Orders" color="#00ccff" />
            <HUDDivider />
            <HUDStat value={metrics.clusters_formed} label="Clusters" color="#ffaa00" />
            <HUDDivider />
            <HUDStat value={Object.keys(routes).length} label="Routes" color="#7fff00" />
            <HUDDivider />
            <HUDStat value={metrics.deliveries_completed} label="Delivered" color="#7fff00" />
          </div>
        </div>
      )}
      {/* Legend has been moved to NairobiMap (MapLegend) and is toggleable there. */}
    </>
  )
}

function HUDStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          fontSize: 16,
          color,
          lineHeight: 1,
          textShadow: `0 0 12px ${color}80`,
        }}
      >
        {value}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#3a6080', letterSpacing: '0.1em', marginTop: 1 }}>
        {label.toUpperCase()}
      </div>
    </div>
  )
}

function HUDDivider() {
  return <div style={{ width: 1, height: 24, background: '#1e3a5f' }} />
}