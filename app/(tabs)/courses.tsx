/**
 * ZESTUP — Écran Courses
 *
 * Règles design ZESTUP :
 * - Fond crème #F4EFE6, sections sur paper #FBF8F2
 * - Check coché → fond honey #E8C547, disparaît de la liste (achat confirmé)
 * - Ingrédients passés non cochés → grisés, déplacés en bas, label jour discret
 * - Aucun emoji
 * - Eyebrow uppercase en ink-muted pour les sections
 * - Lignes généreuses : check 26×26, nom à gauche, quantité mono à droite
 *
 * Architecture jours :
 * - Futurs non cochés     → affichage normal, en tête de section
 * - Passés non cochés     → grisés, en bas de section, label jour affiché
 * - Cochés (achetés)      → disparaissent immédiatement de la liste
 *
 * Analytics mesurées :
 * - ingredient_checked / unchecked (avec flag is_past_meal si applicable)
 * - shopping_list_opened + durée de session
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useDayAwareShopping } from '../../hooks/use-day-aware-shopping';
import type { MealDay, ShoppingRow } from '../../types/shopping';
import { trackEvent } from '../../lib/analytics';
import {
  Bordeaux,
  Cream,
  FontSize,
  Honey,
  Ink,
  Line,
  Radius,
  Space,
} from '../../constants/theme';

// ─── Plan de test (à remplacer par les données réelles du week_plan) ──────────
// isPast : true si le jour est déjà passé par rapport à aujourd'hui
const _today = new Date().getDay() // 0=dim, 1=lun...
const TEST_MEAL_PLAN: MealDay[] = [
  { dayLabel: 'Lundi',    recipeId: 1, isPast: _today > 1 },
  { dayLabel: 'Mardi',    recipeId: 2, isPast: _today > 2 },
  { dayLabel: 'Mercredi', recipeId: 3, isPast: _today > 3 },
  { dayLabel: 'Jeudi',    recipeId: 4, isPast: _today > 4 },
  { dayLabel: 'Vendredi', recipeId: 5, isPast: _today > 5 },
]

const CATEGORY_LABELS: Record<string, string> = {
  fruits_legumes:    'Fruits & légumes',
  viandes_poissons:  'Viandes & poissons',
  produits_frais:    'Produits frais',
  epicerie:          'Épicerie',
  surgeles:          'Surgelés',
  condiments_huiles: 'Condiments & huiles',
  boulangerie:       'Boulangerie',
  garde_manger:      'Vérifiez si vous avez déjà',
}

// ─── Ligne course ─────────────────────────────────────────────────────────────

type ShoppingItemProps = {
  item: ShoppingRow
  checked: boolean
  onToggle: () => void
}

function ShoppingItem({ item, checked, onToggle }: ShoppingItemProps) {
  const isStaple = item.staple_level === 'ALWAYS_STAPLE'
  const isPast   = item.is_past_meal === true

  return (
    <Pressable
      style={[
        styles.item,
        checked  && styles.itemChecked,
        isStaple && !isPast && styles.itemStaple,
        isPast   && styles.itemPast,
      ]}
      onPress={onToggle}
      android_ripple={{ color: Honey.tint }}
    >
      {/* Cercle check */}
      <View style={[
        styles.checkCircle,
        checked && styles.checkCircleChecked,
        isPast  && styles.checkCirclePast,
      ]}>
        {checked && <View style={styles.checkMark} />}
      </View>

      {/* Nom + label jour */}
      <View style={styles.labelWrap}>
        <Text
          style={[
            styles.itemLabel,
            checked  && styles.itemLabelChecked,
            isStaple && !isPast && styles.itemLabelStaple,
            isPast   && styles.itemLabelPast,
          ]}
          numberOfLines={1}
        >
          {item.shopping_label || '—'}
        </Text>
        {isPast && item.meal_day_label ? (
          <Text style={styles.dayLabel}>{item.meal_day_label}</Text>
        ) : null}
      </View>

      {/* Quantité */}
      {item.quantity_label ? (
        <Text style={[
          styles.itemQty,
          checked && styles.itemQtyChecked,
          isPast  && styles.itemQtyPast,
        ]}>
          {item.quantity_label}
        </Text>
      ) : null}
    </Pressable>
  )
}

// ─── En-tête de section ───────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  const label = CATEGORY_LABELS[title] ?? title
  return (
    <Pressable
      style={styles.sectionHeader}
      onPress={() => trackEvent('shopping_category_opened', 'courses', title)}
    >
      <Text style={styles.sectionTitle}>{label.toUpperCase()}</Text>
    </Pressable>
  )
}

