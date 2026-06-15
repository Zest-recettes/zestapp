/**
 * ZESTUP — AlimentSearch
 *
 * Moteur d'autocomplétion pour le champ "Aliments à éviter".
 * - Recherche temps réel dès le 1er caractère
 * - Fuzzy matching (tolérance aux fautes)
 * - Synonymes (patate → pomme de terre, poulet → filet de poulet...)
 * - Suggestions populaires quand champ vide
 * - Bonus catégorie (exclure saumon → proposer "tous les poissons ?")
 * - Zéro doublons, zéro texte libre
 *
 * Règles design ZESTUP : fond crème, hairline #E4DBCB, aucun emoji
 */

import React, { useCallback, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Cream,
  FontSize,
  Honey,
  Ink,
  Line,
  Radius,
  Space,
} from '../constants/theme';

// ─── Base ingrédients ZESTUP ──────────────────────────────────────────────────
// Source : ingredients_registry (is_active = true)

export type Aliment = {
  canonical: string;
  label: string;          // display_name
  category: string | null;  // protein_category pour le bonus
};

const ALIMENTS: Aliment[] = [
  { canonical: 'agneau',            label: 'Agneau',                category: 'red_meat' },
  { canonical: 'ail',               label: 'Ail',                   category: null },
  { canonical: 'asperge',           label: 'Asperge',               category: null },
  { canonical: 'aubergine',         label: 'Aubergine',             category: null },
  { canonical: 'avocat',            label: 'Avocat',                category: null },
  { canonical: 'basilic',           label: 'Basilic',               category: null },
  { canonical: 'beurre',            label: 'Beurre',                category: null },
  { canonical: 'boeuf',             label: 'Boeuf',                 category: 'red_meat' },
  { canonical: 'bouillon_cube',     label: 'Bouillon cube',         category: null },
  { canonical: 'boulgour',          label: 'Boulgour',              category: null },
  { canonical: 'burrata',           label: 'Burrata',               category: 'dairy_protein' },
  { canonical: 'cabillaud',         label: 'Cabillaud',             category: 'fish' },
  { canonical: 'canard',            label: 'Canard',                category: 'poultry' },
  { canonical: 'carotte',           label: 'Carotte',               category: null },
  { canonical: 'celeri_branche',    label: 'Céleri branche',        category: null },
  { canonical: 'cerise',            label: 'Cerise',                category: null },
  { canonical: 'champignon',        label: 'Champignon',            category: null },
  { canonical: 'cheddar',           label: 'Cheddar',               category: 'dairy_protein' },
  { canonical: 'chevre',            label: 'Chèvre',                category: 'dairy_protein' },
  { canonical: 'chorizo',           label: 'Chorizo',               category: 'pork' },
  { canonical: 'chou_fleur',        label: 'Chou-fleur',            category: null },
  { canonical: 'ciboulette',        label: 'Ciboulette',            category: null },
  { canonical: 'citron',            label: 'Citron',                category: null },
  { canonical: 'citron_vert',       label: 'Citron vert',           category: null },
  { canonical: 'concombre',         label: 'Concombre',             category: null },
  { canonical: 'coriandre',         label: 'Coriandre',             category: null },
  { canonical: 'courgette',         label: 'Courgette',             category: null },
  { canonical: 'creme_fraiche',     label: 'Crème fraîche',         category: null },
  { canonical: 'crevettes',         label: 'Crevettes',             category: 'seafood' },
  { canonical: 'dinde',             label: 'Dinde',                 category: 'poultry' },
  { canonical: 'echalote',          label: 'Échalote',              category: null },
  { canonical: 'endive',            label: 'Endive',                category: null },
  { canonical: 'epinard',           label: 'Épinards',              category: null },
  { canonical: 'feta',              label: 'Feta',                  category: 'dairy_protein' },
  { canonical: 'feve',              label: 'Fève',                  category: null },
  { canonical: 'gambas',            label: 'Gambas',                category: 'seafood' },
  { canonical: 'gingembre',         label: 'Gingembre',             category: null },
  { canonical: 'gnocchi',           label: 'Gnocchis',              category: null },
  { canonical: 'gruyere',           label: 'Gruyère',               category: 'dairy_protein' },
  { canonical: 'halloumi',          label: 'Halloumi',              category: 'dairy_protein' },
  { canonical: 'haricot_blanc',     label: 'Haricot blanc',         category: null },
  { canonical: 'haricot_vert',      label: 'Haricots verts',        category: null },
  { canonical: 'jambon',            label: 'Jambon',                category: 'pork' },
  { canonical: 'lait',              label: 'Lait',                  category: null },
  { canonical: 'lait_coco',         label: 'Lait de coco',          category: null },
  { canonical: 'lardons',           label: 'Lardons',               category: 'pork' },
  { canonical: 'lentille',          label: 'Lentilles',             category: null },
  { canonical: 'lentille_corail',   label: 'Lentilles corail',      category: null },
  { canonical: 'lieu_noir',         label: 'Lieu noir',             category: 'fish' },
  { canonical: 'mangue',            label: 'Mangue',                category: null },
  { canonical: 'maquereau',         label: 'Maquereau',             category: 'fish' },
  { canonical: 'moules',            label: 'Moules',                category: 'seafood' },
  { canonical: 'mozzarella',        label: 'Mozzarella',            category: 'dairy_protein' },
  { canonical: 'oeuf',              label: 'Œuf',                   category: 'egg' },
  { canonical: 'oignon',            label: 'Oignon',                category: null },
  { canonical: 'pain',              label: 'Pain',                  category: null },
  { canonical: 'parmesan',          label: 'Parmesan',              category: 'dairy_protein' },
  { canonical: 'patate_douce',      label: 'Patate douce',          category: null },
  { canonical: 'pate_longue',       label: 'Pâtes',                 category: null },
  { canonical: 'persil',            label: 'Persil',                category: null },
  { canonical: 'petit_pois',        label: 'Petits pois',           category: null },
  { canonical: 'poireau',           label: 'Poireau',               category: null },
  { canonical: 'pois_chiche',       label: 'Pois chiches',          category: null },
  { canonical: 'poivron',           label: 'Poivron',               category: null },
  { canonical: 'pomme_de_terre',    label: 'Pomme de terre',        category: null },
  { canonical: 'porc',              label: 'Porc',                  category: 'pork' },
  { canonical: 'potimarron',        label: 'Potimarron',            category: null },
  { canonical: 'poulet',            label: 'Poulet',                category: 'poultry' },
  { canonical: 'quinoa',            label: 'Quinoa',                category: null },
  { canonical: 'ricotta',           label: 'Ricotta',               category: 'dairy_protein' },
  { canonical: 'riz',               label: 'Riz',                   category: null },
  { canonical: 'rouget',            label: 'Rouget',                category: 'fish' },
  { canonical: 'saumon',            label: 'Saumon',                category: 'fish' },
  { canonical: 'thon_boite',        label: 'Thon en boîte',         category: 'fish' },
  { canonical: 'thon_rouge',        label: 'Thon rouge',            category: 'fish' },
  { canonical: 'tofu',              label: 'Tofu',                  category: 'vegetal_protein' },
  { canonical: 'tomate_fraiche',    label: 'Tomates',               category: null },
  { canonical: 'veau',              label: 'Veau',                  category: 'red_meat' },
  { canonical: 'yaourt_grec',       label: 'Yaourt grec',           category: 'dairy_protein' },
];

