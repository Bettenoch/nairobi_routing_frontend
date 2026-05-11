//src/hooks/useAlgorithminfo.ts

import { useEffect, useState } from 'react'
import { api } from '@/services/api'
import type { AlgorithmDetail, ConceptDetail } from '@/types'

export function useAlgorithmInfo(id: string | null) {
  const [data, setData] = useState<AlgorithmDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) { setData(null); return }
    setLoading(true)
    setError(null)
    api.getAlgorithm(id)
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  return { data, loading, error }
}

export function useConceptInfo(id: string | null) {
  const [data, setData] = useState<ConceptDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!id) { setData(null); return }
    setLoading(true)
    api.getConcept(id)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  return { data, loading }
}