/**
 * ZESTUP — Design Tokens
 * Source de vérité : colors_and_type.css (Design System v0.1)
 *
 * Fonts requis (à installer) :
 *   npx expo install @expo-google-fonts/instrument-serif @expo-google-fonts/geist
 * Puis charger dans app/_layout.tsx avec useFonts().
 * En attendant, les fallbacks système (Georgia / System) sont utilisés.
 */

// ─── Couleurs — Fondations ────────────────────────────────────────────────────
export const Cream = {
  default: '#F4EFE6',  // background principal — JAMAIS du blanc pur
  deep:    '#EFE8DC',  // hover / surface secondaire
  darker:  '#EBE3D5',  // press / surface alternative
  paper:   '#FBF8F2',  // surface légèrement plus claire
} as const

export const Ink = {
  default: '#1F1B17',  // texte principal (anthracite chaud)
  soft:    '#3A332C',  // texte secondaire
  muted:   '#6B6259',  // tertiaire / captions
  faint:   '#A39A8E',  // placeholder / disabled
} as const

export const Line = {
  default: '#E4DBCB',  // hairline par défaut sur crème
  strong:  '#D4C8B3',  // hairline sélectionné / emphase
} as const

// ─── Couleurs — Accents ───────────────────────────────────────────────────────
export const Bordeaux = {
  default: '#6B1F2A',  // accent émotionnel principal
  deep:    '#4F151E',  // press
  soft:    '#8C2F3C',  // hover
  tint:    '#F0E1E1',  // surface tint
} as const

// Micro-dopamine — JAMAIS en dominante, JAMAIS en CTA agressif
// Usage : badges, état actif subtil, check de courses, validation
export const Honey = {
  default: '#E8C547',
  soft:    '#F2DF8B',
  tint:    '#FAF1D2',
} as const

export const Brun = {
  default: '#8B5A3C',  // accent chaud secondaire
  soft:    '#A87858',
  tint:    '#EFE2D4',
} as const

export const Sable = {
  default: '#C4A57B',  // or mat tertiaire
  tint:    '#EDE3D2',
} as const

// ─── Couleurs — Statut (ton désaturé intentionnel) ────────────────────────────
export const Status = {
  success:     '#4A6B45',
  successTint: '#E4EAD9',
  warning:     '#A07A24',
  warningTint: '#F1E8D2',
  danger:      '#6B1F2A',   // même famille que bordeaux
  dangerTint:  '#F0E1E1',
} as const

// ─── Aliases sémantiques (utiliser ces constantes dans les composants) ────────
export const Colors = {
  bg:           Cream.default,
  bgAlt:        Cream.paper,
  bgHover:      Cream.deep,
  bgPress:      Cream.darker,
  fg:           Ink.default,
  fg2:          Ink.soft,
  fg3:          Ink.muted,
  fgFaint:      Ink.faint,
  border:       Line.default,
  borderStrong: Line.strong,
  accent:       Bordeaux.default,
  accentFg:     Cream.default,
  honey:        Honey.default,
  honeyTint:    Honey.tint,
} as const

// ─── Typographie ──────────────────────────────────────────────────────────────
// Règle : le serif s'arrête au titre. Sous-titre et en-dessous = sans uniquement.
// Jamais Inter, jamais Roboto, jamais SF Pro neutre.
export const FontFamily = {
  // Charger via @expo-google-fonts/instrument-serif
  serif:        'InstrumentSerif_400Regular',
  serifItalic:  'InstrumentSerif_400Regular_Italic',
  // Charger via @expo-google-fonts/geist
  sans:         'Geist_400Regular',
  sansMedium:   'Geist_500Medium',
  sansSemibold: 'Geist_600SemiBold',
  sansBold:     'Geist_700Bold',
  // Fallbacks système (tant que les polices ne sont pas chargées)
  serifFallback: 'Georgia',
  sansFallback:  'System',
} as const

export const FontSize = {
  display: 64,
  h1:      40,
  h2:      28,
  h3:      22,
  h4:      18,
  body:    16,
  sm:      14,
  xs:      12,
  eyebrow: 11,  // uppercase + letterSpacing eyebrow
} as const

// Multiplier par fontSize pour obtenir lineHeight en px (React Native attend une valeur px)
export const LineHeight = {
  display: 1.05,
  tight:   1.15,
  snug:    1.25,
  body:    1.45,
  loose:   1.6,
} as const

// letterSpacing en px = LetterSpacing[x] * FontSize[y]
export const LetterSpacing = {
  tight:   -0.02,
  snug:    -0.01,
  normal:  0,
  wide:    0.04,
  eyebrow: 0.12,
} as const

// ─── Espacement ───────────────────────────────────────────────────────────────
export const Space = {
  s1:  4,
  s2:  8,
  s3:  12,
  s4:  16,
  s5:  24,
  s6:  32,
  s7:  48,
  s8:  64,
  s9:  96,
} as const

// ─── Radii ────────────────────────────────────────────────────────────────────
export const Radius = {
  sm:   8,
  md:   12,   // inputs, chips
  lg:   16,   // cartes standard
  xl:   20,   // cartes hero
  xxl:  24,   // today hero
  pill: 999,
} as const

// ─── Ombres ───────────────────────────────────────────────────────────────────
// Presque aucune — le système repose sur des hairlines et des changements de ton.
// Exception : sheets flottants et FAB.
export const Shadow = {
  card: {
    shadowColor:   '#1F1B17',
    shadowOffset:  { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius:  16,
    elevation:     4,
  },
  sheet: {
    shadowColor:   '#1F1B17',
    shadowOffset:  { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius:  20,
    elevation:     8,
  },
} as const

// ─── Motion ───────────────────────────────────────────────────────────────────
// Lent, doux, presque ambiant. Pas de bounce, pas de spring excessif.
export const Duration = {
  fast: 180,
  base: 380,
  slow: 560,
} as const

// cubic-bezier(0.22, 0.61, 0.36, 1) → Easing.bezier(0.22, 0.61, 0.36, 1) dans Reanimated
export const MotionEasing = [0.22, 0.61, 0.36, 1] as [number, number, number, number]
