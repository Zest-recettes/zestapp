/**
 * Forme exacte retournée par zest_shopping_list(recipe_ids text[])
 * Aucun champ n'est recomposé côté frontend.
 * shopping_label = label final prêt à afficher (zest_render_label_v3)
 */
export interface ShoppingRow {
  shopping_category: string
  category_order: number
  canonical_name: string
  shopping_identity: string
  display_name: string
  total_quantity: number
  recipe_unit: string
  render_mode: string
  shopping_label: string        // ← label final, source unique d'affichage
  shopping_reference: string | null
  staple_level: string

  // Enrichissement côté client (non retourné par l'API)
  is_past_meal?: boolean        // true si le repas associé est dans le passé
  meal_day_label?: string       // ex: "Lundi", "Mardi"
}

/** Groupe d'ingrédients par catégorie, prêt pour le rendu liste */
export interface ShoppingSection {
  category: string
  order: number
  items: ShoppingRow[]
}

/** Plan de repas journalier pour enrichir la liste de courses */
export interface MealDay {
  dayLabel: string     // ex: "Lundi"
  recipeId: number
  isPast: boolean      // true si le jour est déjà passé
}

/** Analytics enrichies liste de courses */
export interface ShoppingAnalytics {
  totalItems: number
  checkedItems: number
  pastUncheckedItems: number
  checkRate: number    // 0–1
}
