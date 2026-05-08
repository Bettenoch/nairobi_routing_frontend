//src/App.tsx

import { useEffect, useState } from 'react'
import NairobiMap from '@/components/map/NairobiMap'

import LearningDrawer from '@/components/learning/LearningDrawer'
import CompletionOverlay from '@/components/ui/CompletionOverlay'
import LoadingOverlay from '@/components/ui/LoadingOverlay'
import { api } from '@/services/api'
import { MAPBOX_TOKEN } from '@/constants/mapConfig'
import Sidebar from './components/sidebar/SideBar';
import MapHUD from './components/ui/mapHUD';

export default function App() {
  const [graphReady, setGraphReady] = useState(false)
  const [graphChecking, setGraphChecking] = useState(true)
  const [missingToken, setMissingToken] = useState(false)

  // Check for Mapbox token
  useEffect(() => {
    if (!MAPBOX_TOKEN || MAPBOX_TOKEN.includes('your_token_here')) {
      setMissingToken(true)
    }
  }, [])

  // Poll backend health until graph is ready
  useEffect(() => {
    let cancelled = false

    async function checkHealth() {
      for (let i = 0; i < 60; i++) {
        if (cancelled) return
        try {
          const h = await api.health()
          if (h.graph.ready) {
            if (!cancelled) {
              setGraphReady(true)
              setGraphChecking(false)
            }
            return
          }
        } catch {
          // backend might not be running yet
        }
        await new Promise((r) => setTimeout(r, 2000))
      }
      // Give up after 2 min — show UI anyway
      if (!cancelled) {
        setGraphReady(false)
        setGraphChecking(false)
      }
    }

    checkHealth()
    return () => { cancelled = true }
  }, [])

  if (missingToken) {
    return <TokenWarning />
  }

  if (graphChecking) {
    return <LoadingOverlay message="Connecting to backend & loading road graph…" />
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Left sidebar */}
      <Sidebar />

      {/* Map area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <NairobiMap />
        <MapHUD />

        {/* Backend offline warning */}
        {!graphReady && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2"
            style={{
              background: 'rgba(255,170,0,0.1)',
              border: '1px solid rgba(255,170,0,0.3)',
              borderRadius: 8,
              padding: '8px 16px',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: '#ffaa00',
              zIndex: 20,
              backdropFilter: 'blur(8px)',
            }}
          >
            ⚠ Backend offline — map visible but simulation disabled
          </div>
        )}
      </div>

      {/* Right drawer (slides in over map) */}
      <LearningDrawer />

      {/* Completion overlay */}
      <CompletionOverlay />
    </div>
  )
}

function TokenWarning() {
  return (
    <div
      style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--color-void)', padding: 40, textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 24 }}>🔑</div>
      <h1
        style={{
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24,
          color: '#e8f4fd', marginBottom: 12,
        }}
      >
        Mapbox Token Required
      </h1>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#7fb3d0', maxWidth: 480, lineHeight: 1.7, marginBottom: 24 }}>
        This app uses Mapbox GL JS for the interactive map. You need a free Mapbox token to render it.
      </p>
      <div
        style={{
          background: 'rgba(0,204,255,0.05)', border: '1px solid rgba(0,204,255,0.2)',
          borderRadius: 10, padding: '16px 24px', fontFamily: 'var(--font-mono)',
          fontSize: 12, color: '#00ccff', marginBottom: 24, maxWidth: 480, textAlign: 'left',
        }}
      >
        <div style={{ color: '#3a6080', marginBottom: 8, fontSize: 9, letterSpacing: '0.1em' }}>SETUP STEPS</div>
        <ol style={{ paddingLeft: 16, margin: 0, lineHeight: 2 }}>
          <li>Go to <a href="https://account.mapbox.com" target="_blank" style={{ color: '#00ccff' }}>account.mapbox.com</a> (free)</li>
          <li>Copy your Default Public Token</li>
          <li>Create <code style={{ color: '#7fff00' }}>.env.local</code> in the project root</li>
          <li>Add: <code style={{ color: '#7fff00' }}>VITE_MAPBOX_TOKEN=pk.your_token</code></li>
          <li>Restart the dev server</li>
        </ol>
      </div>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#3a6080' }}>
        Free tier: 50,000 map loads/month — more than enough for a portfolio project.
      </p>
    </div>
  )
}