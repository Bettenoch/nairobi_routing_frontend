// src/components/sidebar/Sidebar.tsx — FIXED


import { useState } from 'react'
import ScenarioHeader from './ScenarioHeader'
import MethodSelector from './MethodSelector'
import MetricsPanel from './MetricsPanel'
import DriverList from './DriverList'
import SimulateButton from './SimulateButton'
import { useSimulationStore } from '@/store/simulationStore'

const SIDEBAR_ICONS = [
  { icon: '🗺️', title: 'Scenario' },
  { icon: '📐', title: 'Routing Method' },
  { icon: '📊', title: 'Metrics' },
  { icon: '🛵', title: 'Drivers' },
]

export default function Sidebar() {
  const status = useSimulationStore((s) => s.status)
  const isRunning = status !== null && status !== 'completed' && status !== 'failed'
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      style={{

        width: collapsed ? 52 : 320,
        minWidth: collapsed ? 52 : 320,
        transition: 'width 0.25s ease, min-width 0.25s ease',
        background: 'rgba(8, 12, 24, 0.96)',
        borderRight: '1px solid #1e3a5f',
        boxShadow: '4px 0 40px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 20,
        flexShrink: 0,
      }}
    >
      {/* ── Collapsed rail ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: 12,
          paddingBottom: 12,
          gap: 4,
          opacity: collapsed ? 1 : 0,
          pointerEvents: collapsed ? 'auto' : 'none',
          transition: 'opacity 0.15s ease',
        }}
      >
        {/* Expand button */}
        <button
          onClick={() => setCollapsed(false)}
          title="Expand sidebar"
          style={{
            width: 36, height: 36, borderRadius: 8,
            border: '1px solid rgba(0,204,255,0.3)',
            background: 'rgba(0,204,255,0.08)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, marginBottom: 8, transition: 'all 0.2s',
            color: '#00ccff',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,204,255,0.18)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,204,255,0.08)' }}
        >
          ▶
        </button>

        {SIDEBAR_ICONS.map((item) => (
          <div
            key={item.title}
            title={item.title}
            style={{
              width: 36, height: 36, borderRadius: 8,
              border: '1px solid #1e3a5f',
              background: 'rgba(17,24,39,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, cursor: 'default',
            }}
          >
            {item.icon}
          </div>
        ))}

        <div style={{ flex: 1 }} />

        <button
          onClick={() => setCollapsed(false)}
          title="Open sidebar to simulate"
          style={{
            width: 36, height: 36, borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg, #00ccff, #0099cc)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, boxShadow: '0 0 12px rgba(0,204,255,0.4)',
          }}
        >
          ▶
        </button>
      </div>

      {/* ── Full sidebar content ── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          opacity: collapsed ? 0 : 1,
          pointerEvents: collapsed ? 'none' : 'auto',
          transition: 'opacity 0.15s ease',
          overflow: 'hidden',
        }}
      >
        {/* Collapse toggle button */}
        <button
          onClick={() => setCollapsed(true)}
          title="Collapse sidebar"
          style={{
            position: 'absolute', top: 12, right: 12,
            width: 24, height: 24, borderRadius: 6,
            border: '1px solid #1e3a5f',
            background: 'rgba(17,24,39,0.8)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, color: '#3a6080', zIndex: 5, transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(0,204,255,0.4)'
            e.currentTarget.style.color = '#00ccff'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#1e3a5f'
            e.currentTarget.style.color = '#3a6080'
          }}
        >
          ◀
        </button>

        {/* Header */}
        <ScenarioHeader />

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
          <MethodSelector disabled={isRunning} />
          <MetricsPanel />
          <DriverList />
        </div>

        {/* Simulate button pinned at bottom */}
        <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid #1e3a5f' }}>
          <SimulateButton />
        </div>
      </div>
    </aside>
  )
}