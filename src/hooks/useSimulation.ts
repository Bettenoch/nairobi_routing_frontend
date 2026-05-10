//src/hooks/useSimulation.ts

import { useCallback, useEffect, useRef } from 'react'
import { SimulationWebSocket } from '@/services/websocket'
import { api } from '@/services/api'
import { useSimulationStore } from '@/store/simulationStore'
import { useMapStore } from '@/store/mapStore'
import { useUIStore } from '@/store/uiStore'
import type { SimulationConfig, SimulationEvent } from '@/types'

// ── Unique color palette per driver ──────────────────────────────────────────
// Each color is visually distinct — no two adjacent entries look similar.
// This palette has 10 entries matching the max driver count (8) + buffer.
const DRIVER_PALETTE = [
  "#00ccff", // cyan
  "#FF6B35", // orange
  "#7fff00", // lime
  "#DDA0DD", // plum
  "#4ECDC4", // teal
  "#ffaa00", // amber
  "#ff4d6d", // coral
  "#85C1E9", // sky blue
  "#F7DC6F", // gold
  "#BB8FCE", // lavender
]

// ── Per-session driver color state ────────────────────────────────────────────
// These are module-level (not React state) because they need to persist across
// re-renders but be reset on each new simulation.
//
// FIX for "same color" bug:
//   Root cause — if `getOrAssignDriverColor` was called with the SAME driver_id
//   twice (once in ROUTE_COMPUTED, once in DRIVER_ASSIGNED), it correctly
//   returned the same color. But if the color map was stale from a previous run
//   (not fully cleared), drivers got palette[0] each time.
//   Solution: clear map + index together in clearDriverColors(), and never
//   call clearDriverColors() partially.

const driverColorMap: Record<string, string> = {}
let driverColorIndex = 0

function getOrAssignDriverColor(driverId: string): string {
  if (driverColorMap[driverId]) return driverColorMap[driverId]
  // FIX: use modulo so we never go out of bounds even with 10+ drivers
  const color = DRIVER_PALETTE[driverColorIndex % DRIVER_PALETTE.length]
  driverColorMap[driverId] = color
  driverColorIndex++
  return color
}

function clearDriverColors() {
  // Clear all entries + reset index atomically
  Object.keys(driverColorMap).forEach((k) => delete driverColorMap[k])
  driverColorIndex = 0
}

