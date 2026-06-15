/**
 * ZESTUP — Écran Mon compte
 *
 * Sections :
 * 1. Comment vous mangez (Régime / Aliments à éviter / Nombre de personnes)
 * 2. Préférences (Notifications / Aide / Se déconnecter)
 *
 * Règles design ZESTUP :
 * - Fond crème, lignes avec hairline #E4DBCB
 * - Avatar circulaire avec initiale serif italique sur fond sable
 * - Se déconnecter en bordeaux (dangereux / déstructif)
 * - Aucun emoji, sentence case
 */

import React, { useEffect, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { trackEvent } from '../../lib/analytics';
import AlimentsExclusSheet from '../../components/AlimentsExclusSheet';
import {
  Bordeaux,
  Brun,
  Cream,
  FontSize,
  Ink,
  Line,
  Radius,
  Sable,
  Space,
} from '../../constants/theme';

// ─── Composants locaux ────────────────────────────────────────────────────────

function SettingsRow({
  label,
  value,
  destructive = false,
  onPress,
}: {
  label: string;
  value?: string;
  destructive?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
    >
      <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>
        {label}
      </Text>
      {value ? (
        <Text style={styles.rowValue}>{value}</Text>
      ) : (
        <View style={styles.chevron} />
      )}
    </Pressable>
  );
}

function SectionBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
      <View style={styles.blockContent}>{children}</View>
    </View>
  );
}

// ─── Écran principal ─────────────────────────────────────────────────────────

export default function MonCompteScreen() {
  // TODO : brancher sur Supabase auth + profil utilisateur
  const initiale = 'M';
  const prenom   = 'Mélanie';

  const [sheetVisible, setSheetVisible] = useState(false);
  const [alimentsExclus, setAlimentsExclus] = useState<string[]>([]);

  const alimentsLabel = alimentsExclus.length === 0
    ? 'Aucun'
    : alimentsExclus.slice(0, 2).join(', ') + (alimentsExclus.length > 2 ? '…' : '');

  useEffect(() => {
    trackEvent('open_profile', 'navigation')
  }, []);

  return (
    <View style={styles.root}>
      <AlimentsExclusSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        excluded={alimentsExclus}
        onAdd={(c) => setAlimentsExclus(prev => [...prev, c])}
        onRemove={(c) => setAlimentsExclus(prev => prev.filter(x => x !== c))}
      />
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mon compte.</Text>
      </View>

      <View style={styles.scroll}>
        {/* Avatar + nom */}
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitiale}>{initiale}</Text>
          </View>
          <View>
            <Text style={styles.profileName}>{prenom}</Text>
            <Text style={styles.profileHint}>Votre espace.</Text>
          </View>
        </View>

        {/* Section : Comment vous mangez */}
        <SectionBlock title="Comment vous mangez">
          <SettingsRow label="Régime"              value="Classique" />
          <SettingsRow label="Aliments à éviter" value={alimentsLabel} onPress={() => setSheetVisible(true)} />
          <SettingsRow label="Nombre de personnes" value="2" />
        </SectionBlock>

        {/* Section : Préférences */}
        <SectionBlock title="Préférences">
          <SettingsRow label="Notifications" value="Activées" />
          <SettingsRow label="Aide"          />
        </SectionBlock>

        {/* Déconnexion — bordeaux, séparé */}
        <View style={styles.block}>
          <View style={styles.blockContent}>
            <SettingsRow label="Se déconnecter" destructive />
          </View>
        </View>
      </View>
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
  },
  headerTitle: {
    fontFamily:    'InstrumentSerif_400Regular_Italic',
    fontSize:      FontSize.h2,
    color:         Ink.default,
    letterSpacing: -0.4,
    lineHeight:    FontSize.h2 * 1.15,
  },

  scroll: {
    flex:    1,
    padding: Space.s5,
    gap:     Space.s5,
  },

  // Avatar
  profile: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Space.s4,
    marginBottom:  Space.s3,
  },
  avatar: {
    width:           60,
    height:          60,
    borderRadius:    30,
    backgroundColor: Sable.tint,
    borderWidth:     1,
    borderColor:     Sable.default,
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarInitiale: {
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    fontSize:   28,
    color:      Brun.default,
    lineHeight: 34,
    marginTop:  2,
  },
  profileName: {
    fontSize:   FontSize.h4,
    fontWeight: '500',
    color:      Ink.default,
  },
  profileHint: {
    fontSize:   FontSize.sm,
    color:      Ink.faint,
    fontFamily: 'InstrumentSerif_400Regular_Italic',
    marginTop:  2,
  },

  // Bloc de section
  block: { gap: Space.s2 },
  blockTitle: {
    fontSize:      FontSize.eyebrow,
    color:         Ink.muted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight:    '500',
    marginBottom:  Space.s1,
  },
  blockContent: {
    backgroundColor: Cream.paper,
    borderRadius:    Radius.lg,
    borderWidth:     1,
    borderColor:     Line.default,
    overflow:        'hidden',
  },

  // Ligne
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: Space.s4,
    paddingVertical:   Space.s4,
    borderBottomWidth: 1,
    borderBottomColor: Line.default,
  },
  rowPressed: { backgroundColor: Cream.deep },
  rowLabel: {
    fontSize:   FontSize.body,
    color:      Ink.default,
    fontWeight: '400',
    flex:       1,
  },
  rowLabelDestructive: {
    color: Bordeaux.default,
  },
  rowValue: {
    fontSize:  FontSize.sm,
    color:     Ink.muted,
    marginLeft: Space.s3,
  },
  chevron: {
    width:        6,
    height:       10,
    borderTopWidth:    1.5,
    borderRightWidth:  1.5,
    borderColor:  Line.strong,
    transform:    [{ rotate: '45deg' }],
  },
});
