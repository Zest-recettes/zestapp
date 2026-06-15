/**
 * ZESTUP — Moteur de génération de semaine v2
 *
 * Nouveautés v2 :
 * - Fingerprint anti-répétition perçue (protein + cuisson + cuisine + tags)
 * - Mémoire 3 semaines : une recette "trop similaire" (score > 70) est rejetée
 * - Les accompagnements différents ne créent plus une "nouvelle" recette
 *
 * Règles métier :
 * - Régime Classique  : viande ≥ 2, poisson ≥ 1, végétarien ≥ 1 (sur 5 repas)
 * - Régime Pescetarien: poisson ≥ 2, végétarien ≥ 1, aucune viande
 * - Régime Végétarien : végétarien uniquement
 *
 * Classification via dominant_protein (seule source de vérité) :
 *   viande    : red_meat | poultry | pork | chicken
 *   poisson   : fish
 *   végétarien: vegetal_protein | dairy_protein | egg | null
 */

import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { RecetteRow } from '../types/recette'
import { categoriserRecette } from '../types/recette'
import { buildFingerprint, isTooSimilar, logFingerprint } from '../lib/recipe-fingerprint'
import { getRecentFingerprints, recordWeek, getHistorySummary } from '../lib/week-history'
import type { RecipeFingerprint } from '../lib/recipe-fingerprint'

// ─── Constantes ───────────────────────────────────────────────────────────────

const NB_JOURS = 5
const SIMILARITY_THRESHOLD = 70

export type RegimeType = 'classique' | 'pescetarien' | 'vegetarien' | 'vegan'

interface ContraintesSemaine {
  viandeMin:   number
  poissonMin:  number
  vegetarienMin: number
  viandeMaX:   number  // 0 = interdit
}

const CONTRAINTES: Record<RegimeType, ContraintesSemaine> = {
  classique:   { viandeMin: 2, poissonMin: 1, vegetarienMin: 1, viandeMaX: 99 },
  pescetarien: { viandeMin: 0, poissonMin: 2, vegetarienMin: 1, viandeMaX: 0  },
  vegetarien:  { viandeMin: 0, poissonMin: 0, vegetarienMin: NB_JOURS, viandeMaX: 0 },
  vegan:       { viandeMin: 0, poissonMin: 0, vegetarienMin: NB_JOURS, viandeMaX: 0 },
}

// ─── Types publics ────────────────────────────────────────────────────────────

export interface SemainePlan {
  recetteIds: number[]
  recettes:   RecetteRow[]
  regime:     RegimeType
  auditLog:   AuditLog
}

export interface AuditLog {
  regime:              RegimeType
  totalDisponibles:    number
  viande:              number
  poisson:             number
  vegetarien:          number
  disponiblesApresFiltre: number
  semaine: { id: number; titre: string; categorie: string; fingerprint: RecipeFingerprint }[]
  generationsEssayees: number
  historiqueSemaines:  { weekLabel: string; count: number }[]
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickN<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n)
}

// ─── Filtrage fingerprint ─────────────────────────────────────────────────────

/**
 * Retire du pool toutes les recettes dont le fingerprint est trop similaire
 * à l'une des semaines récentes.
 */
function filtrerParFingerprint(
  pool: RecetteRow[],
  recentFps: RecipeFingerprint[],
): RecetteRow[] {
  if (recentFps.length === 0) return pool
  return pool.filter(r => {
    const fp = buildFingerprint(r)
    return !isTooSimilar(fp, recentFps, SIMILARITY_THRESHOLD)
  })
}

// ─── Génération d'une semaine ─────────────────────────────────────────────────

