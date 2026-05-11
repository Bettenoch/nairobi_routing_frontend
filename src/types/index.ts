// src/types/index.ts — UPDATED

export type RoutingMethod = 'euclidean' | 'haversine' | 'street_network'
export type OrderStatus = 'pending' | 'clustered' | 'assigned' | 'in_transit' | 'delivered'
export type DriverStatus = 'idle' | 'assigned' | 'en_route' | 'completed'
export type SimulationStatus =
  | 'initialising' | 'generating_orders' | 'clustering'
  | 'routing' | 'animating' | 'completed' | 'failed'

// ─── Domain models ────────────────────────────────────────────────────────────

export interface Restaurant {
  id: string
  name: string
  lat: number
  lon: number
  zone: string
  cuisine_type: string
}

export interface Order {
  id: string
  lat: number
  lon: number
  zone: string
  order_type: string
  status: OrderStatus
  cluster_id: string | null
  driver_id: string | null
  estimated_prep_minutes: number
  restaurant_name: string
  restaurant_id: string | null
  restaurant_lat: number | null
  restaurant_lon: number | null
  restaurant_zone: string
  ordered_at: string | null
  delivered_at: string | null
}

export interface Driver {
  id: string
  name: string
  lat: number
  lon: number
  zone: string
  status: DriverStatus
  capacity: number
  cluster_id: string | null
  total_distance_km: number
  deliveries_completed: number
}

export interface Cluster {
  id: string
  order_ids: string[]
  centroid_lat: number
  centroid_lon: number
  color: string
  driver_id: string | null
  zone_label: string
  algorithm_used: string
}

export interface Route {
  id: string
  cluster_id: string
  driver_id: string
  driver_name: string
  method: RoutingMethod
  geojson: GeoJSONFeature | null
  total_distance_km: number
  estimated_duration_minutes: number
  naive_distance_km: number
  color: string
}

export interface GeoJSONFeature {
  type: 'Feature'
  geometry: {
    type: 'LineString'
    coordinates: [number, number][]
  }
  properties: Record<string, unknown>
}

export interface SimulationMetrics {
  deliveries_completed: number
  deliveries_total: number
  optimised_distance_km: number
  naive_distance_km: number
  distance_saved_km: number
  savings_percentage: number
  fuel_saved_litres: number
  cost_saved_kes: number
  time_saved_minutes: number
  co2_saved_kg: number
  active_drivers: number
  clusters_formed: number
}

export interface SimulationConfig {
  order_count: number
  driver_count: number
  restaurant_count: number   // ← NEW
  routing_method: RoutingMethod
  scenario_label: string
  simulation_speed: number
}

export interface DeliveryRecord {
  order_id: string
  driver_name: string
  restaurant_name: string
  restaurant_zone: string
  customer_zone: string
  ordered_at: string | null
  delivered_at: string | null
  duration_minutes: number | null
  distance_km: number
  algorithm: string
  status: string
}

// ─── WebSocket events ─────────────────────────────────────────────────────────

export type SimulationEvent =
  | { event: 'RESTAURANT_CREATED';   session_id: string; data: RestaurantCreatedData }
  | { event: 'ORDER_CREATED';        session_id: string; data: OrderCreatedData }
  | { event: 'ORDER_STATUS_CHANGED'; session_id: string; data: OrderStatusChangedData }
  | { event: 'CLUSTER_FORMED';       session_id: string; data: ClusterFormedData }
  | { event: 'ROUTE_COMPUTED';       session_id: string; data: RouteComputedData }
  | { event: 'DRIVER_ASSIGNED';      session_id: string; data: DriverAssignedData }
  | { event: 'DRIVER_MOVED';         session_id: string; data: DriverMovedData }
  | { event: 'DELIVERY_COMPLETED';   session_id: string; data: DeliveryCompletedData }
  | { event: 'DELIVERY_TABLE';       session_id: string; data: DeliveryTableData }
  | { event: 'METRICS_UPDATED';      session_id: string; data: SimulationMetrics }
  | { event: 'SIMULATION_STATUS';    session_id: string; data: SimulationStatusData }
  | { event: 'SIMULATION_COMPLETED'; session_id: string; data: SimulationCompletedData }
  | { event: 'ERROR';                session_id: string; data: ErrorData }
  | { event: 'PONG' }

export interface RestaurantCreatedData {
  restaurant_id: string
  name: string
  lat: number
  lon: number
  zone: string
  cuisine_type: string
}

export interface OrderCreatedData {
  order_id: string
  lat: number
  lon: number
  zone: string
  order_type: string
  estimated_prep_minutes: number
  restaurant_name: string
  restaurant_id: string | null
  restaurant_lat: number | null
  restaurant_lon: number | null
  restaurant_zone: string
  ordered_at: string | null
}

export interface OrderStatusChangedData {
  order_id: string
  status: OrderStatus
  driver_id: string | null
}

export interface ClusterFormedData {
  cluster_id: string
  order_ids: string[]
  centroid_lat: number
  centroid_lon: number
  color: string
  zone_label: string
  size: number
}

export interface RouteComputedData {
  route_id: string
  cluster_id: string
  driver_id: string
  driver_name: string
  method: string
  geojson: GeoJSONFeature
  total_distance_km: number
  estimated_duration_minutes: number
  naive_distance_km: number
  color: string
}

export interface DriverAssignedData {
  driver_id: string
  driver_name: string
  cluster_id: string
  order_count: number
}

export interface DriverMovedData {
  driver_id: string
  driver_name: string
  lat: number
  lon: number
  progress_pct: number
  current_order_id: string | null
  phase: string
  restaurant_name: string
}

export interface DeliveryCompletedData {
  order_id: string
  driver_id: string
  driver_name: string
  restaurant_name: string
  restaurant_zone: string
  customer_zone: string
  time_taken_minutes: number
  distance_km: number
  ordered_at: string | null
  delivered_at: string | null
  algorithm: string
}

export interface DeliveryTableData {
  records: DeliveryRecord[]
  total_count: number
}

export interface SimulationStatusData {
  status: string
  message: string
}

export interface SimulationCompletedData {
  session_id: string
  total_deliveries: number
  total_distance_km: number
  total_savings_pct: number
  duration_seconds: number
}

export interface ErrorData {
  error_code: string
  message: string
}

// ─── API types ────────────────────────────────────────────────────────────────

export interface StartSimulationResponse {
  session_id: string
  ws_url: string
  order_count: number
  driver_count: number
  restaurant_count: number
  routing_method: string
  message: string
}

export interface AlgorithmSummary {
  id: string
  name: string
  category: string
  short_description: string
  complexity: string
}

export interface AlgorithmDetail extends AlgorithmSummary {
  formula: string
  explanation: string
  pros: string[]
  cons: string[]
  real_world_use: string
  nairobi_context: string
  learn_more: string
}

export interface ConceptDetail {
  id: string
  name: string
  explanation: string
  why_it_matters: string
  key_question: string
}