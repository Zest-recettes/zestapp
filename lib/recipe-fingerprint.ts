/**
 * ZESTUP — Fingerprint recette
 *
 * Mesure la diversité PERÇUE, pas technique.
 * "Poulet pané + céleri" et "Poulet pané + pois cassés" = même fingerprint.
 *
 * Composition du fingerprint :
 *   protein      : dominant_protein   → protéine principale
 *   cookingMethod: meal_format        → mode de cuisson (pané, rôti, curry…)
 *   cuisineFamily: cuisine_type       → famille culinaire (française, asiatique…)
 *   aroTags      : tags intersection  → profil aromatique
 *
 * Score de similarité (0–100) :
 *   protein match      : 40 pts
 *   cookingMethod match: 30 pts
 *   cuisineFamily match: 20 pts
 *   aroTags overlap ≥1 : 10 pts
 *
 * Seuil de rejet : score STRICTEMENT > 70
 *
 * Exemples validés :
 *   Poulet pané (poultry/plancha/française/herbes) vs Poulet pané (idem) → 100 → REJET
 *   Poulet pané (poultry/plancha/française) vs Poulet curry (poultry/curry/française) → 60 → OK
 *   Saumon citron (fish/poêlée/française) vs Saumon teriyaki (fish/poêlée/asiatique) → 70 → OK (pas strictement >)
 *   Cabillaud vs Saumon teriyaki (différent) → 40–70 → OK
 */

// ─── Tags aromatics (excluent les tags utilitaires) ───────────────────────────

const TAGS_UTILITAIRES = new Set([
  'rapide', 'moins de 30 min', 'budget', 'printemps', 'été', 'automne',
  'hiver', 'estival', 'dîner', 'déjeuner', 'sans gluten', 'fait-maison',
  'leger', 'lourd', 'végétarien', 'vegan', 'bowl', 'sans-cuisson',
])

function extractAromaticTags(tags: string[] | null): string[] {
  if (!tags) return []
  return tags.filter(t => !TAGS_UTILITAIRES.has(t.toLowerCase()))
}

// ─── Type ─────────────────────────────────────────────────────────────────────

export interface RecipeFingerprint {
  recipeId:     number
  protein:      string | null
  cookingMethod:string | null
  cuisineFamily:string | null
  aroTags:      string[]
}

// ─── Construction ─────────────────────────────────────────────────────────────

export function buildFingerprint(r: {
  id: number
  dominant_protein:  string | null
  meal_format:       string | null
  cuisine_type:      string | null
  tags:              string[] | null
}): RecipeFingerprint {
  return {
    recipeId:      r.id,
    protein:       r.dominant_protein ?? null,
    cookingMethod: r.meal_format      ?? null,
    cuisineFamily: r.cuisine_type     ?? null,
    aroTags:       extractAromaticTags(r.tags),
  }
}

// ─── Score de similarité (0–100) ──────────────────────────────────────────────

export function similarityScore(a: RecipeFingerprint, b: RecipeFingerprint): number {
  let score = 0

  // Protéine principale — poids 40
  if (a.protein && b.protein && a.protein === b.protein) {
    score += 40
  }

  // Mode de cuisson — poids 30
  if (a.cookingMethod && b.cookingMethod && a.cookingMethod === b.cookingMethod) {
    score += 30
  }

  // Famille culinaire — poids 20
  if (a.cuisineFamily && b.cuisineFamily && a.cuisineFamily === b.cuisineFamily) {
    score += 20
  }

  // Profil aromatique — poids 10 (dès qu'un tag commun)
  if (a.aroTags.length > 0 && b.aroTags.length > 0) {
    const setA = new Set(a.aroTags.map(t => t.toLowerCase()))
    const hasOverlap = b.aroTags.some(t => setA.has(t.toLowerCase()))
    if (hasOverlap) score += 10
  }

  return score
}

// ─── Décision de rejet ────────────────────────────────────────────────────────

/** Retourne true si la recette est trop similaire à une recette de l'historique. */
export function isTooSimilar(
  candidate: RecipeFingerprint,
  history:   RecipeFingerprint[],
  threshold  = 70,
): boolean {
  return history.some(past => similarityScore(candidate, past) > threshold)
}

// ─── Log de debug fingerprint ─────────────────────────────────────────────────

export function logFingerprint(label: string, fp: RecipeFingerprint): void {
  console.log(
    `[ZESTUP FP] ${label.padEnd(45)} | protein=${(fp.protein ?? '—').padEnd(15)} | cook=${(fp.cookingMethod ?? '—').padEnd(10)} | cuisine=${(fp.cuisineFamily ?? '—').padEnd(15)} | tags=[${fp.aroTags.join(',')}]`
  )
}
