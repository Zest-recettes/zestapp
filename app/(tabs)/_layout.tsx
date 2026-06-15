/**
 * ZESTUP — Navigation principale
 * 4 onglets : Repas / Courses / Favoris / Mon compte
 *
 * Design :
 * - Fond crème #F4EFE6, hairline top #E4DBCB
 * - Accent bordeaux #6B1F2A pour l'onglet actif
 * - Label actif en serif italique
 * - Aucun emoji, aucune couleur verte ou bleue
 */

import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Bordeaux, Cream, Ink, Line } from '@/constants/theme';

type TabIconProps = {
  focused: boolean;
  symbolName: string;
  label: string;
};

function TabIcon({ focused, symbolName, label }: TabIconProps) {
  return (
    <View style={styles.iconWrap}>
      {focused && <View style={styles.activeDot} />}
      <IconSymbol
        size={22}
        name={symbolName as any}
        color={focused ? Bordeaux.default : Ink.faint}
      />
      <Text
        style={[
          styles.tabLabel,
          focused ? styles.tabLabelActive : styles.tabLabelInactive,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown:            false,
        tabBarShowLabel:        false,
        tabBarStyle:            styles.tabBar,
        tabBarActiveTintColor:  Bordeaux.default,
        tabBarInactiveTintColor: Ink.faint,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Repas',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} symbolName="fork.knife" label="Repas" />
          ),
        }}
      />
      <Tabs.Screen
        name="courses"
        options={{
          title: 'Courses',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} symbolName="cart" label="Courses" />
          ),
        }}
      />
      <Tabs.Screen
        name="recettes"
        options={{
          title: 'Favoris',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} symbolName="heart" label="Favoris" />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Mon compte',
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} symbolName="person.circle" label="Mon compte" />
          ),
        }}
      />
    </Tabs>
  );
}

const TAB_HEIGHT = Platform.OS === 'ios' ? 88 : 70;

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Cream.default,
    borderTopColor:  Line.default,
    borderTopWidth:  1,
    height:          TAB_HEIGHT,
    paddingBottom:   Platform.OS === 'ios' ? 24 : 8,
    paddingTop:      8,
    shadowColor:     '#1F1B17',
    shadowOffset:    { width: 0, height: -4 },
    shadowOpacity:   0.05,
    shadowRadius:    10,
    elevation:       4,
  },
  iconWrap: {
    alignItems:     'center',
    justifyContent: 'center',
    gap:            3,
    paddingTop:     2,
  },
  activeDot: {
    position:        'absolute',
    top:             -6,
    width:           4,
    height:          4,
    borderRadius:    2,
    backgroundColor: Bordeaux.default,
  },
  tabLabel: {
    fontSize:   10,
    lineHeight: 13,
  },
  tabLabelActive: {
    fontFamily: 'Georgia',   // → InstrumentSerif_400Regular_Italic quand installé
    fontStyle:  'italic',
    color:      Bordeaux.default,
  },
  tabLabelInactive: {
    color: Ink.faint,
  },
});
