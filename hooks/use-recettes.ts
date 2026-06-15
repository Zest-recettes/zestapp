import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { RecetteRow } from '../types/recette'

export function useRecettes() {
  const [recettes, setRecettes] = useState<RecetteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('recettes')
      .select('id, titre, temps_preparation, proteines, type_plat, vegetarien, complexite, saison, regime, dominant_protein')
      .order('titre')
    if (error) {
      console.error('[useRecettes] erreur:', error.message, error.code)
      setError(error.message)
    } else {
      setRecettes((data as RecetteRow[]) || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { recettes, loading, error, refetch: fetch }
}

export function useRecettesByIds(ids: number[]) {
  const [recettes, setRecettes] = useState<RecetteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!ids.length) { setLoading(false); return }

    let cancelled = false
    setLoading(true)
    setError(null)

    supabase
      .from('recettes')
      .select('id, titre, temps_preparation, proteines, type_plat, vegetarien, complexite, saison, regime, dominant_protein')
      .in('id', ids)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          console.error('[useRecettesByIds] erreur:', error.message, error.code, error.details)
          setError(error.message)
          setRecettes([])
        } else {
          console.log('[useRecettesByIds] chargé:', data?.length, 'recettes')
          setRecettes((data as RecetteRow[]) || [])
        }
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [ids.join(','), tick])

  return { recettes, loading, error, refetch: () => setTick(t => t + 1) }
}
