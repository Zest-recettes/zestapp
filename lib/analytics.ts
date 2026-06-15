/**
 * ZESTUP — Service Analytics
 *
 * Usage : trackEvent('recipe_opened', 'recettes', undefined, { recipe_id: 42 })
 *
 * Fire-and-forget : n'attend jamais, ne bloque jamais l'UI.
 * Les erreurs réseau sont silencieuses (bêta tolerante).
 */

import { supabase } from './supabase'

export type EventCategory =
  | 'auth'
  | 'navigation'
  | 'recettes'
  | 'courses'
  | 'garde_manger'
  | 'favoris'
  | 'jour_libre'
  | 'adaptation'
  | 'satisfaction'
  | 'general'

export type EventName =
  // Auth
  | 'login'
  | 'logout'
  // Navigation
  | 'open_home'
  | 'open_recipe'
  | 'open_shopping_list'
  | 'open_pantry'
  | 'open_favorites'
  | 'open_profile'
  // Recettes
  | 'recipe_opened'
  | 'recipe_favorited'
  | 'recipe_unfavorited'
  | 'recipe_replaced'
  | 'recipe_added'
  | 'recipe_completed'
  // Jour libre
  | 'day_marked_free'
  | 'free_day_removed'
  // Liste de courses
  | 'shopping_list_opened'
  | 'ingredient_checked'
  | 'ingredient_unchecked'
  | 'shopping_category_opened'
  // Garde-manger
  | 'pantry_opened'
  | 'pantry_category_opened'
  | 'pantry_item_added_to_shopping'
  // Adaptation repas
  | 'meal_adapted'
  | 'adaptation_selected'
  // Satisfaction
  | 'satisfaction_rated'
  // Motifs
  | 'replacement_reason_selected'
  | 'free_day_reason_selected'
  // Onboarding
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'week_first_view'

let _userId: string | null = null

/** Appelé dès que l'utilisateur est connu (auth) */
export function setAnalyticsUser(userId: string | null) {
  _userId = userId
}

/**
 * Enregistre un événement analytics.
 * Fire-and-forget : ne retourne rien, ne lance pas d'erreur.
 */
export function trackEvent(
  name: EventName,
  category: EventCategory = 'general',
  value?: string,
  metadata?: Record<string, unknown>,
) {
  // On n'attend pas — l'UI ne doit jamais être bloquée
  supabase
    .from('analytics_events')
    .insert({
      user_id:        _userId,
      event_name:     name,
      event_category: category,
      event_value:    value ?? null,
      metadata:       metadata ?? {},
    })
    .then(({ error }) => {
      if (error && __DEV__) {
        console.warn('[analytics] trackEvent error:', error.message)
      }
    })
}

/**
 * Mesure le temps passé sur un écran.
 * Appeler startScreenTimer() à l'entrée, stopScreenTimer() à la sortie.
 * Le résultat est envoyé comme event avec la durée en secondes dans event_value.
 */
export function startScreenTimer(): () => void {
  const start = Date.now()
  return () => {
    const seconds = Math.round((Date.now() - start) / 1000)
    return seconds
  }
}
