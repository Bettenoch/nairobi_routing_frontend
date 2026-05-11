//src/components/learning/LearningDrawer.tsx
import { X, ExternalLink, ChevronRight } from 'lucide-react'
import { useUIStore } from '@/store/uiStore'

import type { AlgorithmDetail, ConceptDetail } from '@/types'
import { useAlgorithmInfo, useConceptInfo } from '@/hooks/useAlgorithminfo';

export default function LearningDrawer() {
  const { drawerOpen, drawerContent, closeDrawer } = useUIStore()

  if (!drawerOpen || !drawerContent) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0"
        style={{ background: 'rgba(5,8,16,0.5)', zIndex: 40 }}
        onClick={closeDrawer}
      />

      {/* Drawer */}
      <div
        className="animate-slide-right fixed top-0 right-0 h-full flex flex-col"
        style={{
          width: 380,
          background: 'rgba(8,12,24,0.98)',
          borderLeft: '1px solid #1e3a5f',
          boxShadow: '-8px 0 60px rgba(0,0,0,0.7)',
          zIndex: 50,
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid #1e3a5f' }}
        >
          <div className="flex items-center gap-2">
            <div
              style={{
                width: 24, height: 24,
                background: 'rgba(0,204,255,0.1)',
                border: '1px solid rgba(0,204,255,0.3)',
                borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12,
              }}
            >
              📚
            </div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: '#00ccff',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {drawerContent.type === 'algorithm' ? 'Algorithm' : 'Concept'}
            </span>
          </div>
          <button
            onClick={closeDrawer}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#3a6080', padding: 4,
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#e8f4fd')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#3a6080')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {drawerContent.type === 'algorithm' ? (
            <AlgorithmContent id={drawerContent.id} />
          ) : (
            <ConceptContent id={drawerContent.id} />
          )}
        </div>
      </div>
    </>
  )
}

function AlgorithmContent({ id }: { id: string }) {
  const { data, loading, error } = useAlgorithmInfo(id)

  if (loading) return <DrawerSkeleton />
  if (error) return <DrawerError message={error} />
  if (!data) return null

  return <AlgorithmCard data={data} />
}

function ConceptContent({ id }: { id: string }) {
  const { data, loading } = useConceptInfo(id)

  if (loading) return <DrawerSkeleton />
  if (!data) return null

  return <ConceptCard data={data} />
}