// ─── Séparateur passé/futur ───────────────────────────────────────────────────

function PastDivider() {
  return (
    <View style={styles.pastDivider}>
      <View style={styles.pastDividerLine} />
      <Text style={styles.pastDividerLabel}>Repas passés</Text>
      <View style={styles.pastDividerLine} />
    </View>
  )
}

// ─── Écran principal ─────────────────────────────────────────────────────────

export default function CoursesScreen() {
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const { sections, rawRows, loading, error, refetch } = useDayAwareShopping(TEST_MEAL_PLAN)
  const openedAt = useRef(Date.now())

  useEffect(() => {
    trackEvent('open_shopping_list', 'navigation')
    trackEvent('shopping_list_opened', 'courses')
    openedAt.current = Date.now()

    return () => {
      const seconds = Math.round((Date.now() - openedAt.current) / 1000)
      if (seconds > 2) {
        trackEvent('shopping_list_opened', 'courses', String(seconds), { duration_seconds: seconds })
      }
    }
  }, [])

  function toggleItem(item: ShoppingRow) {
    setChecked(prev => {
      const next = new Set(prev)
      const id   = item.shopping_identity
      if (next.has(id)) {
        next.delete(id)
        trackEvent('ingredient_unchecked', 'courses', id)
      } else {
        next.add(id)
        // Analytics enrichies : flag si c'est un ingrédient de repas passé
        trackEvent('ingredient_checked', 'courses', id, {
          is_past_meal:   item.is_past_meal ?? false,
          meal_day_label: item.meal_day_label ?? null,
        })
      }
      return next
    })
  }

  const analytics = useMemo(() => {
    const total         = rawRows.length
    const checkedCount  = checked.size
    const pastUnchecked = rawRows.filter(r => r.is_past_meal && !checked.has(r.shopping_identity)).length
    return { total, checkedCount, pastUnchecked }
  }, [rawRows, checked])

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color={Bordeaux.default} />
        <Text style={styles.loadingText}>Un instant…</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={[styles.root, styles.center]}>
        <Text style={styles.errorTitle}>Quelque chose s'est mal passé.</Text>
        <Text style={styles.errorMsg}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={refetch}>
          <Text style={styles.retryText}>Réessayer</Text>
        </Pressable>
      </View>
    )
  }

  // Type union pour SectionList : item normal ou séparateur visuel
  type SectionItem = ShoppingRow | { _divider: true; key: string }

  const sectionData = sections.map(s => {
    const visible = s.items.filter(i => !checked.has(i.shopping_identity))
    const futurs  = visible.filter(i => !i.is_past_meal)
    const passes  = visible.filter(i =>  i.is_past_meal)

    const data: SectionItem[] = [...futurs]
    if (passes.length > 0 && futurs.length > 0) {
      data.push({ _divider: true, key: `divider-${s.category}` })
    }
    data.push(...passes)

    return { title: s.category, data }
  }).filter(s => s.data.length > 0)

  const { total, checkedCount, pastUnchecked } = analytics
  const futuresDone = total - pastUnchecked - checkedCount === 0 && checkedCount > 0

  return (
    <View style={styles.root}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Courses.</Text>
        <Text style={styles.headerSub}>
          {checkedCount > 0
            ? `${checkedCount} sur ${total}`
            : 'Une seule liste. Tout pensé ensemble.'}
        </Text>
      </View>

      {/* Barre de progression honey */}
      {total > 0 && (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressBar,
              { width: `${(checkedCount / total) * 100}%` },
            ]}
          />
        </View>
      )}

      <SectionList
        sections={sectionData}
        keyExtractor={(item, i) => {
          if ('_divider' in item) return item.key
          return `${item.shopping_identity}-${i}`
        }}
        renderItem={({ item }) => {
          if ('_divider' in item) return <PastDivider />
          return (
            <ShoppingItem
              item={item}
              checked={checked.has(item.shopping_identity)}
              onToggle={() => toggleItem(item)}
            />
          )
        }}
        renderSectionHeader={({ section }) => (
          <SectionHeader title={section.title} />
        )}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>Rien à acheter cette semaine — profite.</Text>
          </View>
        }
        ListFooterComponent={
          futuresDone ? (
            <View style={styles.doneFooter}>
              <Text style={styles.doneText}>C'est tout. La semaine est prête.</Text>
            </View>
          ) : null
        }
      />
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Cream.default },

  center: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    padding:        Space.s5,
    gap:            Space.s3,
  },

  // En-tête
  header: {
    paddingTop:        56,
    paddingBottom:     Space.s4,
    paddingHorizontal: Space.s5,
    borderBottomWidth: 1,
    borderBottomColor: Line.default,
    backgroundColor:   Cream.default,
  },
  headerTitle: {
    fontFamily:    'InstrumentSerif_400Regular_Italic',
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

  // Barre de progression honey
  progressTrack: {
    height:          2,
    backgroundColor: Line.default,
  },
  progressBar: {
    height:          2,
    backgroundColor: Honey.default,
  },

  // Section
  sectionHeader: {
    backgroundColor:   Cream.paper,
    paddingHorizontal: Space.s5,
    paddingVertical:   Space.s2,
    borderBottomWidth: 1,
    borderBottomColor: Line.default,
  },
  sectionTitle: {
    fontSize:      FontSize.eyebrow,
    color:         Ink.muted,
    letterSpacing: 1.2,
    fontWeight:    '500',
  },

  listContent: { paddingBottom: Space.s9 },

  // Séparateur passé/futur
  pastDivider: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: Space.s5,
    paddingVertical:   Space.s2,
    backgroundColor:   Cream.default,
    gap:               Space.s3,
  },
  pastDividerLine: {
    flex:            1,
    height:          1,
    backgroundColor: Line.default,
  },
  pastDividerLabel: {
    fontSize:      9,
    color:         Ink.faint,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Ligne course — futur (normal)
  item: {
    backgroundColor:   Cream.paper,
    paddingHorizontal: Space.s5,
    paddingVertical:   Space.s4,
    borderBottomWidth: 1,
    borderBottomColor: Line.default,
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Space.s3,
  },
  itemChecked: {
    backgroundColor: Honey.tint,
  },
  itemStaple: {
    opacity: 0.6,
  },
  // Ligne passée non cochée
  itemPast: {
    opacity:         0.45,
    backgroundColor: Cream.default,
  },

  // Cercle check
  checkCircle: {
    width:           26,
    height:          26,
    borderRadius:    13,
    borderWidth:     1.5,
    borderColor:     Line.strong,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  checkCircleChecked: {
    backgroundColor: Honey.default,
    borderColor:     Honey.default,
  },
  checkCirclePast: {
    borderColor: Line.default,
  },
  checkMark: {
    width:             10,
    height:            6,
    borderBottomWidth: 2,
    borderLeftWidth:   2,
    borderColor:       Ink.default,
    transform:         [{ rotate: '-45deg' }],
    marginTop:         -2,
  },

  // Textes item
  labelWrap: {
    flex: 1,
    gap:  1,
  },
  itemLabel: {
    fontSize:   FontSize.body,
    color:      Ink.default,
    fontWeight: '400',
  },
  itemLabelChecked: {
    color:              Ink.muted,
    textDecorationLine: 'line-through',
    opacity:            0.7,
  },
  itemLabelStaple: {
    color: Ink.muted,
  },
  itemLabelPast: {
    color: Ink.faint,
  },
  dayLabel: {
    fontSize:      9,
    color:         Ink.faint,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  itemQty: {
    fontSize:   FontSize.sm,
    color:      Ink.muted,
    fontFamily: 'monospace',
    flexShrink: 0,
  },
  itemQtyChecked: { color: Ink.faint },
  itemQtyPast:    { color: Ink.faint },

  // États
  loadingText: {
    fontSize:   FontSize.sm,
    color:      Ink.muted,
    fontFamily: 'InstrumentSerif_400Regular_Italic',
  },
  errorTitle: {
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontSize:   FontSize.h4,
    color:      Ink.default,
  },
  errorMsg: {
    fontSize:  FontSize.sm,
    color:     Ink.muted,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop:         Space.s2,
    paddingVertical:   Space.s3,
    paddingHorizontal: Space.s5,
    backgroundColor:   Bordeaux.default,
    borderRadius:      Radius.lg,
  },
  retryText: {
    color:      '#fff',
    fontSize:   FontSize.body,
    fontWeight: '600',
  },
  emptyText: {
    fontSize:   FontSize.body,
    color:      Ink.muted,
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    textAlign:  'center',
  },
  doneFooter: {
    padding:    Space.s6,
    alignItems: 'center',
  },
  doneText: {
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontSize:   FontSize.body,
    color:      Ink.muted,
  },
})
