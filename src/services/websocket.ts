//src/hooks/websocket.ts

import type { SimulationEvent } from '@/types'

type EventHandler = (event: SimulationEvent) => void
type StatusHandler = (connected: boolean) => void

const WS_BASE = import.meta.env.VITE_WS_URL?.replace(/^http/, 'ws') ||
  `ws://${window.location.hostname}:8000`

export class SimulationWebSocket {
  private ws: WebSocket | null = null
  private sessionId: string
  private onEvent: EventHandler
  private onStatus: StatusHandler
  private reconnectAttempts = 0
  private maxReconnects = 5
  private pingInterval: ReturnType<typeof setInterval> | null = null
  private closed = false

  constructor(sessionId: string, onEvent: EventHandler, onStatus: StatusHandler) {
    this.sessionId = sessionId
    this.onEvent = onEvent
    this.onStatus = onStatus
  }

  connect(): void {
    if (this.closed) return
    const url = `${WS_BASE}/ws/simulation/${this.sessionId}`
    console.log(`[WS] Connecting to ${url}`)

    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      console.log(`[WS] Connected — session: ${this.sessionId}`)
      this.reconnectAttempts = 0
      this.onStatus(true)
      this.startPing()
    }

    this.ws.onmessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data as string) as SimulationEvent
        this.onEvent(data)
      } catch (err) {
        console.warn('[WS] Parse error:', err)
      }
    }

    this.ws.onclose = (e) => {
      console.log(`[WS] Closed (code=${e.code})`)
      this.stopPing()
      this.onStatus(false)

      if (!this.closed && this.reconnectAttempts < this.maxReconnects) {
        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 10000)
        this.reconnectAttempts++
        console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)
        setTimeout(() => this.connect(), delay)
      }
    }

    this.ws.onerror = (e) => {
      console.error('[WS] Error:', e)
    }
  }

  send(message: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  switchMethod(method: string): void {
    this.send({ action: 'switch_method', method })
  }

  close(): void {
    this.closed = true
    this.stopPing()
    this.ws?.close()
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      this.send({ action: 'ping' })
    }, 30_000)
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }
}