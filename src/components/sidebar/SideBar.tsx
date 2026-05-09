//src/components/sidebar/Sidebar.tsx

import ScenarioHeader from './ScenarioHeader'
import MethodSelector from './MethodSelector'
import MetricsPanel from './MetricsPanel'
import DriverList from './DriverList'
import SimulateButton from './SimulateButton'
import { useSimulationStore } from '@/store/simulationStore'

export default function Sidebar() {
  const status = useSimulationStore((s) => s.status)
  const isRunning = status !== null && status !== 'completed' && status !== 'failed'

  return (
    <aside
      className="flex flex-col h-full overflow-hidden"
      style={{
        width: 320,
        minWidth: 320,
        background: 'rgba(8, 12, 24, 0.96)',
        borderRight: '1px solid #1e3a5f',
        boxShadow: '4px 0 40px rgba(0,0,0,0.5)',
      }}
    >
      {/* Header */}
      <ScenarioHeader />

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
        {/* Method selector */}
        <MethodSelector disabled={isRunning} />

        {/* Metrics */}
        <MetricsPanel />

        {/* Drivers */}
        <DriverList />
      </div>

      {/* Simulate button pinned at bottom */}
      <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid #1e3a5f' }}>
        <SimulateButton />
      </div>
    </aside>
  )
}