/**
 * ZESTUP — Point d'entrée
 *
 * Routing au démarrage :
 *   Non connecté          → /login
 *   Connecté, abonné      → /(tabs)
 *   Connecté, non abonné  → /paywall
 */

import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { supabase } from '@/lib/supabase'
import { getSubscription, isSubscribed } from '@/lib/subscription'
import { Cream, Bordeaux } from '@/constants/theme'

type Route = '/login' | '/(tabs)' | '/paywall'

export default function Index() {
  const [route, setRoute] = useState<Route | null>(null)

  useEffect(() => {
    async function resolve() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        setRoute('/login')
        return
      }

      const sub = await getSubscription()
      setRoute(isSubscribed(sub) ? '/(tabs)' : '/paywall')
    }

    resolve()
  }, [])

  if (!route) {
    return (
      <View style={{ flex: 1, backgroundColor: Cream.default, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={Bordeaux.default} />
      </View>
    )
  }

  return <Redirect href={route} />
}
