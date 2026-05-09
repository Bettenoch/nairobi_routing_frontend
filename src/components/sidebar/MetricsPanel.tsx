//src/components/sidebar/MetricsPanel.tsx

import { Info } from 'lucide-react'
import { useSimulationStore } from '@/store/simulationStore'
import { useUIStore } from '@/store/uiStore'

interface MetricCardProps {
  label: string
  value: string | number
  unit?: string
  color?: string
  conceptId?: string
  pulse?: boolean
}

function MetricCard({ label, value, unit, color = '#7fb3d0', conceptId, pulse }: MetricCardProps) {
  const { openDrawer } = useUIStore()

  return (
    <div
      style={{
        background: 'rgba(17,24,39,0.8)',
        border: '1px solid #1e3a5f',
        borderRadius: 8,
        padding: '10px 12px',
        position: 'relative',
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#3a6080', letterSpacing: '0.1em' }}>
          {label}
        </span>
        {conceptId && (
          <button
            onClick={() => openDrawer('concept', conceptId)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3a6080', padding: 0 }}
          >
            <Info size={10} />
          </button>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: 22,
            color,
            animation: pulse ? 'countPulse 0.4s ease-in-out' : 'none',
            textShadow: `0 0 20px ${color}60`,
          }}
        >
          {value}
        </span>
        {unit && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#3a6080' }}>
            {unit}
          </span>
        )}
      </div>

      {/* Bottom accent line */}
      <div
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 2, borderRadius: '0 0 8px 8px',
          background: `linear-gradient(90deg, ${color}60, transparent)`,
        }}
      />
    </div>
  )
}

export default function MetricsPanel() {
  const m = useSimulationStore((s) => s.metrics)
  const status = useSimulationStore((s) => s.status)

  const isActive = status !== null && status !== 'completed'
  const savingsPct = m.savings_percentage ?? 0

  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9, color: '#3a6080',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        Live Metrics
      </div>

      {/* Big progress bar */}
      {m.deliveries_total > 0 && (
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#3a6080' }}>
              DELIVERIES
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7fff00', fontWeight: 600 }}>
              {m.deliveries_completed} / {m.deliveries_total}
            </span>
          </div>
          <div style={{ height: 6, background: '#1e3a5f', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${(m.deliveries_completed / m.deliveries_total) * 100}%`,
                background: 'linear-gradient(90deg, #00ccff, #7fff00)',
                borderRadius: 3,
                transition: 'width 0.5s ease',
                boxShadow: '0 0 8px rgba(127,255,0,0.4)',
              }}
            />
          </div>
        </div>
      )}

      {/* Savings percentage — hero metric */}
      {savingsPct > 0 && (
        <div
          className="mb-3"
          style={{
            background: 'rgba(127,255,0,0.06)',
            border: '1px solid rgba(127,255,0,0.2)',
            borderRadius: 8,
            padding: '10px 12px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4a9900', letterSpacing: '0.1em', marginBottom: 4 }}>
            ROUTING SAVINGS
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: 36,
              color: '#7fff00',
              textShadow: '0 0 30px rgba(127,255,0,0.4)',
              lineHeight: 1,
            }}
          >
            {savingsPct.toFixed(1)}%
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4a9900', marginTop: 2 }}>
            vs naive separate trips
          </div>
        </div>
      )}

      {/* 2-col grid of metrics */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          label="Distance Saved"
          value={m.distance_saved_km.toFixed(1)}
          unit="km"
          color="#00ccff"
          pulse={isActive}
        />
        <MetricCard
          label="Fuel Saved"
          value={m.fuel_saved_litres.toFixed(1)}
          unit="L"
          color="#7fff00"
        />
        <MetricCard
          label="Cost Saved"
          value={Math.round(m.cost_saved_kes).toLocaleString()}
          unit="KES"
          color="#7fff00"
          conceptId="gis"
        />
        <MetricCard
          label="CO₂ Avoided"
          value={m.co2_saved_kg.toFixed(1)}
          unit="kg"
          color="#96CEB4"
        />
        <MetricCard
          label="Time Saved"
          value={Math.round(m.time_saved_minutes)}
          unit="min"
          color="#ffaa00"
        />
        <MetricCard
          label="Clusters"
          value={m.clusters_formed}
          color="#45B7D1"
          conceptId="clustering"
        />
      </div>

      {/* Distance comparison */}
      {m.naive_distance_km > 0 && (
        <div className="mt-3 space-y-2">
          <DistanceBar
            label="OPTIMISED"
            value={m.optimised_distance_km}
            max={m.naive_distance_km}
            color="#00ccff"
          />
          <DistanceBar
            label="NAIVE"
            value={m.naive_distance_km}
            max={m.naive_distance_km}
            color="#ff4d6d"
          />
        </div>
      )}
    </div>
  )
}

function DistanceBar({
  label, value, max, color,
}: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#3a6080' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color, fontWeight: 600 }}>
          {value.toFixed(1)} km
        </span>
      </div>
      <div style={{ height: 4, background: '#1e3a5f', borderRadius: 2 }}>
        <div
          style={{
            height: '100%', width: `${pct}%`,
            background: color, borderRadius: 2,
            transition: 'width 0.8s ease',
          }}
        />
      </div>
    </div>
  )
}