//src/components/ui/LoadingOverlay.tsx

export default function LoadingOverlay({ message }: { message?: string }) {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: 'var(--color-void)', zIndex: 100 }}
    >
      {/* Animated radar circles */}
      <div style={{ position: 'relative', width: 120, height: 120, marginBottom: 32 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              inset: `${i * 20}px`,
              borderRadius: '50%',
              border: '1px solid rgba(0,204,255,0.3)',
              animation: `ping ${1.5 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            inset: '40px',
            borderRadius: '50%',
            background: 'rgba(0,204,255,0.1)',
            border: '2px solid #00ccff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            boxShadow: '0 0 20px rgba(0,204,255,0.3)',
          }}
        >
          🗺️
        </div>
      </div>

      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 20,
          color: '#e8f4fd',
          letterSpacing: '0.04em',
          marginBottom: 8,
        }}
      >
        NAIROBI ROUTING
      </div>

      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: '#00ccff',
          letterSpacing: '0.1em',
          marginBottom: 24,
        }}
      >
        {message ?? 'Loading road network…'}
      </div>

      {/* Progress dots */}
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#00ccff',
              animation: `pulse 1.5s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
              opacity: 0.4,
            }}
          />
        ))}
      </div>
    </div>
  )
}