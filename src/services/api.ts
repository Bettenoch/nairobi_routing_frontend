//src/services/api.ts

import type {
  SimulationConfig,
  StartSimulationResponse,
  AlgorithmSummary,
  AlgorithmDetail,
  ConceptDetail,
} from '@/types'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { message?: string }).message || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  startSimulation: (config: SimulationConfig) =>
    request<StartSimulationResponse>('/api/simulate', {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  getDefaultScenario: () =>
    request<SimulationConfig>('/api/scenario'),

  getSimulationState: (sessionId: string) =>
    request<unknown>(`/api/simulation/${sessionId}`),

  listAlgorithms: () =>
    request<AlgorithmSummary[]>('/api/algorithms'),

  getAlgorithm: (id: string) =>
    request<AlgorithmDetail>(`/api/algorithms/${id}`),

  getConcept: (id: string) =>
    request<ConceptDetail>(`/api/concepts/${id}`),

  health: () =>
    request<{ status: string; graph: { ready: boolean } }>('/api/health'),
}