function AlgorithmCard({ data }: { data: AlgorithmDetail }) {
  const categoryColor = {
    distance: '#00ccff',
    clustering: '#ffaa00',
    routing: '#7fff00',
  }[data.category] ?? '#7fb3d0'

  return (
    <div className="px-5 py-4 space-y-5">
      {/* Title */}
      <div>
        <div
          className="inline-block px-2 py-0.5 rounded mb-2"
          style={{
            background: `${categoryColor}18`,
            border: `1px solid ${categoryColor}40`,
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: categoryColor,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          {data.category}
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 20,
            color: '#e8f4fd',
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {data.name}
        </h2>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#3a6080', marginTop: 4 }}>
          {data.complexity}
        </p>
      </div>

      {/* Formula */}
      <Section title="Formula">
        <div
          style={{
            background: 'rgba(0,204,255,0.04)',
            border: '1px solid rgba(0,204,255,0.15)',
            borderRadius: 8,
            padding: '10px 14px',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: '#00ccff',
            lineHeight: 1.8,
            whiteSpace: 'pre-wrap',
          }}
        >
          {data.formula}
        </div>
      </Section>

      {/* Explanation */}
      <Section title="How It Works">
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#7fb3d0', lineHeight: 1.7, margin: 0 }}>
          {data.explanation}
        </p>
      </Section>

      {/* Pros / Cons */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#4a9900', letterSpacing: '0.1em', marginBottom: 6 }}>
            ✓ ADVANTAGES
          </div>
          <ul className="space-y-1">
            {data.pros.map((p, i) => (
              <li key={i} style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#7fb3d0', lineHeight: 1.5 }}>
                <span style={{ color: '#4a9900', marginRight: 4 }}>›</span>{p}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#ff4d6d', letterSpacing: '0.1em', marginBottom: 6 }}>
            ✗ LIMITATIONS
          </div>
          <ul className="space-y-1">
            {data.cons.map((c, i) => (
              <li key={i} style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#7fb3d0', lineHeight: 1.5 }}>
                <span style={{ color: '#ff4d6d', marginRight: 4 }}>›</span>{c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Nairobi context */}
      <Section title="In Nairobi">
        <div
          style={{
            background: 'rgba(127,255,0,0.04)',
            border: '1px solid rgba(127,255,0,0.15)',
            borderRadius: 8,
            padding: '10px 14px',
          }}
        >
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#7fb3d0', lineHeight: 1.6, margin: 0 }}>
            {data.nairobi_context}
          </p>
        </div>
      </Section>

      {/* Real world use */}
      <Section title="Real World Application">
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#7fb3d0', lineHeight: 1.6, margin: 0 }}>
          {data.real_world_use}
        </p>
      </Section>

      {/* Learn more */}
      <a
        href={data.learn_more}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '10px 14px',
          borderRadius: 8,
          border: '1px solid #1e3a5f',
          textDecoration: 'none',
          color: '#7fb3d0',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#007799'
          e.currentTarget.style.color = '#00ccff'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = '#1e3a5f'
          e.currentTarget.style.color = '#7fb3d0'
        }}
      >
        <ExternalLink size={12} />
        Learn more on Wikipedia
        <ChevronRight size={12} style={{ marginLeft: 'auto' }} />
      </a>
    </div>
  )
}

function ConceptCard({ data }: { data: ConceptDetail }) {
  return (
    <div className="px-5 py-4 space-y-5">
      <div>
        <div
          className="inline-block px-2 py-0.5 rounded mb-2"
          style={{
            background: 'rgba(0,204,255,0.1)',
            border: '1px solid rgba(0,204,255,0.25)',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: '#00ccff',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          GIS CONCEPT
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 20,
            color: '#e8f4fd',
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {data.name}
        </h2>
      </div>

      <Section title="Overview">
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#7fb3d0', lineHeight: 1.7, margin: 0 }}>
          {data.explanation}
        </p>
      </Section>

      <Section title="Why It Matters">
        <div
          style={{
            background: 'rgba(0,204,255,0.04)',
            border: '1px solid rgba(0,204,255,0.15)',
            borderRadius: 8,
            padding: '10px 14px',
          }}
        >
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#7fb3d0', lineHeight: 1.6, margin: 0 }}>
            {data.why_it_matters}
          </p>
        </div>
      </Section>

      <Section title="Key Question to Ask">
        <div
          style={{
            borderLeft: '3px solid #00ccff',
            paddingLeft: 14,
          }}
        >
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: '#e8f4fd', lineHeight: 1.5, margin: 0 }}>
            {data.key_question}
          </p>
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: '#3a6080',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: 8,
          paddingBottom: 4,
          borderBottom: '1px solid #1e3a5f',
        }}
      >
        {title}
      </div>
      {children}
    </div>
  )
}

function DrawerSkeleton() {
  return (
    <div className="px-5 py-4 space-y-4">
      {[20, 8, 60, 40, 80].map((h, i) => (
        <div
          key={i}
          className="loading-shimmer"
          style={{ height: h, borderRadius: 6 }}
        />
      ))}
    </div>
  )
}

function DrawerError({ message }: { message: string }) {
  return (
    <div className="px-5 py-4">
      <div
        style={{
          background: 'rgba(255,77,109,0.08)',
          border: '1px solid rgba(255,77,109,0.2)',
          borderRadius: 8,
          padding: 16,
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: '#ff4d6d',
        }}
      >
        Failed to load: {message}
      </div>
    </div>
  )
}