// ─── Synonymes → canonical_name ───────────────────────────────────────────────
const SYNONYMES: Record<string, string[]> = {
  patate:       ['pomme_de_terre', 'patate_douce'],
  pomme:        ['pomme_de_terre'],
  poulet:       ['poulet'],
  poisson:      ['cabillaud', 'lieu_noir', 'maquereau', 'rouget', 'saumon', 'thon_boite', 'thon_rouge'],
  fruits_mer:   ['crevettes', 'gambas', 'moules'],
  crustace:     ['crevettes', 'gambas'],
  fromage:      ['burrata', 'cheddar', 'chevre', 'feta', 'gruyere', 'halloumi', 'mozzarella', 'parmesan', 'ricotta'],
  laitage:      ['beurre', 'creme_fraiche', 'lait', 'yaourt_grec'],
  viande:       ['agneau', 'boeuf', 'canard', 'chorizo', 'dinde', 'jambon', 'lardons', 'porc', 'poulet', 'veau'],
  gluten:       ['pain', 'pate_longue', 'gnocchi'],
  legumineuse:  ['haricot_blanc', 'lentille', 'lentille_corail', 'pois_chiche'],
  champig:      ['champignon'],
  champ:        ['champignon'],
  pate:         ['pate_longue'],
};

// ─── Bonus catégorie ──────────────────────────────────────────────────────────
// Si l'utilisateur exclut un item avec protein_category, on propose d'exclure toute la famille
const CATEGORY_LABELS: Record<string, string> = {
  fish:           'tous les poissons',
  seafood:        'tous les fruits de mer',
  pork:           'tout le porc',
  poultry:        'toute la volaille',
  red_meat:       'toute la viande rouge',
  dairy_protein:  'tous les produits laitiers',
};

