export interface RecetteRow {
  id: number
  titre: string
  temps_preparation: number | null
  proteines: string | null
  type_plat: string | null
  vegetarien: boolean
  complexite: number | null
  saison: string[] | null
  regime: string | null
  dominant_protein: string | null
  // Champs fingerprint (exposés par la vue depuis recipes)
  meal_format:    string | null
  cuisine_type:   string | null
  meal_density:   string | null
  meal_temperature: string | null
  tags:           string[] | null
}

/**
 * Catégorie alimentaire résolue à partir de dominant_protein.
 * C'est la seule source de vérité pour le moteur de génération.
 *
 * viande    : red_meat | poultry | pork | chicken
 * poisson   : fish
 * vegetarien: vegetal_protein | dairy_protein | egg | null
 */
export type CategorieAlim = 'viande' | 'poisson' | 'vegetarien'

export function categoriserRecette(r: Pick<RecetteRow, 'dominant_protein' | 'vegetarien'>): CategorieAlim {
  const dp = r.dominant_protein
  if (!dp) return 'vegetarien'
  if (['red_meat', 'poultry', 'pork', 'chicken'].includes(dp)) return 'viande'
  if (dp === 'fish') return 'poisson'
  return 'vegetarien'
}