export function useSimulation() {
  const wsRef = useRef<SimulationWebSocket | null>(null)

  const {
    setSessionId, setWsConnected, setStatus,
    upsertOrder, upsertDriver, upsertCluster, upsertRoute,
    setMetrics, setCompletionSummary, config, reset,
  } = useSimulationStore()

  const {
    updateDriverPosition, markOrderDelivered, resetMap,
    initDriverTrail, appendTrailPoint, finalizeDriverTrail, setActiveDriver,
  } = useMapStore()

  const { setShowCompletion } = useUIStore()

  const handleEvent = useCallback((event: SimulationEvent) => {
    switch (event.event) {

      case 'SIMULATION_STATUS':
        setStatus(event.data.status as never, event.data.message)
        break

      case 'ORDER_CREATED':
        upsertOrder(event.data.order_id, {
          id:                      event.data.order_id,
          lat:                     event.data.lat,
          lon:                     event.data.lon,
          zone:                    event.data.zone,
          order_type:              event.data.order_type,
          status:                  'pending',
          cluster_id:              null,
          driver_id:               null,
          estimated_prep_minutes:  event.data.estimated_prep_minutes,
          restaurant_name:         event.data.restaurant_name ?? '',
        })
        break

      case 'ORDER_STATUS_CHANGED':
        upsertOrder(event.data.order_id, {
          status:    event.data.status,
          driver_id: event.data.driver_id ?? undefined,
        })
        break

      case 'CLUSTER_FORMED':
        upsertCluster(event.data.cluster_id, {
          id:           event.data.cluster_id,
          order_ids:    event.data.order_ids,
          centroid_lat: event.data.centroid_lat,
          centroid_lon: event.data.centroid_lon,
          color:        event.data.color,
          driver_id:    null,
          zone_label:   event.data.zone_label,
          algorithm_used: 'dbscan',
        })
        event.data.order_ids.forEach((oid) =>
          upsertOrder(oid, { cluster_id: event.data.cluster_id, status: 'clustered' })
        )
        break

      case 'ROUTE_COMPUTED': {
        // FIX: color is always keyed by driver_id, never by route_id.
        // This guarantees a driver with 3 clusters has 3 routes all the same color.
        const driverColor = getOrAssignDriverColor(event.data.driver_id)

        upsertRoute(event.data.route_id, {
          id:                         event.data.route_id,
          cluster_id:                 event.data.cluster_id,
          driver_id:                  event.data.driver_id,
          // FIX: do NOT store driver_name from the route event — it may be stale.
          // The legend reads name from the drivers store instead.
          driver_name:                event.data.driver_name ?? '',
          method:                     event.data.method as never,
          geojson:                    event.data.geojson,
          total_distance_km:          event.data.total_distance_km,
          estimated_duration_minutes: event.data.estimated_duration_minutes,
          naive_distance_km:          event.data.naive_distance_km,
          color: driverColor,
        })
        upsertCluster(event.data.cluster_id, { driver_id: event.data.driver_id })
        // initDriverTrail is idempotent — safe to call multiple times for same driver
        initDriverTrail(event.data.driver_id, driverColor)
        break
      }

      case 'DRIVER_ASSIGNED':
        // This is where the driver name is written to the drivers store.
        // The legend reads from here — not from the route events.
        upsertDriver(event.data.driver_id, {
          status:     'assigned',
          cluster_id: event.data.cluster_id,
          name:       event.data.driver_name,
        })
        {
          // FIX: get the color from the map (already assigned in ROUTE_COMPUTED).
          // If DRIVER_ASSIGNED fires before ROUTE_COMPUTED (unlikely but possible),
          // getOrAssignDriverColor will assign a new color; subsequent ROUTE_COMPUTED
          // will then use it consistently.
          const color = getOrAssignDriverColor(event.data.driver_id)
          initDriverTrail(event.data.driver_id, color)
          setActiveDriver(event.data.driver_id)
        }
        break

      case 'DRIVER_MOVED': {
        const { driver_id, driver_name, lat, lon, progress_pct, current_order_id } = event.data

        // FIX: reject [0,0] and non-finite coordinates before updating any state
        if (
          !Number.isFinite(lat) || !Number.isFinite(lon) ||
          (lat === 0 && lon === 0)
        ) break

        updateDriverPosition(driver_id, {
          lat, lon,
          progress:       progress_pct,
          currentOrderId: current_order_id,
          driverName:     driver_name ?? '',
        })
        upsertDriver(driver_id, { lat, lon, status: 'en_route' })
        appendTrailPoint(driver_id, lon, lat)
        break
      }

      case 'DELIVERY_COMPLETED': {
        markOrderDelivered(event.data.order_id)
        upsertOrder(event.data.order_id, { status: 'delivered' })

        // Increment the delivery count on the driver in the store.
        // This is the counter read by the legend ("X drops").
        const currentDriver = useSimulationStore.getState().drivers[event.data.driver_id]
        upsertDriver(event.data.driver_id, {
          deliveries_completed: (currentDriver?.deliveries_completed ?? 0) + 1,
        })
        break
      }

      case 'METRICS_UPDATED': {
        // Compute savings_percentage client-side because the backend sends it
        // as a @property (not a real field), so it arrives as 0 in the JSON.
        const m = event.data
        const savings_percentage =
          m.naive_distance_km > 0
            ? Math.round(((m.naive_distance_km - m.optimised_distance_km) / m.naive_distance_km) * 1000) / 10
            : 0

        setMetrics({ ...m, savings_percentage })
        break
      }

      case 'SIMULATION_COMPLETED':
        setCompletionSummary(event.data)
        setStatus('completed' as never, 'Simulation complete!')
        setShowCompletion(true)
        {
          const trails = useMapStore.getState().driverTrails
          Object.keys(trails).forEach((id) => {
            if (trails[id].isActive) finalizeDriverTrail(id)
          })
        }
        break

      case 'PONG':
        break

      default:
        break
    }
  }, [
    setStatus, upsertOrder, upsertDriver, upsertCluster, upsertRoute,
    setMetrics, setCompletionSummary, updateDriverPosition, markOrderDelivered,
    setShowCompletion, initDriverTrail, appendTrailPoint, finalizeDriverTrail,
    setActiveDriver,
  ])

  const startSimulation = useCallback(async (overrides?: Partial<SimulationConfig>) => {
    wsRef.current?.close()
    reset()
    resetMap()
    setShowCompletion(false)
    // FIX: always clear colors at the very start of a new simulation run
    clearDriverColors()

    const cfg: SimulationConfig = { ...config, ...overrides }

    try {
      const res = await api.startSimulation(cfg)
      setSessionId(res.session_id)

      const ws = new SimulationWebSocket(res.session_id, handleEvent, setWsConnected)
      wsRef.current = ws
      ws.connect()
    } catch (err) {
      console.error('[simulation] Failed to start:', err)
      setStatus('failed' as never, `Failed to start: ${(err as Error).message}`)
    }
  }, [config, handleEvent, reset, resetMap, setSessionId, setStatus, setWsConnected, setShowCompletion])

  useEffect(() => () => { wsRef.current?.close() }, [])

  return { startSimulation, wsRef }
}