function genererSemaine(
  viandePool:     RecetteRow[],
  poissonPool:    RecetteRow[],
  vegetarienPool: RecetteRow[],
  regime:         RegimeType,
): RecetteRow[] | null {
  const c = CONTRAINTES[regime]

  if (viandePool.length < c.viandeMin) return null
  if (poissonPool.length < c.poissonMin) return null
  if (vegetarienPool.length < c.vegetarienMin) return null

  const selViande     = pickN(viandePool, c.viandeMin)
  const selPoisson    = pickN(poissonPool, c.poissonMin)
  const selVegetarien = pickN(vegetarienPool, c.vegetarienMin)

  const dejaSelectionnes = new Set([
    ...selViande.map(r => r.id),
    ...selPoisson.map(r => r.id),
    ...selVegetarien.map(r => r.id),
  ])

  const reste = NB_JOURS - dejaSelectionnes.size
  const librePool = [
    ...(c.viandeMaX > 0 ? viandePool : []),
    ...poissonPool,
    ...vegetarienPool,
  ].filter(r => !dejaSelectionnes.has(r.id))

  const selLibre = pickN(librePool, Math.max(reste, 0))
  return shuffle([...selViande, ...selPoisson, ...selVegetarien, ...selLibre]).slice(0, NB_JOURS)
}

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useWeekGenerator(regime: RegimeType = 'classique') {
  const [plan, setPlan]       = useState<SemainePlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const generer = useCallback(async () => {
    setLoading(true)
    setError(null)

    // ── 1. Charger toutes les recettes ──────────────────────────────────────
    const { data, error: fetchErr } = await supabase
      .from('recettes')
      .select('id, titre, temps_preparation, proteines, type_plat, vegetarien, complexite, saison, regime, dominant_protein, meal_format, cuisine_type, tags')

    if (fetchErr || !data) {
      console.error('[ZESTUP] Erreur chargement recettes :', fetchErr?.message)
      setError(fetchErr?.message ?? 'Erreur inconnue')
      setLoading(false)
      return
    }

    const recettes = data as RecetteRow[]

    // ── 2. Classifier ────────────────────────────────────────────────────────
    const viandeTotal     = recettes.filter(r => categoriserRecette(r) === 'viande')
    const poissonTotal    = recettes.filter(r => categoriserRecette(r) === 'poisson')
    const vegetarienTotal = recettes.filter(r => categoriserRecette(r) === 'vegetarien')

    // ── 3. Récupérer l'historique fingerprint ────────────────────────────────
    const recentFps = getRecentFingerprints(3)

    // ── 4. Filtrer selon régime + fingerprint ────────────────────────────────
    const c = CONTRAINTES[regime]
    const viandePool     = filtrerParFingerprint(
      c.viandeMaX > 0 ? viandeTotal : [],
      recentFps,
    )
    const poissonPool    = filtrerParFingerprint(poissonTotal, recentFps)
    const vegetarienPool = filtrerParFingerprint(vegetarienTotal, recentFps)

    // ── 5. AUDIT LOG ─────────────────────────────────────────────────────────
    const historique = getHistorySummary()
    console.log('[ZESTUP] ════════════════════════════════════════════')
    console.log('[ZESTUP] AUDIT GÉNÉRATION — v2 fingerprint')
    console.log('[ZESTUP] ════════════════════════════════════════════')
    console.log(`[ZESTUP] Régime chargé         : ${regime.toUpperCase()}`)
    console.log(`[ZESTUP] Total recettes        : ${recettes.length}`)
    console.log('[ZESTUP] Catalogue brut :')
    console.log(`[ZESTUP]   Viande              : ${viandeTotal.length}`)
    console.log(`[ZESTUP]   Poisson             : ${poissonTotal.length}`)
    console.log(`[ZESTUP]   Végétarien          : ${vegetarienTotal.length}`)
    console.log(`[ZESTUP] Fingerprints historique (${recentFps.length} recettes sur ${historique.length} semaines) :`)
    historique.forEach(h => console.log(`[ZESTUP]   ${h.weekLabel} : ${h.count} recettes`))
    console.log('[ZESTUP] Après filtre fingerprint (similarité > 70 exclus) :')
    console.log(`[ZESTUP]   Viande              : ${viandePool.length} (retirés: ${viandeTotal.length - viandePool.length})`)
    console.log(`[ZESTUP]   Poisson             : ${poissonPool.length} (retirés: ${poissonTotal.length - poissonPool.length})`)
    console.log(`[ZESTUP]   Végétarien          : ${vegetarienPool.length} (retirés: ${vegetarienTotal.length - vegetarienPool.length})`)
    console.log(`[ZESTUP] Contraintes régime    : viande≥${c.viandeMin}, poisson≥${c.poissonMin}, veg≥${c.vegetarienMin}`)
    console.log('[ZESTUP] ────────────────────────────────────────────')

    // ── 6. Générer avec fallback si pool fingerprint trop petit ─────────────
    let semaine: RecetteRow[] | null = null
    let tentatives = 0
    const MAX_TENTATIVES = 20

    // Pools de fallback (sans filtre fingerprint) si les pools filtrés sont trop petits
    const viandePoolFallback     = c.viandeMaX > 0 ? viandeTotal : []
    const poissonPoolFallback    = poissonTotal
    const vegetarienPoolFallback = vegetarienTotal

    while (!semaine && tentatives < MAX_TENTATIVES) {
      tentatives++

      // Après 10 tentatives sans succès, relâcher le filtre fingerprint
      const useFallback = tentatives > 10
      const pV = useFallback ? viandePoolFallback     : viandePool
      const pP = useFallback ? poissonPoolFallback    : poissonPool
      const pG = useFallback ? vegetarienPoolFallback : vegetarienPool

      if (useFallback && tentatives === 11) {
        console.warn('[ZESTUP] Filtre fingerprint relâché après 10 tentatives sans succès.')
      }

      semaine = genererSemaine(pV, pP, pG, regime)

      if (semaine) {
        const nbV = semaine.filter(r => categoriserRecette(r) === 'viande').length
        const nbP = semaine.filter(r => categoriserRecette(r) === 'poisson').length
        const nbG = semaine.filter(r => categoriserRecette(r) === 'vegetarien').length
        if (nbV < c.viandeMin || nbP < c.poissonMin || nbG < c.vegetarienMin) {
          semaine = null
        }
      }
    }

    if (!semaine) {
      const msg = `Impossible de générer une semaine valide après ${MAX_TENTATIVES} tentatives.`
      console.error('[ZESTUP]', msg)
      setError(msg)
      setLoading(false)
      return
    }

    // ── 7. Log résultat + fingerprints ───────────────────────────────────────
    const nbV = semaine.filter(r => categoriserRecette(r) === 'viande').length
    const nbP = semaine.filter(r => categoriserRecette(r) === 'poisson').length
    const nbG = semaine.filter(r => categoriserRecette(r) === 'vegetarien').length

    console.log(`[ZESTUP] Semaine générée (${tentatives} tentative(s)) — viande=${nbV}, poisson=${nbP}, veg=${nbG} :`)
    const fingerprints: RecipeFingerprint[] = semaine.map(r => {
      const fp = buildFingerprint(r)
      logFingerprint(r.titre, fp)
      return fp
    })
    console.log('[ZESTUP] ════════════════════════════════════════════')

    // ── 8. Enregistrer dans l'historique ─────────────────────────────────────
    const weekLabel = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    recordWeek({
      weekLabel,
      generatedAt:  new Date().toISOString(),
      fingerprints,
      recipeIds:    semaine.map(r => r.id),
    })

    // ── 9. Retourner le plan ─────────────────────────────────────────────────
    const auditLog: AuditLog = {
      regime,
      totalDisponibles:       recettes.length,
      viande:                 viandeTotal.length,
      poisson:                poissonTotal.length,
      vegetarien:             vegetarienTotal.length,
      disponiblesApresFiltre: viandePool.length + poissonPool.length + vegetarienPool.length,
      semaine: semaine.map((r, i) => ({
        id:          r.id,
        titre:       r.titre,
        categorie:   categoriserRecette(r),
        fingerprint: fingerprints[i],
      })),
      generationsEssayees: tentatives,
      historiqueSemaines:  getHistorySummary(),
    }

    setPlan({ recetteIds: semaine.map(r => r.id), recettes: semaine, regime, auditLog })
    setLoading(false)
  }, [regime])

  return { plan, loading, error, generer }
}
