/**
 * ZESTUP — useDayAwareShopping
 *
 * Extension de useShoppingList avec conscience des jours.
 * Sépare les ingrédients futurs des ingrédients passés non cochés,
 * et enrichit chaque ShoppingRow avec is_past_meal + meal_day_label.
 *
 * Architecture :
 * 1. Pour chaque jour du plan, on appelle zest_shopping_list avec son recipe_id
 * 2. On tag chaque ingrédient avec le jour et le statut passé/futur
 * 3. On consolide par canonical_name (dédoublonnage) en gardant le tag du premier jour
 */

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { MealDay, ShoppingRow, ShoppingSection } from '../types/shopping'

interface UseDayAwareShoppingResult {
  sections: ShoppingSection[]
  rawRows: ShoppingRow[]
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useDayAwareShopping(mealPlan: MealDay[]): UseDayAwareShoppingResult {
  const [rawRows, setRawRows] = useState<ShoppingRow[]>([])
  const [loading, setLoading]  = useState(false)
  const [error, setError]      = useState<string | null>(null)
  const [tick, setTick]        = useState(0)

  const planKey = mealPlan.map(d => `${d.dayLabel}:${d.recipeId}:${d.isPast}`).join('|')

  useEffect(() => {
    if (mealPlan.length === 0) {
      setRawRows([])
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    // Une requête par jour pour pouvoir tagger les ingrédients
    const fetches = mealPlan.map(day =>
      supabase
        .rpc('zest_shopping_list', { recipe_ids: [day.recipeId] })
        .then(({ data, error: e }) => ({ data, error: e, day }))
    )

    Promise.all(fetches).then(results => {
      if (cancelled) return

      // Consolider les résultats en dédoublonnant par shopping_identity
      // Priorité : futur > passé (on garde les tags du premier futur trouvé)
      const seen = new Map<string, ShoppingRow>()

      // D'abord les futurs
      const futurs = results.filter(r => !r.day.isPast)
      for (const { data, day } of futurs) {
        if (!data) continue
        for (const row of data as ShoppingRow[]) {
          const key = row.shopping_identity
          if (!seen.has(key)) {
            seen.set(key, {
              ...row,
              is_past_meal:    false,
              meal_day_label:  day.dayLabel,
            })
          }
        }
      }

      // Ensuite les passés (seulement si pas déjà présents comme futur)
      const passes = results.filter(r => r.day.isPast)
      for (const { data, day } of passes) {
        if (!data) continue
        for (const row of data as ShoppingRow[]) {
          const key = row.shopping_identity
          if (!seen.has(key)) {
            seen.set(key, {
              ...row,
              is_past_meal:    true,
              meal_day_label:  day.dayLabel,
            })
          }
        }
      }

      const anyError = results.find(r => r.error)
      if (anyError?.error) {
        setError(anyError.error.message)
      }

      setRawRows(Array.from(seen.values()))
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [planKey, tick])

  const sections = buildSectionsWithDays(rawRows)

  return {
    sections,
    rawRows,
    loading,
    error,
    refetch: () => setTick(t => t + 1),
  }
}

/**
 * Grouper par catégorie, ordonner : futurs en haut, passés en bas.
 * Les cochés sont filtrés au niveau du composant parent.
 */
function buildSectionsWithDays(rows: ShoppingRow[]): ShoppingSection[] {
  const map = new Map<string, ShoppingSection>()

  for (const row of rows) {
    const key = row.shopping_category ?? 'Autre'
    if (!map.has(key)) {
      map.set(key, {
        category: key,
        order:    row.category_order ?? 99,
        items:    [],
      })
    }
    map.get(key)!.items.push(row)
  }

  // Trier chaque section : futurs d'abord, passés ensuite
  for (const section of map.values()) {
    section.items.sort((a, b) => {
      if (a.is_past_meal === b.is_past_meal) return 0
      return a.is_past_meal ? 1 : -1
    })
  }

  return Array.from(map.values()).sort((a, b) => a.order - b.order)
}
