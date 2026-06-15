/**
 * ZESTUP — Écran confirmation abonnement
 *
 * Cible du deep link : zestapp://subscribe-success
 * Affiché après le retour de Stripe Checkout.
 * Vérifie le statut d'abonnement (le webhook Stripe a mis à jour Supabase)
 * puis redirige vers l'app principale.
 */

import React, { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View, Pressable } from 'react-native'
import { router } from 'expo-router'
import { getSubscription, isSubscribed } from '@/lib/subscription'
import {
  Bordeaux,
  Cream,
  FontFamily,
  FontSize,
  Ink,
  Radius,
  Space,
  Status,
} from '@/constants/theme'

export default function SubscribeSuccessScreen() {
  const [checking, setChecking] = useState(true)
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    // On attend un court instant que le webhook Stripe ait eu le temps
    // de mettre à jour Supabase, puis on vérifie le statut.
    const timer = setTimeout(async () => {
      const sub = await getSubscription()
      setSubscribed(isSubscribed(sub))
      setChecking(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  function handleContinue() {
    router.replace('/(tabs)')
  }

  return (
    <View style={styles.container}>
      {checking ? (
        <>
          <ActivityIndicator size="large" color={Bordeaux.default} />
          <Text style={styles.checkingText}>Activation en cours…</Text>
        </>
      ) : subscribed ? (
        <>
          {/* Icône succès */}
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>✓</Text>
          </View>

          <Text style={styles.title}>Bienvenue dans ZESTUP</Text>
          <Text style={styles.subtitle}>
            Ton abonnement est actif. Tu ne te poseras plus jamais la question.
          </Text>

          <Pressable
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            onPress={handleContinue}
          >
            <Text style={styles.ctaText}>Découvrir l'app</Text>
          </Pressable>
        </>
      ) : (
        <>
          {/* Cas où le webhook n'est pas encore arrivé */}
          <Text style={styles.title}>Paiement reçu</Text>
          <Text style={styles.subtitle}>
            L'activation peut prendre quelques secondes. Si ça ne se débloque pas, relance l'app.
          </Text>

          <Pressable
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            onPress={handleContinue}
          >
            <Text style={styles.ctaText}>Continuer</Text>
          </Pressable>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: Cream.default,
    alignItems:      'center',
    justifyContent:  'center',
    paddingHorizontal: Space.s5,
    gap:             Space.s5,
  },
  checkingText: {
    fontFamily: FontFamily.sans,
    fontSize:   FontSize.sm,
    color:      Ink.muted,
    marginTop:  Space.s3,
  },
  iconCircle: {
    width:           64,
    height:          64,
    borderRadius:    32,
    backgroundColor: Status.successTint,
    alignItems:      'center',
    justifyContent:  'center',
  },
  iconText: {
    fontSize:  28,
    color:     Status.success,
    fontFamily: FontFamily.sans,
  },
  title: {
    fontFamily: FontFamily.serif,
    fontSize:   FontSize.h2,
    color:      Ink.default,
    textAlign:  'center',
  },
  subtitle: {
    fontFamily: FontFamily.sans,
    fontSize:   FontSize.sm,
    color:      Ink.muted,
    textAlign:  'center',
    lineHeight: FontSize.sm * 1.6,
    maxWidth:   300,
  },
  cta: {
    backgroundColor:  Bordeaux.default,
    borderRadius:     Radius.lg,
    paddingVertical:  14,
    paddingHorizontal: Space.s7,
  },
  ctaPressed: {
    backgroundColor: Bordeaux.deep,
  },
  ctaText: {
    fontFamily: FontFamily.sansSemibold,
    fontSize:   FontSize.body,
    color:      Cream.default,
  },
})
