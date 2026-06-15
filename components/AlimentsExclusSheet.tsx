/**
 * ZESTUP — AlimentsExclusSheet
 *
 * Bottom sheet pour gérer les aliments exclus.
 * Gère correctement le clavier iOS via KeyboardAvoidingView.
 */

import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  Cream,
  FontSize,
  Ink,
  Line,
  Radius,
  Space,
} from '../constants/theme';
import AlimentSearch from './AlimentSearch';

type Props = {
  visible: boolean;
  onClose: () => void;
  excluded: string[];
  onAdd: (canonical: string) => void;
  onRemove: (canonical: string) => void;
};

export default function AlimentsExclusSheet({
  visible,
  onClose,
  excluded,
  onAdd,
  onRemove,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* KeyboardAvoidingView DOIT envelopper tout le contenu du Modal */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Overlay sombre : ferme le sheet au tap */}
        <Pressable style={styles.overlay} onPress={onClose} />

        {/* Le sheet lui-même */}
        <View style={styles.sheet}>
          {/* Poignée */}
          <View style={styles.handle} />

          {/* Titre */}
          <Text style={styles.title}>Aliments exclus</Text>

          {/* Corps scrollable */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            {excluded.length === 0 && (
              <Text style={styles.empty}>Aucun aliment exclu</Text>
            )}

            <AlimentSearch
              excluded={excluded}
              onAdd={(canonical) => {
                onAdd(canonical);
              }}
              onRemove={onRemove}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  sheet: {
    backgroundColor:  Cream.default,
    borderTopLeftRadius:  Radius.xl ?? 20,
    borderTopRightRadius: Radius.xl ?? 20,
    paddingBottom: Space.s8 ?? 32,
    // Hauteur max : 70 % de l'écran
    maxHeight: '70%',
  },
  handle: {
    width:           40,
    height:          4,
    borderRadius:    2,
    backgroundColor: Line.default,
    alignSelf:       'center',
    marginTop:       Space.s3,
    marginBottom:    Space.s2,
  },
  title: {
    fontFamily:    'InstrumentSerif_400Regular_Italic',
    fontSize:      FontSize.h3 ?? 24,
    color:         Ink.default,
    paddingHorizontal: Space.s5,
    paddingVertical:   Space.s3,
  },
  body: {
    paddingHorizontal: Space.s5,
    paddingBottom:     Space.s5,
    gap:               Space.s3,
  },
  empty: {
    fontSize: FontSize.body,
    color:    Ink.faint,
    marginBottom: Space.s2,
  },
});
