/**
 * ZESTUP — Gestion des abonnements Stripe
 *
 * Flux :
 * 1. openStripeCheckout(plan) → appelle l'Edge Function create-checkout-session
 * 2. Edge Function retourne une URL Stripe Checkout
 * 3. L'app ouvre cette URL dans le navigateur
 * 4. Stripe redirige vers subscribe-success.html → deep link zestapp://subscribe-success
 * 5. L'app reçoit le deep link, rafraîchit le statut via refreshSubscription()
 */

import { Linking } from 'react-native'
import { supabase } from './supabase'

// ─── Config ───────────────────────────────────────────────────────────────────

/** URL Supabase (identique à supabase.ts) */
const SUPABASE_URL = 'https://ljlwlsefivdiuszmuzsb.supabase.co'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubscriptionPlan   = 'monthly' | 'annual'
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused' | 'incomplete' | 'incomplete_expired' | 'unpaid' | null

export interface Subscription {
  status:              SubscriptionStatus
  plan:                SubscriptionPlan | null
  current_period_end:  string | null
  trial_end:           string | null
  cancel_at_period_end: boolean
}

// ─── Lecture ──────────────────────────────────────────────────────────────────

/**
 * Récupère l'abonnement de l'utilisateur connecté.
 * Retourne null si non connecté ou pas d'abonnement.
 */
export async function getSubscription(): Promise<Subscription | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('subscriptions')
    .select('status, plan, current_period_end, trial_end, cancel_at_period_end')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !data) return null
  return data as Subscription
}

/**
 * Vérifie si l'utilisateur a un accès actif (actif ou en période d'essai).
 * À appeler au démarrage et après un deep link de succès paiement.
 */
export function isSubscribed(sub: Subscription | null): boolean {
  if (!sub) return false
  return sub.status === 'active' || sub.status === 'trialing'
}

// ─── Paiement ─────────────────────────────────────────────────────────────────

/**
 * Crée une session Stripe Checkout via l'Edge Function, puis ouvre l'URL.
 * L'Edge Function est appelée avec le JWT de l'utilisateur connecté.
 */
export async function openStripeCheckout(plan: SubscriptionPlan): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Non connecté')

  // Appel à la Edge Function (authentifiée avec le JWT utilisateur)
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/create-checkout-session`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ plan }),
    }
  )

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Erreur Stripe : ${err}`)
  }

  const { url } = await response.json()
  if (!url) throw new Error('URL Stripe manquante')

  await Linking.openURL(url)
}

/**
 * Ouvre le portail Stripe pour gérer l'abonnement (annulation, mise à jour CB).
 */
export async function openCustomerPortal(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Non connecté')

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/create-portal-session`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  )

  if (!response.ok) throw new Error('Erreur portail Stripe')

  const { url } = await response.json()
  await Linking.openURL(url)
}

// ─── Formatage ────────────────────────────────────────────────────────────────

/** Retourne la date de fin d'abonnement formatée en français */
export function formatPeriodEnd(dateString: string | null): string {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

/** Retourne le label du statut en français */
export function statusLabel(status: SubscriptionStatus): string {
  switch (status) {
    case 'active':              return 'Actif'
    case 'trialing':            return 'Période d\'essai'
    case 'past_due':            return 'Paiement en attente'
    case 'canceled':            return 'Annulé'
    case 'paused':              return 'En pause'
    case 'incomplete':          return 'Paiement incomplet'
    case 'incomplete_expired':  return 'Expiré'
    case 'unpaid':              return 'Impayé'
    default:                    return 'Inactif'
  }
}
