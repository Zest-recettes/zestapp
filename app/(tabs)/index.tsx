/**
 * ZESTUP — Écran Repas (onglet principal)
 *
 * Règles design ZESTUP :
 * - Fond crème #F4EFE6, jamais de blanc pur
 * - Accent bordeaux #6B1F2A, aucun vert ni bleu
 * - Aucun emoji dans l'UI produit
 * - Typographie : serif pour les titres éditoriaux, sans (fontWeight 500/600) pour le reste
 * - Cartes : border #E4DBCB, radius 16px, padding 16px
 * - Repas du jour : bordeaux-tinted, barre latérale bordeaux
 * - Copy française, tu, sentence case
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useWeekGenerator } from '../../hooks/use-week-generator';
import type { RecetteRow } from '../../types/recette';
import { categoriserRecette } from '../../types/recette';
import { trackEvent } from '../../lib/analytics';
import {
  Bordeaux,
  Cream,
  FontSize,
  Ink,
  Line,
  Radius,
  Space,
} from '../../constants/theme';

// ─── Régime utilisateur ───────────────────────────────────────────────────────
// TODO : lire depuis Supabase profiles une fois l'auth branchée
const REGIME_UTILISATEUR = 'classique' as const

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

function getWeekLabel(): string {
  const now  = new Date();
  const day  = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

// ─── Carte Repas ─────────────────────────────────────────────────────────────

type JourCardProps = {
  jour: string;
  recette: RecetteRow | undefined;
  index: number;
};

function JourCard({ jour, recette, index }: JourCardProps) {
  function handlePress() {
    if (recette) {
      trackEvent('recipe_opened', 'recettes', String(recette.id), {
        recipe_id:   recette.id,
        recipe_name: recette.titre,
        jour,
      });
    }
  }
  const todayIndex = new Date().getDay() - 1;
  const isToday = todayIndex === index;
  const isPast  = todayIndex > index;

  return (
    <Pressable
      style={[styles.card, isToday && styles.cardToday, isPast && styles.cardPast]}
      onPress={handlePress}
    >
      {isToday && <View style={styles.todayIndicator} />}

      <View style={styles.cardLeft}>
        <Text style={[styles.jourLabel, isToday && styles.jourLabelToday, isPast && styles.jourLabelPast]}>
          {jour}
        </Text>
        {isToday && (
          <View style={styles.todayPill}>
            <Text style={styles.todayPillText}>Aujourd'hui</Text>
          </View>
        )}
      </View>

      {recette ? (
        <View style={styles.cardRight}>
          <Text style={[styles.recetteTitre, isPast && styles.recetteTitrePast]} numberOfLines={2}>
            {recette.titre}
          </Text>
          <Text style={styles.recetteMeta}>
            {[
              recette.temps_preparation ? `${recette.temps_preparation} min` : null,
              recette.proteines ?? null,
            ].filter(Boolean).join('  ·  ')}
          </Text>
        </View>
      ) : (
        <View style={styles.cardRight}>
          <Text style={styles.repasLibre}>Jour libre. On s'occupe du reste.</Text>
        </View>
      )}
    </Pressable>
  );
}

// ─── Panneau debug catalogue ──────────────────────────────────────────────────

type AuditLogType = NonNullable<ReturnType<typeof useWeekGenerator>['plan']>['auditLog'];

function DebugCatalogue({ auditLog }: { auditLog: AuditLogType }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.debugContainer}>
      <Pressable onPress={() => setOpen(v => !v)} style={styles.debugToggle}>
        <Text style={styles.debugToggleText}>
          {open ? 'Fermer debug' : 'Debug catalogue'}
        </Text>
      </Pressable>

      {open && (
        <View style={styles.debugPanel}>
          <Text style={styles.debugTitle}>Catalogue disponible</Text>
          <Text style={styles.debugLine}>Régime : {auditLog.regime.toUpperCase()}</Text>
          <Text style={styles.debugLine}>Total : {auditLog.totalDisponibles} recettes</Text>
          <Text style={styles.debugSep}>──────────────────</Text>
          <Text style={[styles.debugLine, styles.debugViande]}>Viande : {auditLog.viande}</Text>
          <Text style={[styles.debugLine, styles.debugPoisson]}>Poisson : {auditLog.poisson}</Text>
          <Text style={[styles.debugLine, styles.debugVeg]}>Végétarien : {auditLog.vegetarien}</Text>
          <Text style={styles.debugLine}>Après filtre fingerprint : {auditLog.disponiblesApresFiltre}</Text>
          <Text style={styles.debugSep}>──────────────────</Text>
          <Text style={styles.debugTitle}>Semaine générée ({auditLog.generationsEssayees} tentative(s)) :</Text>
          {auditLog.semaine.map((r, i) => (
            <View key={r.id}>
              <Text style={styles.debugLine}>
                {i + 1}. [{r.categorie.toUpperCase()}] {r.titre}
              </Text>
              <Text style={styles.debugSubLine}>
                {'   '}protein={r.fingerprint.protein ?? '—'} | cook={r.fingerprint.cookingMethod ?? '—'} | cuisine={r.fingerprint.cuisineFamily ?? '—'}
              </Text>
            </View>
          ))}
          {auditLog.historiqueSemaines.length > 0 && (
            <>
              <Text style={styles.debugSep}>──────────────────</Text>
              <Text style={styles.debugTitle}>Historique ({auditLog.historiqueSemaines.length} semaine(s)) :</Text>
              {auditLog.historiqueSemaines.map((h, i) => (
                <Text key={i} style={styles.debugLine}>{h.weekLabel} — {h.count} recettes</Text>
              ))}
            </>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Écran principal ─────────────────────────────────────────────────────────

export default function RepasScreen() {
  const { plan, loading, error, generer } = useWeekGenerator(REGIME_UTILISATEUR);

  useEffect(() => {
    trackEvent('open_home', 'navigation');
    generer();
  }, []);

  const recettes = plan?.recettes ?? [];

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>Zestup</Text>
        <View style={styles.headerMeta}>
          <Text style={styles.headerEyebrow}>SEMAINE DU</Text>
          <Text style={styles.headerDate}>{getWeekLabel()}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Bordeaux.default} />
          <Text style={styles.loadingText}>Un instant…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Cette semaine.</Text>
          </View>

          {error ? (
            <View style={styles.center}>
              <Text style={styles.loadingText}>Impossible de charger les repas.</Text>
              <Pressable onPress={generer} style={{ marginTop: 8 }}>
                <Text style={{ color: Bordeaux.default, fontSize: 14 }}>Réessayer</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {JOURS.map((jour, i) => (
                <JourCard
                  key={jour}
                  jour={jour}
                  recette={recettes[i]}
                  index={i}
                />
              ))}

              <Pressable style={styles.regenBtn} onPress={generer}>
                <Text style={styles.regenText}>Regénérer la semaine</Text>
              </Pressable>

              {plan && (
                <DebugCatalogue auditLog={plan.auditLog} />
              )}
            </>
          )}

          <View style={styles.footerNote}>
            <Text style={styles.footerText}>
              {recettes.length} repas. Tout pensé ensemble.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Cream.default },

  header: {
    paddingTop:        56,
    paddingBottom:     Space.s4,
    paddingHorizontal: Space.s5,
    borderBottomWidth: 1,
    borderBottomColor: Line.default,
    backgroundColor:   Cream.default,
    flexDirection:     'row',
    alignItems:        'flex-end',
    justifyContent:    'space-between',
  },
  wordmark: {
    fontFamily:    'InstrumentSerif_400Regular_Italic',
    fontSize:      26,
    color:         Ink.default,
    letterSpacing: -0.3,
    lineHeight:    30,
  },
  headerMeta: { alignItems: 'flex-end' },
  headerEyebrow: {
    fontSize:      FontSize.eyebrow,
    color:         Ink.muted,
    letterSpacing: 1.2,
    marginBottom:  2,
  },
  headerDate: {
    fontSize:   FontSize.sm,
    color:      Ink.soft,
    fontWeight: '500',
  },

  center: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            Space.s3,
  },
  loadingText: {
    fontSize:   FontSize.sm,
    color:      Ink.muted,
    fontFamily: 'InstrumentSerif_400Regular_Italic',
  },

  scroll: {
    paddingHorizontal: Space.s5,
    paddingBottom:     Space.s8,
    paddingTop:        Space.s3,
  },

  sectionHeader: {
    paddingTop:    Space.s4,
    paddingBottom: Space.s4,
  },
  sectionTitle: {
    fontFamily:    'InstrumentSerif_400Regular_Italic',
    fontSize:      FontSize.h3,
    color:         Ink.default,
    letterSpacing: -0.3,
  },

  // Carte
  card: {
    backgroundColor: Cream.paper,
    borderRadius:    Radius.lg,
    padding:         Space.s4,
    marginBottom:    Space.s2,
    borderWidth:     1,
    borderColor:     Line.default,
    flexDirection:   'row',
    alignItems:      'center',
    gap:             Space.s4,
    overflow:        'hidden',
  },
  cardToday: {
    backgroundColor: Bordeaux.tint,
    borderColor:     Bordeaux.default,
  },
  cardPast: { opacity: 0.55 },

  todayIndicator: {
    position:               'absolute',
    left:                   0,
    top:                    0,
    bottom:                 0,
    width:                  3,
    backgroundColor:        Bordeaux.default,
    borderTopLeftRadius:    Radius.lg,
    borderBottomLeftRadius: Radius.lg,
  },

  cardLeft:      { width: 80, paddingLeft: Space.s1 },
  jourLabel: {
    fontSize:   FontSize.sm,
    fontWeight: '500',
    color:      Ink.muted,
  },
  jourLabelToday: { color: Bordeaux.default, fontWeight: '600' },
  jourLabelPast:  { color: Ink.faint },

  todayPill: {
    marginTop:         Space.s1,
    alignSelf:         'flex-start',
    backgroundColor:   Bordeaux.default,
    borderRadius:      Radius.pill,
    paddingHorizontal: 6,
    paddingVertical:   2,
  },
  todayPillText: {
    fontSize:      9,
    color:         Cream.default,
    fontWeight:    '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  cardRight: { flex: 1 },
  recetteTitre: {
    fontSize:   FontSize.sm,
    fontWeight: '500',
    color:      Ink.default,
    lineHeight: FontSize.sm * 1.45,
  },
  recetteTitrePast: { color: Ink.muted },
  recetteMeta: {
    fontSize:  FontSize.xs,
    color:     Ink.muted,
    marginTop: Space.s1,
  },
  repasLibre: {
    fontSize:   FontSize.sm,
    color:      Ink.faint,
    fontFamily: 'InstrumentSerif_400Regular_Italic',
  },

  // Bouton regénérer
  regenBtn: {
    marginTop:         Space.s4,
    paddingVertical:   Space.s3,
    paddingHorizontal: Space.s5,
    backgroundColor:   Bordeaux.default,
    borderRadius:      Radius.lg,
    alignItems:        'center',
  },
  regenText: {
    color:      '#fff',
    fontSize:   FontSize.sm,
    fontWeight: '600',
  },

  // Debug panel
  debugContainer: {
    marginTop: Space.s4,
  },
  debugToggle: {
    paddingVertical:   Space.s2,
    paddingHorizontal: Space.s3,
    borderWidth:       1,
    borderColor:       Line.default,
    borderRadius:      Radius.sm,
    alignSelf:         'flex-start',
  },
  debugToggleText: {
    fontSize:  FontSize.xs,
    color:     Ink.muted,
    fontWeight: '500',
  },
  debugPanel: {
    marginTop:       Space.s2,
    padding:         Space.s3,
    backgroundColor: Cream.paper,
    borderRadius:    Radius.lg,
    borderWidth:     1,
    borderColor:     Line.default,
    gap:             2,
  },
  debugTitle: {
    fontSize:   FontSize.xs,
    fontWeight: '700',
    color:      Ink.default,
    marginTop:  Space.s1,
  },
  debugLine: {
    fontSize:   FontSize.xs,
    color:      Ink.muted,
    fontFamily: 'monospace',
  },
  debugSubLine: {
    fontSize:   8,
    color:      Ink.faint,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  debugSep: {
    fontSize: FontSize.xs,
    color:    Ink.faint,
    marginVertical: 2,
  },
  debugViande:  { color: '#8B2020' },
  debugPoisson: { color: '#1A5C8B' },
  debugVeg:     { color: '#2E7D32' },

  footerNote: { marginTop: Space.s5, alignItems: 'center' },
  footerText: {
    fontSize:   FontSize.xs,
    color:      Ink.faint,
    fontFamily: 'InstrumentSerif_400Regular_Italic',
  },
});
