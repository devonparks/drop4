// ═══════════════════════════════════════════════════════════════════════
// ConfirmDialog — styled in-app confirm modal
//
// Replaces blocking native dialogs (window.confirm on web,
// Alert.alert with multi-button on RN-Web which silently no-ops).
// Both:
//   - froze the web preview (Claude headless can't dismiss)
//   - looked off-brand (raw browser chrome, no Drop4 visuals)
//
// Use:
//   <ConfirmDialog
//     visible={...}
//     title="Buy this pet?"
//     message="Buddy costs 500 coins. You have 1,200."
//     cancelLabel="Cancel"
//     confirmLabel="Buy 500"
//     onCancel={...}
//     onConfirm={...}
//   />
// ═══════════════════════════════════════════════════════════════════════

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PreviewSafeModal } from './PreviewSafeModal';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  cancelLabel?: string;
  confirmLabel: string;
  /** Called when the user taps the confirm button. */
  onConfirm: () => void;
  /** Called when the user taps cancel OR the backdrop. */
  onCancel: () => void;
  /** Use the brand orange CTA fill on the confirm button. Default true.
   *  Set false for destructive actions (e.g. unequip / delete) — those
   *  use a softer red border instead of an attention-grabbing fill. */
  primary?: boolean;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  cancelLabel = 'Cancel',
  confirmLabel,
  onConfirm,
  onCancel,
  primary = true,
}: ConfirmDialogProps) {
  return (
    <PreviewSafeModal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <LinearGradient
            colors={['rgba(15,20,40,0.98)', 'rgba(8,10,24,0.98)']}
            style={styles.cardInner}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          >
            <Text style={styles.title} accessibilityRole="header">{title}</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}

            <View style={styles.btnRow}>
              <Pressable
                onPress={() => { haptics.tap(); playSound('click'); onCancel(); }}
                style={styles.btnCancel}
                accessibilityRole="button"
                accessibilityLabel={cancelLabel}
              >
                <Text style={styles.btnCancelText}>{cancelLabel}</Text>
              </Pressable>
              <Pressable
                onPress={() => { haptics.win(); playSound('coin'); onConfirm(); }}
                style={[
                  styles.btnConfirm,
                  primary && { backgroundColor: colors.coinGold },
                ]}
                accessibilityRole="button"
                accessibilityLabel={confirmLabel}
              >
                <Text style={[
                  styles.btnConfirmText,
                  { color: primary ? '#0a0e27' : colors.coinGold },
                ]}>
                  {confirmLabel}
                </Text>
              </Pressable>
            </View>
          </LinearGradient>
        </Pressable>
      </Pressable>
    </PreviewSafeModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,180,90,0.45)',
  },
  cardInner: {
    padding: 22,
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 18,
    color: '#ffffff',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 18,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  btnCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  btnCancelText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
    letterSpacing: 1,
  },
  btnConfirm: {
    flex: 1.4,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,180,90,0.85)',
    alignItems: 'center',
  },
  btnConfirmText: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 13,
    letterSpacing: 1,
  },
});
