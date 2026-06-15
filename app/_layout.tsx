import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';
import { Linking } from 'react-native';
import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from '@expo-google-fonts/geist';
import { Cream, Ink } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { setAnalyticsUser, trackEvent } from '@/lib/analytics';
import { initSentry, Sentry } from '@/lib/sentry';

initSentry();

// ZESTUP est un produit mono-thème : fond crème chaud, jamais dark mode.
const ZestupTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background:   Cream.default,
    card:         Cream.default,
    text:         Ink.default,
    border:       '#E4DBCB',
    notification: '#6B1F2A',
    primary:      '#6B1F2A',
  },
};

export default function RootLayout() {
  // Analytics + redirections auth en cours de session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const userId = data?.session?.user?.id ?? null
      setAnalyticsUser(userId)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const userId = session?.user?.id ?? null
      setAnalyticsUser(userId)
      if (event === 'SIGNED_IN') {
        trackEvent('login', 'auth')
        router.replace('/(tabs)')
      }
      if (event === 'SIGNED_OUT') {
        trackEvent('logout', 'auth')
        router.replace('/login')
      }
    })

    // ── Deep links Stripe ──────────────────────────────────────────────────
    // Gère les retours depuis Stripe Checkout :
    //   zestapp://subscribe-success → confirmation abonnement
    //   zestapp://subscribe-cancel  → retour silencieux

    const handleDeepLink = ({ url }: { url: string }) => {
      if (url.includes('subscribe-success')) {
        trackEvent('subscribe_success', 'subscription')
        router.replace('/subscribe-success')
      }
      // subscribe-cancel : on ne fait rien (l'utilisateur est déjà sur le paywall)
    }

    // Deep link reçu pendant que l'app tourne
    const sub = Linking.addEventListener('url', handleDeepLink)

    // Deep link qui a lancé l'app (cold start)
    Linking.getInitialURL().then(url => {
      if (url) handleDeepLink({ url })
    })

    return () => {
      subscription.unsubscribe()
      sub.remove()
    }
  }, [])

  const [fontsLoaded] = useFonts({
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });

  // Les polices se chargent en quelques ms — l'app s'affiche en fallback système
  // le temps du chargement, sans splash screen supplémentaire.

  return (
    <Sentry.ErrorBoundary fallback={null}>
      <ThemeProvider value={ZestupTheme}>
        <Stack>
          <Stack.Screen name="index"             options={{ headerShown: false }} />
          <Stack.Screen name="login"             options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)"            options={{ headerShown: false }} />
          <Stack.Screen name="paywall"           options={{ headerShown: false }} />
          <Stack.Screen name="subscribe-success" options={{ headerShown: false }} />
          <Stack.Screen name="modal"             options={{ presentation: 'modal', title: 'CGU & Confidentialité' }} />
        </Stack>
        <StatusBar style="dark" backgroundColor={Cream.default} />
      </ThemeProvider>
    </Sentry.ErrorBoundary>
  );
}
