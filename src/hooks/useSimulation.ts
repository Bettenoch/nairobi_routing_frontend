// src/hooks/useSimulation.ts — FIXED
// Fix 1: DELIVERY_COMPLETED increments deliveries_completed using Math.max to
//         guarantee a numeric base (never NaN from undefined+1).
// Fix 2: DRIVER_ASSIGNED initialises deliveries_completed: 0 if missing,
//         so the field always exists before any increment.

import { useCallback, useEffect, useRef } from 'react'
import { SimulationWebSocket } from '@/services/websocket'
import { api } from '@/services/api'
import { useSimulationStore } from '@/store/simulationStore'
import { useMapStore } from '@/store/mapStore'
import { useUIStore } from '@/store/uiStore'
import type { SimulationConfig, SimulationEvent } from '@/types'

// ── Unique color palette per driver ──────────────────────────────────────────
const DRIVER_PALETTE = [
  "#00ccff", "#FF6B35", "#7fff00", "#DDA0DD", "#4ECDC4",
  "#ffaa00", "#ff4d6d", "#85C1E9", "#F7DC6F", "#BB8FCE",
]

const driverColorMap: Record<string, string> = {}
let driverColorIndex = 0

function getOrAssignDriverColor(driverId: string): string {
  if (driverColorMap[driverId]) return driverColorMap[driverId]
  const color = DRIVER_PALETTE[driverColorIndex % DRIVER_PALETTE.length]
  driverColorMap[driverId] = color
  driverColorIndex++
  return color
}

function clearDriverColors() {
  Object.keys(driverColorMap).forEach((k) => delete driverColorMap[k])
  driverColorIndex = 0
}

export function useSimulation() {
  const wsRef = useRef<SimulationWebSocket | null>(null)

  const {
    setSessionId, setWsConnected, setStatus,
    upsertOrder, upsertDriver, upsertCluster, upsertRoute,
    upsertRestaurant, setDeliveryRecords,
    setMetrics, setCompletionSummary, config, reset,
  } = useSimulationStore()

  const {
    updateDriverPosition, markOrderDelivered, resetMap,
    initDriverTrail, appendTrailPoint, finalizeDriverTrail, setActiveDriver,
    addRestaurantMarker,
  } = useMapStore()

  const { setShowCompletion } = useUIStore()

  const handleEvent = useCallback((event: SimulationEvent) => {
    switch (event.event) {

      case 'SIMULATION_STATUS':
        setStatus(event.data.status as never, event.data.message)
        break

      case 'RESTAURANT_CREATED':
        upsertRestaurant(event.data.restaurant_id, {
          id:           event.data.restaurant_id,
          name:         event.data.name,
          lat:          event.data.lat,
          lon:          event.data.lon,
          zone:         event.data.zone,
          cuisine_type: event.data.cuisine_type,
        })
        addRestaurantMarker(event.data.restaurant_id, {
          lat:  event.data.lat,
          lon:  event.data.lon,
          name: event.data.name,
          zone: event.data.zone,
        })
        break

      case 'ORDER_CREATED':
        upsertOrder(event.data.order_id, {
          id:                     event.data.order_id,
          lat:                    event.data.lat,
          lon:                    event.data.lon,
          zone:                   event.data.zone,
          order_type:             event.data.order_type,
          status:                 'pending',
          cluster_id:             null,
          driver_id:              null,
          estimated_prep_minutes: event.data.estimated_prep_minutes,
          restaurant_name:        event.data.restaurant_name ?? '',
          restaurant_id:          event.data.restaurant_id ?? null,
          restaurant_lat:         event.data.restaurant_lat ?? null,
          restaurant_lon:         event.data.restaurant_lon ?? null,
          restaurant_zone:        event.data.restaurant_zone ?? '',
          ordered_at:             event.data.ordered_at ?? null,
          delivered_at:           null,
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
        const driverColor = getOrAssignDriverColor(event.data.driver_id)
        upsertRoute(event.data.route_id, {
          id:                         event.data.route_id,
          cluster_id:                 event.data.cluster_id,
          driver_id:                  event.data.driver_id,
          driver_name:                event.data.driver_name ?? '',
          method:                     event.data.method as never,
          geojson:                    event.data.geojson,
          total_distance_km:          event.data.total_distance_km,
          estimated_duration_minutes: event.data.estimated_duration_minutes,
          naive_distance_km:          event.data.naive_distance_km,
          color: driverColor,
        })
        upsertCluster(event.data.cluster_id, { driver_id: event.data.driver_id })
        initDriverTrail(event.data.driver_id, driverColor)
        break
      }

      case 'DRIVER_ASSIGNED':
        // FIX: initialise deliveries_completed to 0 here so the field always
        // exists as a number before any DELIVERY_COMPLETED increments it.
        upsertDriver(event.data.driver_id, {
          status:               'assigned',
          cluster_id:           event.data.cluster_id,
          name:                 event.data.driver_name,
          deliveries_completed: 0,
        })
        {
          const color = getOrAssignDriverColor(event.data.driver_id)
          initDriverTrail(event.data.driver_id, color)
          setActiveDriver(event.data.driver_id)
        }
        break

      case 'DRIVER_MOVED': {
        const { driver_id, driver_name, lat, lon, progress_pct, current_order_id, phase, restaurant_name } = event.data
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) break

        updateDriverPosition(driver_id, {
          lat, lon,
          progress:       progress_pct,
          currentOrderId: current_order_id,
          driverName:     driver_name ?? '',
          phase:          phase ?? 'delivery',
          restaurantName: restaurant_name ?? '',
        })
        upsertDriver(driver_id, { lat, lon, status: 'en_route' })
        appendTrailPoint(driver_id, lon, lat)
        break
      }

      case 'DELIVERY_COMPLETED': {
        markOrderDelivered(event.data.order_id)
        upsertOrder(event.data.order_id, {
          status:       'delivered',
          delivered_at: event.data.delivered_at ?? null,
        })
        // FIX: Read current count from store at event time, default to 0 if
        // undefined (prevents NaN). Use Math.max to ensure we never go below 0.
        const currentDriver = useSimulationStore.getState().drivers[event.data.driver_id]
        const currentCount = typeof currentDriver?.deliveries_completed === 'number'
          ? currentDriver.deliveries_completed
          : 0
        upsertDriver(event.data.driver_id, {
          deliveries_completed: currentCount + 1,
        })
        break
      }

      case 'DELIVERY_TABLE':
        setDeliveryRecords(event.data.records)
        break

      case 'METRICS_UPDATED': {
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
    upsertRestaurant, setDeliveryRecords,
    setMetrics, setCompletionSummary, updateDriverPosition, markOrderDelivered,
    setShowCompletion, initDriverTrail, appendTrailPoint, finalizeDriverTrail,
    setActiveDriver, addRestaurantMarker,
  ])

  const startSimulation = useCallback(async (overrides?: Partial<SimulationConfig>) => {
    wsRef.current?.close()
    reset()
    resetMap()
    setShowCompletion(false)
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