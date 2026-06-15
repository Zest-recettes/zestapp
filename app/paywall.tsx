/**
 * ZESTUP — Écran Paywall
 *
 * Affiché quand l'utilisateur est connecté mais n'a pas d'abonnement actif.
 * Propose 2 plans : mensuel (12 €) et annuel (99 €).
 * Le bouton "Continuer" appelle l'Edge Function create-checkout-session
 * et ouvre Stripe Checkout dans le navigateur système.
 *
 * Design ZESTUP :
 * - Fond crème, cartes avec hairline #E4DBCB
 * - Accent bordeaux pour le plan sélectionné
 * - Badge "Meilleure valeur" sur le plan annuel
 * - Aucun emoji dans l'UI produit
 */

import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { openStripeCheckout, type SubscriptionPlan } from '@/lib/subscription'
import {
  Bordeaux,
  Cream,
  FontFamily,
  FontSize,
  Ink,
  Line,
  Radius,
  Space,
} from '@/constants/theme'

// ─── Données des plans ────────────────────────────────────────────────────────

const PLANS: {
  id: SubscriptionPlan
  label: string
  price: string
  sub: string
  badge?: string
  savings?: string
}[] = [
  {
    id:    'annual',
    label: 'Annuel',
    price: '99 €',
    sub:   'par an — soit 8,25 €/mois',
    badge: 'Meilleure valeur',
    savings: 'Économise 45 €',
  },
  {
    id:    'monthly',
    label: 'Mensuel',
    price: '12 €',
    sub:   'par mois',
  },
]

// ─── Bénéfices ────────────────────────────────────────────────────────────────

const BENEFITS = [
  { icon: '✦', text: 'Planning de repas hebdomadaire généré automatiquement' },
  { icon: '✦', text: 'Liste de courses organisée par rayon, sans rien écrire' },
  { icon: '✦', text: '350 recettes saisonnières qui se débloquent au fil de l\'année' },
]

// ─── Composants locaux ────────────────────────────────────────────────────────

function PlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan: typeof PLANS[number]
  selected: boolean
  onSelect: () => void
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.planCard,
        selected && styles.planCardSelected,
        pressed && styles.planCardPressed,
      ]}
      onPress={onSelect}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
    >
      {/* Badge */}
      {plan.badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{plan.badge}</Text>
        </View>
      )}

      <View style={styles.planRow}>
        {/* Sélecteur radio */}
        <View style={[styles.radio, selected && styles.radioSelected]}>
          {selected && <View style={styles.radioDot} />}
        </View>

        {/* Textes */}
        <View style={styles.planTexts}>
          <Text style={[styles.planLabel, selected && styles.planLabelSelected]}>
            {plan.label}
          </Text>
          <Text style={styles.planSub}>{plan.sub}</Text>
          {plan.savings && (
            <Text style={styles.planSavings}>{plan.savings}</Text>
          )}
        </View>

        {/* Prix */}
        <Text style={[styles.planPrice, selected && styles.planPriceSelected]}>
          {plan.price}
        </Text>
      </View>
    </Pressable>
  )
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('annual')
  const [loading, setLoading]           = useState(false)

  async function handleContinue() {
    setLoading(true)
    try {
      await openStripeCheckout(selectedPlan)
    } catch (e: any) {
      Alert.alert(
        'Impossible d\'ouvrir le paiement',
        e?.message ?? 'Vérifie ta connexion internet et réessaie.',
        [{ text: 'OK' }]
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── En-tête ── */}
        <View style={styles.header}>
          <Text style={styles.logo}>
            Zest<Text style={styles.logoSup}>up</Text>
          </Text>
          <Text style={styles.headline}>
            Plus jamais «&nbsp;qu'est-ce qu'on mange&nbsp;?»
          </Text>
          <Text style={styles.subheadline}>
            7 jours gratuits, puis l'abonnement de ton choix.
          </Text>
        </View>

        {/* ── Bénéfices ── */}
        <View style={styles.benefits}>
          {BENEFITS.map((b, i) => (
            <View key={i} style={styles.benefitRow}>
              <Text style={styles.benefitIcon}>{b.icon}</Text>
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
        </View>

        {/* ── Plans ── */}
        <View style={styles.plans}>
          {PLANS.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              selected={selectedPlan === plan.id}
              onSelect={() => setSelectedPlan(plan.id)}
            />
          ))}
        </View>

        {/* ── CTA ── */}
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={handleContinue}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Cream.default} />
          ) : (
            <Text style={styles.ctaText}>Commencer mon essai gratuit</Text>
          )}
        </Pressable>

        <Text style={styles.ctaNote}>
          Sans engagement — annulable à tout moment
        </Text>

        {/* ── Pied ── */}
        <View style={styles.footer}>
          <Pressable onPress={handleSignOut}>
            <Text style={styles.footerLink}>Se déconnecter</Text>
          </Pressable>
          <Text style={styles.footerSep}>·</Text>
          <Pressable onPress={() => router.push('/modal')}>
            <Text style={styles.footerLink}>CGU & Confidentialité</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Cream.default,
  },
  scroll: {
    paddingHorizontal: Space.s5,
    paddingTop:        Space.s7,
    paddingBottom:     Space.s7,
    gap:               Space.s5,
  },

  // Header
  header: {
    alignItems: 'center',
    gap:        Space.s2,
  },
  logo: {
    fontFamily: FontFamily.serif,
    fontSize:   FontSize.h2,
    color:      Bordeaux.default,
    marginBottom: Space.s2,
  },
  logoSup: {
    fontFamily: FontFamily.serifItalic,
  },
  headline: {
    fontFamily: FontFamily.serif,
    fontSize:   FontSize.h3,
    color:      Ink.default,
    textAlign:  'center',
    lineHeight: FontSize.h3 * 1.25,
  },
  subheadline: {
    fontFamily: FontFamily.sans,
    fontSize:   FontSize.sm,
    color:      Ink.muted,
    textAlign:  'center',
  },

  // Bénéfices
  benefits: {
    gap: Space.s3,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           Space.s3,
  },
  benefitIcon: {
    fontSize:   10,
    color:      Bordeaux.default,
    marginTop:  3,
  },
  benefitText: {
    flex:       1,
    fontFamily: FontFamily.sans,
    fontSize:   FontSize.sm,
    color:      Ink.soft,
    lineHeight: FontSize.sm * 1.5,
  },

  // Plans
  plans: {
    gap: Space.s3,
  },
  planCard: {
    borderWidth:   1,
    borderColor:   Line.default,
    borderRadius:  Radius.lg,
    padding:       Space.s4,
    backgroundColor: Cream.paper,
  },
  planCardSelected: {
    borderColor:     Bordeaux.default,
    borderWidth:     1.5,
    backgroundColor: Bordeaux.tint,
  },
  planCardPressed: {
    backgroundColor: Cream.deeper,
  },
  badge: {
    alignSelf:       'flex-start',
    backgroundColor: Bordeaux.default,
    borderRadius:    Radius.pill,
    paddingHorizontal: Space.s2,
    paddingVertical:   2,
    marginBottom:    Space.s2,
  },
  badgeText: {
    fontFamily: FontFamily.sansSemibold,
    fontSize:   FontSize.eyebrow,
    color:      Cream.default,
    textTransform: 'uppercase',
    letterSpacing:  0.8,
  },
  planRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Space.s3,
  },
  radio: {
    width:        20,
    height:       20,
    borderRadius: 10,
    borderWidth:  1.5,
    borderColor:  Line.strong,
    alignItems:   'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Bordeaux.default,
  },
  radioDot: {
    width:           10,
    height:          10,
    borderRadius:    5,
    backgroundColor: Bordeaux.default,
  },
  planTexts: {
    flex: 1,
    gap:  2,
  },
  planLabel: {
    fontFamily: FontFamily.sansSemibold,
    fontSize:   FontSize.body,
    color:      Ink.default,
  },
  planLabelSelected: {
    color: Bordeaux.deep,
  },
  planSub: {
    fontFamily: FontFamily.sans,
    fontSize:   FontSize.xs,
    color:      Ink.muted,
  },
  planSavings: {
    fontFamily: FontFamily.sansMedium,
    fontSize:   FontSize.xs,
    color:      Bordeaux.soft,
  },
  planPrice: {
    fontFamily: FontFamily.sansBold,
    fontSize:   FontSize.h4,
    color:      Ink.default,
  },
  planPriceSelected: {
    color: Bordeaux.default,
  },

  // CTA
  cta: {
    backgroundColor: Bordeaux.default,
    borderRadius:    Radius.lg,
    height:          52,
    alignItems:      'center',
    justifyContent:  'center',
  },
  ctaPressed: {
    backgroundColor: Bordeaux.deep,
  },
  ctaText: {
    fontFamily: FontFamily.sansSemibold,
    fontSize:   FontSize.body,
    color:      Cream.default,
  },
  ctaNote: {
    fontFamily: FontFamily.sans,
    fontSize:   FontSize.xs,
    color:      Ink.faint,
    textAlign:  'center',
    marginTop:  -Space.s2,
  },

  // Footer
  footer: {
    flexDirection:  'row',
    justifyContent: 'center',
    alignItems:     'center',
    gap:            Space.s2,
    marginTop:      Space.s2,
  },
  footerLink: {
    fontFamily: FontFamily.sans,
    fontSize:   FontSize.xs,
    color:      Ink.muted,
    textDecorationLine: 'underline',
  },
  footerSep: {
    color: Ink.faint,
  },
})