// ─── Populaires (exclusions les plus fréquentes par ordre) ────────────────────
const POPULAIRES: string[] = [
  'lait', 'champignon', 'porc', 'crevettes', 'oeuf', 'chevre',
];

// ─── Fuzzy matching ───────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // supprimer accents
    .replace(/[^a-z0-9 ]/g, '');
}

/** Distance de Levenshtein simplifiée */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

/** Score de pertinence 0–100 (plus haut = meilleur match) */
function scoreMatch(query: string, aliment: Aliment): number {
  const q = normalize(query);
  const label = normalize(aliment.label);
  const canonical = normalize(aliment.canonical.replace(/_/g, ' '));

  // Correspondance exacte
  if (label === q || canonical === q) return 100;

  // Début de label
  if (label.startsWith(q)) return 90 - label.indexOf(q);

  // Début de mot dans le label
  const words = label.split(' ');
  for (const word of words) {
    if (word.startsWith(q)) return 80;
  }

  // Contient la query
  if (label.includes(q)) return 60;
  if (canonical.includes(q)) return 55;

  // Fuzzy : distance acceptable si query >= 3 chars
  if (q.length >= 3) {
    const dist = levenshtein(q, label.slice(0, q.length + 2));
    if (dist <= 2) return 40 - dist * 10;
    // Fuzzy sur chaque mot
    for (const word of words) {
      const d = levenshtein(q, word.slice(0, q.length + 1));
      if (d <= 2) return 35 - d * 10;
    }
  }

  return 0;
}

/** Cherche dans les synonymes et retourne les canonicals correspondants */
function matchSynonymes(query: string): string[] {
  const q = normalize(query);
  const result: string[] = [];
  for (const [syn, canonicals] of Object.entries(SYNONYMES)) {
    if (normalize(syn).startsWith(q) || q.startsWith(normalize(syn))) {
      result.push(...canonicals);
    }
  }
  return result;
}

