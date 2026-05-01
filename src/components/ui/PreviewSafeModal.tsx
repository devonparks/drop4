import React from 'react';
import { Modal, View, Platform, StyleSheet, ModalProps } from 'react-native';

/**
 * PreviewSafeModal — drop-in Modal replacement that respects PhoneFrame.
 *
 * The problem: react-native-web's `Modal` portals its content to
 * `document.body`, which escapes the 390x844 `PhoneFrame` we use to
 * simulate a phone in dev. The result on the web preview is that
 * popups (DailyRewardPopup, OutfitPreviewModal, AnimationPicker, etc.)
 * render full-screen at the browser viewport instead of inside the
 * fake phone, breaking the mobile-feel preview Devon uses to test.
 *
 * The fix: on `Platform.OS === 'web'`, render an inline absolute-fill
 * overlay instead of mounting `Modal`. That keeps the popup inside the
 * PhoneFrame's `screen` container (which is `flex: 1` + relative). On
 * native we still hand off to `Modal` so we keep the real-modal
 * behaviors (hardware back button on Android, proper status-bar
 * handling on iOS, navigation-stack semantics).
 *
 * Match Modal's API surface where it matters:
 *   - `visible` / `onRequestClose` (back-button / Esc)
 *   - `transparent` (web: always transparent; native: passed through)
 *   - `animationType` (passed to Modal on native, ignored on web —
 *     callers usually wrap children in a Reanimated `entering`)
 */
export interface PreviewSafeModalProps extends Pick<ModalProps,
  'visible' | 'onRequestClose' | 'transparent' | 'animationType' | 'children'
> {}

export function PreviewSafeModal({
  visible,
  onRequestClose,
  transparent,
  animationType,
  children,
}: PreviewSafeModalProps) {
  if (Platform.OS === 'web') {
    if (!visible) return null;
    // Web preview: render an inline overlay anchored to the closest
    // position:relative ancestor. PhoneFrame.screen is now relative
    // (added in this commit) so the modal stays inside the simulated
    // phone instead of escaping to a stale React Navigation screen
    // ancestor. zIndex 1000 keeps us above HomeScreen popups but under
    // any future app-level toast stack (which uses zIndex >1000).
    return (
      <View style={styles.webOverlay} pointerEvents="box-none">
        {children}
      </View>
    );
  }
  return (
    <Modal
      visible={visible}
      onRequestClose={onRequestClose}
      transparent={transparent}
      animationType={animationType}
    >
      {children}
    </Modal>
  );
}

const styles = StyleSheet.create({
  webOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
});
