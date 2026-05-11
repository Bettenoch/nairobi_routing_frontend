// src/store/simulationStore.ts 

import { create } from 'zustand'
import type {
  Order, Driver, Cluster, Route, SimulationMetrics,
  SimulationConfig, SimulationStatus, RoutingMethod,
  Restaurant, DeliveryRecord,
} from '@/types'

interface SimulationState {
  sessionId: string | null
  wsConnected: boolean
  status: SimulationStatus | null
  statusMessage: string

  orders: Record<string, Order>
  drivers: Record<string, Driver>
  clusters: Record<string, Cluster>
  routes: Record<string, Route>
  restaurants: Record<string, Restaurant>   // ← NEW
  deliveryRecords: DeliveryRecord[]          // ← NEW
  metrics: SimulationMetrics
  config: SimulationConfig

  completionSummary: {
    total_deliveries: number
    total_distance_km: number
    total_savings_pct: number
    duration_seconds: number
  } | null

  setSessionId: (id: string) => void
  setWsConnected: (v: boolean) => void
  setStatus: (s: SimulationStatus, msg: string) => void
  upsertOrder: (id: string, data: Partial<Order>) => void
  upsertDriver: (id: string, data: Partial<Driver>) => void
  upsertCluster: (id: string, data: Partial<Cluster>) => void
  upsertRoute: (id: string, data: Partial<Route>) => void
  upsertRestaurant: (id: string, data: Restaurant) => void  // ← NEW
  addDeliveryRecord: (r: DeliveryRecord) => void            // ← NEW
  setDeliveryRecords: (records: DeliveryRecord[]) => void   // ← NEW
  setMetrics: (m: SimulationMetrics) => void
  setConfig: (c: Partial<SimulationConfig>) => void
  setCompletionSummary: (s: SimulationState['completionSummary']) => void
  reset: () => void
}

const DEFAULT_METRICS: SimulationMetrics = {
  deliveries_completed: 0,
  deliveries_total: 0,
  optimised_distance_km: 0,
  naive_distance_km: 0,
  distance_saved_km: 0,
  savings_percentage: 0,
  fuel_saved_litres: 0,
  cost_saved_kes: 0,
  time_saved_minutes: 0,
  co2_saved_kg: 0,
  active_drivers: 0,
  clusters_formed: 0,
}

const DEFAULT_CONFIG: SimulationConfig = {
  order_count: 30,
  driver_count: 5,
  restaurant_count: 5,
  routing_method: 'street_network',
  scenario_label: 'UberEats Nairobi — Friday 7PM',
  simulation_speed: 5.0,
}

export const useSimulationStore = create<SimulationState>((set) => ({
  sessionId: null,
  wsConnected: false,
  status: null,
  statusMessage: 'Ready to simulate',
  orders: {},
  drivers: {},
  clusters: {},
  routes: {},
  restaurants: {},       // ← NEW
  deliveryRecords: [],   // ← NEW
  metrics: { ...DEFAULT_METRICS },
  config: { ...DEFAULT_CONFIG },
  completionSummary: null,

  setSessionId: (id) => set({ sessionId: id }),
  setWsConnected: (v) => set({ wsConnected: v }),
  setStatus: (s, msg) => set({ status: s, statusMessage: msg }),

  upsertOrder: (id, data) =>
    set((state) => ({
      orders: { ...state.orders, [id]: { ...state.orders[id], ...data } as Order },
    })),

  upsertDriver: (id, data) =>
    set((state) => ({
      drivers: { ...state.drivers, [id]: { ...state.drivers[id], ...data } as Driver },
    })),

  upsertCluster: (id, data) =>
    set((state) => ({
      clusters: { ...state.clusters, [id]: { ...state.clusters[id], ...data } as Cluster },
    })),

  upsertRoute: (id, data) =>
    set((state) => ({
      routes: { ...state.routes, [id]: { ...state.routes[id], ...data } as Route },
    })),

  upsertRestaurant: (id, data) =>
    set((state) => ({
      restaurants: { ...state.restaurants, [id]: data },
    })),

  addDeliveryRecord: (r) =>
    set((state) => ({
      deliveryRecords: [...state.deliveryRecords, r],
    })),

  setDeliveryRecords: (records) => set({ deliveryRecords: records }),

  setMetrics: (m) => set({ metrics: m }),

  setConfig: (c) =>
    set((state) => ({ config: { ...state.config, ...c } })),

  setCompletionSummary: (s) => set({ completionSummary: s }),

  reset: () =>
    set({
      sessionId: null,
      wsConnected: false,
      status: null,
      statusMessage: 'Ready to simulate',
      orders: {},
      drivers: {},
      clusters: {},
      routes: {},
      restaurants: {},
      deliveryRecords: [],
      metrics: { ...DEFAULT_METRICS },
      completionSummary: null,
    }),
}))