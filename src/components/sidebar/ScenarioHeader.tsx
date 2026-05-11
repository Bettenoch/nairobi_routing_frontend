//src/components/sidebar/ScenarioHeader.tsx

import { useSimulationStore } from '@/store/simulationStore'

const STATUS_LABELS: Record<string, string> = {
  initialising:      'INITIALISING',
  generating_orders: 'GENERATING ORDERS',
  clustering:        'CLUSTERING',
  routing:           'ROUTING',
  animating:         'EN ROUTE',
  completed:         'COMPLETED',
  failed:            'FAILED',
}

const STATUS_COLORS: Record<string, string> = {
  initialising:      '#ffaa00',
  generating_orders: '#00ccff',
  clustering:        '#00ccff',
  routing:           '#00ccff',
  animating:         '#7fff00',
  completed:         '#7fff00',
  failed:            '#ff4d6d',
}

export default function ScenarioHeader() {
  const { status, statusMessage, config, wsConnected, sessionId } = useSimulationStore()

  const statusColor = status ? STATUS_COLORS[status] ?? '#3a6080' : '#3a6080'
  const statusLabel = status ? STATUS_LABELS[status] ?? status.toUpperCase() : 'STANDBY'

  return (
    <div
      className="px-4 pt-4 pb-3 space-y-3"
      style={{ borderBottom: '1px solid #1e3a5f' }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2">
        <div
          style={{
            width: 28, height: 28,
            background: 'linear-gradient(135deg, #00ccff, #0066aa)',
            borderRadius: 6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14,
            boxShadow: '0 0 12px rgba(0,204,255,0.3)',
          }}
        >
          🗺️
        </div>
        <div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '0.06em',
              color: '#e8f4fd',
            }}
          >
            NAIROBI ROUTING
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#3a6080', letterSpacing: '0.1em' }}>
            GIS SIMULATION PLATFORM
          </div>
        </div>

        {/* WS status dot */}
        <div className="ml-auto flex items-center gap-1">
          <div
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: wsConnected ? '#7fff00' : '#3a6080',
              boxShadow: wsConnected ? '0 0 6px #7fff00' : 'none',
            }}
          />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#3a6080' }}>
            {wsConnected ? 'LIVE' : 'IDLE'}
          </span>
        </div>
      </div>

      {/* Scenario label */}
      <div
        style={{
          background: 'rgba(0,204,255,0.05)',
          border: '1px solid rgba(0,204,255,0.15)',
          borderRadius: 6,
          padding: '6px 10px',
        }}
      >
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#007799', letterSpacing: '0.1em', marginBottom: 2 }}>
          SCENARIO
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 12, color: '#e8f4fd' }}>
          {config.scenario_label}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-2">
        <div
          style={{
            width: 6, height: 6, borderRadius: '50%',
            background: statusColor,
            boxShadow: status && !['completed', 'failed'].includes(status)
              ? `0 0 8px ${statusColor}` : 'none',
            animation: status && !['completed', 'failed', null].includes(status)
              ? 'pulse 1.5s infinite' : 'none',
          }}
        />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: statusColor,
            letterSpacing: '0.1em',
          }}
        >
          {statusLabel}
        </span>
        {sessionId && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#3a6080', marginLeft: 'auto' }}>
            {sessionId.slice(0, 12)}
          </span>
        )}
      </div>

      {/* Status message */}
      {statusMessage && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#7fb3d0', lineHeight: 1.5, margin: 0 }}>
          {statusMessage}
        </p>
      )}
    </div>
  )
}