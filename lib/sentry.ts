import * as Sentry from '@sentry/react';

/**
 * Initialise Sentry. Appelé une seule fois au démarrage dans _layout.tsx.
 * Requiert EXPO_PUBLIC_SENTRY_DSN dans .env.local — sans elle, Sentry reste inactif.
 */
export function initSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: __DEV__ ? 'development' : 'production',
    debug: __DEV__,

    // Remontée automatique des erreurs JS non interceptées :
    // @sentry/react active par défaut GlobalHandlers (window.onerror)
    // et UnhandledRejections (promesses non gérées) — aucune config supplémentaire requise.

    tracesSampleRate: 0.1,
  });
}

/**
 * Déclenche une erreur de test pour vérifier que Sentry reçoit bien les events.
 * À appeler depuis la console du navigateur : import('@/lib/sentry').then(m => m.testSentry())
 * ou via le bouton de test en développement.
 */
export function testSentry() {
  Sentry.captureException(new Error('[Zestup] Test Sentry — intégration OK'));
}

export { Sentry };
