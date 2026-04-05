import React from 'react';
import { View, Text, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

interface LoadingOverlayProps {
  /** Whether the overlay is visible */
  visible: boolean;
  /** Message to display below the spinner */
  message?: string;
  /** If provided, shows a cancel button that calls this callback */
  onCancel?: () => void;
  /** Label for the cancel button (default: "Cancel") */
  cancelLabel?: string;
}

export function LoadingOverlay({
  visible,
  message = 'Loading...',
  onCancel,
  cancelLabel = 'Cancel',
}: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={styles.backdrop}
    >
      <View style={styles.card}>
        <ActivityIndicator size="large" color={colors.orange} />
        <Text style={styles.message}>{message}</Text>
        {onCancel && (
          <Pressable onPress={onCancel} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
    minWidth: 200,
  },
  message: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 16,
    color: '#ffffff',
    marginTop: 16,
    textAlign: 'center',
  },
  cancelBtn: {
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
