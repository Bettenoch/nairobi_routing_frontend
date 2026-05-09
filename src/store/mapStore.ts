//src/store/mapStore.ts
import { create } from 'zustand'

interface DriverPosition {
  lat: number
  lon: number
  progress: number
  currentOrderId: string | null
  driverName: string   // ← NEW for hover tooltip
}

interface DriverTrail {
  coordinates: [number, number][]
  color:       string
  driverId:    string
  isActive:    boolean
}

interface MapState {
  driverPositions:   Record<string, DriverPosition>
  deliveredOrderIds: Set<string>
  highlightedClusterId: string | null
  driverTrails:      Record<string, DriverTrail>
  activeDriverId:    string | null

  updateDriverPosition: (driverId: string, pos: DriverPosition) => void
  markOrderDelivered:   (orderId: string) => void
  setHighlightedCluster:(id: string | null) => void
  initDriverTrail:      (driverId: string, color: string) => void
  appendTrailPoint:     (driverId: string, lon: number, lat: number) => void
  finalizeDriverTrail:  (driverId: string) => void
  setActiveDriver:      (id: string | null) => void
  resetMap:             () => void
}

export const useMapStore = create<MapState>((set) => ({
  driverPositions:      {},
  deliveredOrderIds:    new Set(),
  highlightedClusterId: null,
  driverTrails:         {},
  activeDriverId:       null,

  updateDriverPosition: (id, pos) =>
    set((s) => ({ driverPositions: { ...s.driverPositions, [id]: pos } })),

  markOrderDelivered: (id) =>
    set((s) => {
      const next = new Set(s.deliveredOrderIds)
      next.add(id)
      return { deliveredOrderIds: next }
    }),

  setHighlightedCluster: (id) => set({ highlightedClusterId: id }),

  initDriverTrail: (driverId, color) =>
    set((s) => {
      const existing = s.driverTrails[driverId]
      if (existing) {
        return {
          driverTrails: {
            ...s.driverTrails,
            [driverId]: { ...existing, color, isActive: true },
          },
          activeDriverId: driverId,
        }
      }
      return {
        driverTrails: {
          ...s.driverTrails,
          [driverId]: { coordinates: [], color, driverId, isActive: true },
        },
        activeDriverId: driverId,
      }
    }),

  appendTrailPoint: (driverId, lon, lat) =>
    set((s) => {
      const trail = s.driverTrails[driverId]
      if (!trail) return s

      const last = trail.coordinates[trail.coordinates.length - 1]
      if (last) {
        const dx = Math.abs(lon - last[0])
        const dy = Math.abs(lat - last[1])
        if (dx < 0.00005 && dy < 0.00005) return s
      }

      const coords = [...trail.coordinates, [lon, lat] as [number, number]]
      const trimmed = coords.length > 300 ? coords.slice(coords.length - 300) : coords

      return {
        driverTrails: {
          ...s.driverTrails,
          [driverId]: { ...trail, coordinates: trimmed },
        },
      }
    }),

  finalizeDriverTrail: (driverId) =>
    set((s) => {
      const trail = s.driverTrails[driverId]
      if (!trail) return s
      return {
        driverTrails: {
          ...s.driverTrails,
          [driverId]: { ...trail, isActive: false },
        },
        activeDriverId: null,
      }
    }),

  setActiveDriver: (id) => set({ activeDriverId: id }),

  resetMap: () =>
    set({
      driverPositions:      {},
      deliveredOrderIds:    new Set(),
      highlightedClusterId: null,
      driverTrails:         {},
      activeDriverId:       null,
    }),
}))