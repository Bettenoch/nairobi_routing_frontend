// src/constants/mapConfig.ts

export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string

if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'your_token_here') {
  console.warn(
    '⚠️  VITE_MAPBOX_TOKEN is missing or placeholder. ' +
    'Add it to .env.local and restart the dev server.'
  )
}

// Dark ops-center map style
export const MAPBOX_STYLE = 'mapbox://styles/mapbox/dark-v11'

// Nairobi center + zoom
export const INITIAL_VIEWPORT = {
  longitude: 36.8172,
  latitude: -1.2864,
  zoom: 11.5,
  pitch: 45,
  bearing: -10,
}

// Color palette
export const COLORS = {
  cyan: '#00ccff',
  cyanDim: '#007799',
  lime: '#7fff00',
  limeDim: '#4a9900',
  amber: '#ffaa00',
  coral: '#ff4d6d',
  panel: '#111827',
  surface: '#1a2235',
  border: '#1e3a5f',
  textPrimary: '#e8f4fd',
  textMuted: '#3a6080',
}

// Cluster colors (matches backend)
export const CLUSTER_COLORS = [
  '#FF6B35', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
]

export const ROUTING_METHODS = [
  {
    id: 'euclidean' as const,
    label: 'Euclidean',
    description: 'Straight lines — ignores roads',
    color: '#ffaa00',
    icon: '📐',
  },
  {
    id: 'haversine' as const,
    label: 'Haversine',
    description: 'Earth-curve corrected',
    color: '#00ccff',
    icon: '🌐',
  },
  {
    id: 'street_network' as const,
    label: 'Street Network',
    description: 'Real Nairobi roads via OSRM',
    color: '#7fff00',
    icon: '🛣️',
  },
]

export const ORDER_TYPE_ICONS: Record<string, string> = {
  food: '🍔',
  grocery: '🛒',
  pharmacy: '💊',
  electronics: '📱',
}

export const DRIVER_STATUS_COLORS: Record<string, string> = {
  idle: '#3a6080',
  assigned: '#ffaa00',
  en_route: '#00ccff',
  completed: '#7fff00',
}