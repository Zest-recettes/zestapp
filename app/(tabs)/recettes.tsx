/**
 * ZESTUP — Écran Favoris
 *
 * État vide éditorial (chaleureux, jamais culpabilisant).
 * La logique de sauvegarde des favoris sera ajoutée en phase 2.
 *
 * Règles design ZESTUP :
 * - Fond crème, typographie serif italique pour l'état vide
 * - Aucun emoji, aucun vert ni bleu
 * - Grille 2 colonnes prête à accueillir les cartes photo
 */

import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { trackEvent } from '../../lib/analytics';
import {
  Cream,
  FontSize,
  Ink,
  Line,
  Space,
} from '../../constants/theme';

export default function FavorisScreen() {
  // TODO phase 2 : charger les recettes sauvegardées depuis Supabase
  const favoris: unknown[] = [];

  useEffect(() => {
    trackEvent('open_favorites', 'navigation')
  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favoris.</Text>
        <Text style={styles.headerSub}>Ce que vous gardez près de vous.</Text>
      </View>

      {favoris.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Ce que vous aimerez{'\n'}se posera ici.</Text>
          <Text style={styles.emptyHint}>
            Appuyez sur le cœur d'un repas pour le garder.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Cream.default },

  header: {
    paddingTop:        56,
    paddingBottom:     Space.s4,
    paddingHorizontal: Space.s5,
    borderBottomWidth: 1,
    borderBottomColor: Line.default,
    backgroundColor:   Cream.default,
  },
  headerTitle: {
    fontFamily:    'Georgia',
    fontStyle:     'italic',
    fontSize:      FontSize.h2,
    color:         Ink.default,
    letterSpacing: -0.4,
    lineHeight:    FontSize.h2 * 1.15,
  },
  headerSub: {
    fontSize:  FontSize.sm,
    color:     Ink.muted,
    marginTop: Space.s1,
  },

  emptyState: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    padding:        Space.s6,
    gap:            Space.s4,
  },
  emptyTitle: {
    fontFamily:  'Georgia',
    fontStyle:   'italic',
    fontSize:    FontSize.h3,
    color:       Ink.default,
    textAlign:   'center',
    lineHeight:  FontSize.h3 * 1.35,
    letterSpacing: -0.3,
  },
  emptyHint: {
    fontSize:  FontSize.sm,
    color:     Ink.faint,
    textAlign: 'center',
    lineHeight: FontSize.sm * 1.6,
  },
});