function search(query: string, excluded: string[]): Aliment[] {
  if (!query.trim()) return [];

  const q = query.trim();
  const synMatches = matchSynonymes(q);

  const scored = ALIMENTS
    .filter(a => !excluded.includes(a.canonical))
    .map(a => {
      let score = scoreMatch(q, a);
      // Bonus si l'aliment fait partie des synonymes trouvés
      if (synMatches.includes(a.canonical)) score = Math.max(score, 70);
      return { aliment: a, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(x => x.aliment);

  return scored;
}

// ─── Types publics ────────────────────────────────────────────────────────────

export type AlimentSearchProps = {
  excluded: string[];          // canonicals déjà exclus
  onAdd: (canonical: string) => void;
  onRemove: (canonical: string) => void;
  onExcludeCategory?: (category: string, label: string) => void;
};

// ─── Composant tag exclu ──────────────────────────────────────────────────────

function ExclusionTag({
  canonical,
  onRemove,
}: {
  canonical: string;
  onRemove: () => void;
}) {
  const aliment = ALIMENTS.find(a => a.canonical === canonical);
  const label   = aliment?.label ?? canonical;

  return (
    <Pressable style={styles.tag} onPress={onRemove}>
      <Text style={styles.tagLabel}>{label}</Text>
      <Text style={styles.tagClose}>×</Text>
    </Pressable>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AlimentSearch({
  excluded,
  onAdd,
  onRemove,
  onExcludeCategory,
}: AlimentSearchProps) {
  const [query, setQuery]   = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Suggestions selon l'état du champ
  const suggestions: Aliment[] = query.trim()
    ? search(query, excluded)
    : POPULAIRES
        .filter(c => !excluded.includes(c))
        .map(c => ALIMENTS.find(a => a.canonical === c)!)
        .filter(Boolean);

  // Bonus catégorie : dernier aliment ajouté
  const lastExcluded = excluded.length > 0 ? excluded[excluded.length - 1] : null;
  const lastAliment  = lastExcluded ? ALIMENTS.find(a => a.canonical === lastExcluded) : null;
  const categoryBonus = lastAliment?.category && CATEGORY_LABELS[lastAliment.category]
    ? { category: lastAliment.category, label: CATEGORY_LABELS[lastAliment.category] }
    : null;

  const handleSelect = useCallback((aliment: Aliment) => {
    if (!excluded.includes(aliment.canonical)) {
      onAdd(aliment.canonical);
    }
    setQuery('');
  }, [excluded, onAdd]);

  const showDropdown = focused && suggestions.length > 0;

  return (
    <View style={styles.root}>

      {/* Tags des exclusions */}
      {excluded.length > 0 && (
        <View style={styles.tags}>
          {excluded.map(c => (
            <ExclusionTag key={c} canonical={c} onRemove={() => onRemove(c)} />
          ))}
        </View>
      )}

      {/* Champ de saisie */}
      <View style={styles.inputWrap}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder={excluded.length === 0 ? 'Champignons, poisson, lactose…' : 'Ajouter un aliment…'}
          placeholderTextColor={Ink.faint}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="done"
        />
      </View>

      {/* Dropdown suggestions */}
      {showDropdown && (
        <View style={styles.dropdown}>
          {!query.trim() && (
            <Text style={styles.dropdownLabel}>Exclusions fréquentes</Text>
          )}
          <ScrollView
            keyboardShouldPersistTaps="always"
            scrollEnabled={suggestions.length > 5}
            style={{ maxHeight: 240 }}
          >
            {suggestions.map(a => (
              <Pressable
                key={a.canonical}
                style={({ pressed }) => [
                  styles.suggestion,
                  pressed && styles.suggestionPressed,
                ]}
                onPress={() => handleSelect(a)}
              >
                <Text style={styles.suggestionText}>{a.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Bonus catégorie */}
      {categoryBonus && onExcludeCategory && (
        <Pressable
          style={styles.bonus}
          onPress={() => onExcludeCategory(categoryBonus.category, categoryBonus.label)}
        >
          <Text style={styles.bonusText}>
            Voulez-vous exclure {categoryBonus.label} ?
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    gap: Space.s2,
  },

  // Tags
  tags: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           Space.s2,
  },
  tag: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             Space.s1,
    backgroundColor: Honey.tint,
    borderWidth:     1,
    borderColor:     Honey.default,
    borderRadius:    Radius.full ?? 999,
    paddingHorizontal: Space.s3,
    paddingVertical:   6,
  },
  tagLabel: {
    fontSize:   FontSize.sm,
    color:      Ink.default,
    fontWeight: '500',
  },
  tagClose: {
    fontSize:  FontSize.body,
    color:     Ink.muted,
    lineHeight: FontSize.body * 1.2,
    marginLeft: 2,
  },

  // Input
  inputWrap: {
    backgroundColor: Cream.paper,
    borderWidth:     1,
    borderColor:     Line.default,
    borderRadius:    Radius.lg ?? 12,
    paddingHorizontal: Space.s4,
  },
  input: {
    height:   48,
    fontSize: FontSize.body,
    color:    Ink.default,
  },

  // Dropdown
  dropdown: {
    backgroundColor: Cream.paper,
    borderWidth:     1,
    borderColor:     Line.default,
    borderRadius:    Radius.lg ?? 12,
    overflow:        'hidden',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.06,
    shadowRadius:    8,
    elevation:       4,
  },
  dropdownLabel: {
    fontSize:      FontSize.eyebrow ?? 11,
    color:         Ink.faint,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: Space.s4,
    paddingVertical:   Space.s2,
    borderBottomWidth: 1,
    borderBottomColor: Line.default,
  },
  suggestion: {
    paddingHorizontal: Space.s4,
    paddingVertical:   Space.s4,
    borderBottomWidth: 1,
    borderBottomColor: Line.default,
  },
  suggestionPressed: {
    backgroundColor: Cream.deep,
  },
  suggestionText: {
    fontSize:   FontSize.body,
    color:      Ink.default,
  },

  // Bonus catégorie
  bonus: {
    backgroundColor: Cream.deep,
    borderWidth:     1,
    borderColor:     Line.strong ?? Line.default,
    borderRadius:    Radius.lg ?? 12,
    paddingHorizontal: Space.s4,
    paddingVertical:   Space.s3,
  },
  bonusText: {
    fontSize:  FontSize.sm,
    color:     Ink.muted,
    fontStyle: 'italic',
  },
});
