import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ShoppingRow, ShoppingSection } from '../types/shopping'

interface UseShoppingListResult {
  sections: ShoppingSection[]
  rawRows: ShoppingRow[]
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Appelle zest_shopping_list(recipe_ids) sur Supabase et retourne les données
 * groupées par catégorie.
 *
 * RÈGLE ABSOLUE : aucune logique de rendu ici.
 * shopping_label vient de zest_render_label_v3() — on ne le retouche pas.
 */
export function useShoppingList(recipeIds: number[]): UseShoppingListResult {
  const [rawRows, setRawRows] = useState<ShoppingRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (recipeIds.length === 0) {
      setRawRows([])
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    supabase
      .rpc('zest_shopping_list', { recipe_ids: recipeIds })
      .then(({ data, error: rpcError }) => {
        if (cancelled) return
        if (rpcError) {
          setError(rpcError.message)
          setRawRows([])
        } else {
          setRawRows((data as ShoppingRow[]) ?? [])
        }
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [recipeIds.join(','), tick])

  // Grouper par catégorie, ordre conservé depuis SQL
  const sections = buildSections(rawRows)

  return {
    sections,
    rawRows,
    loading,
    error,
    refetch: () => setTick(t => t + 1),
  }
}

function buildSections(rows: ShoppingRow[]): ShoppingSection[] {
  const map = new Map<string, ShoppingSection>()

  for (const row of rows) {
    const key = row.shopping_category ?? 'Autre'
    if (!map.has(key)) {
      map.set(key, {
        category: key,
        order: row.category_order ?? 99,
        items: [],
      })
    }
    map.get(key)!.items.push(row)
  }

  return Array.from(map.values()).sort((a, b) => a.order - b.order)
}
