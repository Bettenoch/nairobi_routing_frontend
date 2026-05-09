//src/components/ui/mapHUD.tsx

import { useSimulationStore } from '@/store/simulationStore'
import { useUIStore } from '@/store/uiStore'

export default function MapHUD() {
  const { orders, routes, metrics, status } = useSimulationStore()
  const { openDrawer } = useUIStore()

  const orderCount = Object.keys(orders).length
  const routeCount = Object.keys(routes).length
  const isActive = status && !['completed', 'failed'].includes(status)

  if (orderCount === 0) return null

  return (
    <>
      {/* Top-center status bar */}
      {isActive && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none"
          style={{ zIndex: 10 }}
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
            <HUDStat value={routeCount} label="Routes" color="#7fff00" />
            <HUDDivider />
            <HUDStat value={metrics.deliveries_completed} label="Delivered" color="#7fff00" />
          </div>
        </div>
      )}

      {/* Bottom-left legend */}
      <div
        className="absolute bottom-12 left-4 pointer-events-auto"
        style={{ zIndex: 10 }}
      >
        <div
          style={{
            background: 'rgba(8,12,24,0.85)',
            border: '1px solid #1e3a5f',
            borderRadius: 10,
            padding: '10px 14px',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#3a6080', letterSpacing: '0.1em', marginBottom: 8 }}>
            LEGEND
          </div>
          <div className="space-y-2">
            <LegendItem color="#00ccff" label="Order (pending)" shape="circle" />
            <LegendItem color="#7fff00" label="Order (delivered)" shape="circle" />
            <LegendItem color="#00ccff" label="Driver" shape="driver" />
            <LegendItem color="rgba(0,204,255,0.3)" label="Cluster zone" shape="area" />
          </div>

          {/* Algorithm quick links */}
          <div
            style={{
              marginTop: 10, paddingTop: 8,
              borderTop: '1px solid #1e3a5f',
            }}
          >
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#3a6080', letterSpacing: '0.1em', marginBottom: 6 }}>
              LEARN
            </div>
            {[
              { id: 'dbscan', label: 'Clustering (DBSCAN)', type: 'algorithm' as const },
              { id: 'vrp', label: 'VRP Solver', type: 'algorithm' as const },
              { id: 'circuity', label: 'Road Circuity', type: 'concept' as const },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => openDrawer(item.type, item.id)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: 9,
                  color: '#7fb3d0', padding: '2px 0',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#00ccff')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#7fb3d0')}
              >
                › {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
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

function LegendItem({ color, label, shape }: { color: string; label: string; shape: string }) {
  return (
    <div className="flex items-center gap-2">
      {shape === 'circle' && (
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, border: '1px solid', borderColor: color, flexShrink: 0 }} />
      )}
      {shape === 'driver' && (
        <div style={{ fontSize: 10, lineHeight: 1, flexShrink: 0 }}>🛵</div>
      )}
      {shape === 'area' && (
        <div style={{ width: 8, height: 8, borderRadius: 2, background: color, border: `1px solid ${color.replace('0.3', '0.6')}`, flexShrink: 0 }} />
      )}
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#7fb3d0' }}>{label}</span>
    </div>
  )
}