/**
 * ZESTUP — Historique des semaines (mémoire rotation 3 semaines)
 *
 * Persiste en mémoire durant la session (module-level singleton).
 * Pour une persistance cross-session, remplacer loadHistory/saveHistory
 * par des appels AsyncStorage (@react-native-async-storage/async-storage).
 *
 * Structure stockée :
 *   WeekRecord { weekLabel, generatedAt, fingerprints[] }
 *   → on garde les MAX_WEEKS dernières semaines
 */

import type { RecipeFingerprint } from './recipe-fingerprint'

const MAX_WEEKS = 3

export interface WeekRecord {
  weekLabel:    string
  generatedAt:  string          // ISO date
  fingerprints: RecipeFingerprint[]
  recipeIds:    number[]
}

// ─── Singleton en mémoire ─────────────────────────────────────────────────────
// Remplacer ce bloc par AsyncStorage pour la persistance cross-session :
//
//   import AsyncStorage from '@react-native-async-storage/async-storage'
//   const KEY = 'zestup_week_history'
//   async function loadHistory(): Promise<WeekRecord[]> {
//     const raw = await AsyncStorage.getItem(KEY)
//     return raw ? JSON.parse(raw) : []
//   }
//   async function saveHistory(h: WeekRecord[]): Promise<void> {
//     await AsyncStorage.setItem(KEY, JSON.stringify(h))
//   }

let _history: WeekRecord[] = []

function loadHistory(): WeekRecord[] {
  return _history
}

function saveHistory(h: WeekRecord[]): void {
  _history = h
}

// ─── API publique ─────────────────────────────────────────────────────────────

/** Retourne tous les fingerprints des N dernières semaines. */
export function getRecentFingerprints(n = MAX_WEEKS): RecipeFingerprint[] {
  const history = loadHistory()
  const recent  = history.slice(-n)
  return recent.flatMap(w => w.fingerprints)
}

/** Enregistre une nouvelle semaine dans l'historique. */
export function recordWeek(record: WeekRecord): void {
  const history = loadHistory()
  history.push(record)
  // Garder uniquement les MAX_WEEKS dernières
  saveHistory(history.slice(-MAX_WEEKS))
  console.log(`[ZESTUP HISTORY] Semaine enregistrée : ${record.weekLabel} (${record.fingerprints.length} recettes)`)
  console.log(`[ZESTUP HISTORY] Historique : ${loadHistory().length}/${MAX_WEEKS} semaines`)
}

/** Retourne un résumé de l'historique pour le debug. */
export function getHistorySummary(): { weekLabel: string; count: number }[] {
  return loadHistory().map(w => ({ weekLabel: w.weekLabel, count: w.fingerprints.length }))
}

/** Efface l'historique (utile pour les tests). */
export function clearHistory(): void {
  saveHistory([])
  console.log('[ZESTUP HISTORY] Historique effacé.')
}
