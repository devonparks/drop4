import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedCharacter, IdleVariantId, IDLE_VARIANT_IDS } from './AnimatedCharacter';
import { useShopStore } from '../../stores/shopStore';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ── Display info for each idle variant ──
const IDLE_INFO: Record<IdleVariantId, { name: string; icon: string }> = {
  foottap:     { name: 'Foot Tap',     icon: '👟' },
  swingarms:   { name: 'Swing Arms',   icon: '💪' },
  checkwatch:  { name: 'Check Watch',  icon: '⌚' },
  headnod:     { name: 'Head Nod',     icon: '🎵' },
  lookaround:  { name: 'Look Around',  icon: '👀' },
  stretch:     { name: 'Stretch',      icon: '🧘' },
  yawn:        { name: 'Yawn',         icon: '😴' },
  chinscratch: { name: 'Chin Scratch', icon: '🤔' },
  weightshift: { name: 'Weight Shift', icon: '🧍' },
  phonescroll: { name: 'Phone Scroll', icon: '📱' },
};

interface IdlePickerProps {
  visible: boolean;
  onClose: () => void;
  onPreview?: (idleId: IdleVariantId | null) => void;
}

export function IdlePicker({ visible, onClose, onPreview }: IdlePickerProps) {
  const equippedIdle = useShopStore(s => s.equippedIdle);
  const setEquippedIdle = useShopStore(s => s.setEquippedIdle);
  const [previewIdle, setPreviewIdle] = useState<IdleVariantId | null>(null);

  if (!visible) return null;

  const currentDisplay = previewIdle || equippedIdle as IdleVariantId | null;

  const handleTap = (id: IdleVariantId) => {
    haptics.tap();
    playSound('click');
    setPreviewIdle(id);
    onPreview?.(id);
  };

  const handleEquip = () => {
    if (previewIdle) {
      haptics.win();
      setEquippedIdle(previewIdle);
      setPreviewIdle(null);
    }
  };

  const handleClear = () => {
    haptics.tap();
    setEquippedIdle(null);
    setPreviewIdle(null);
    onPreview?.(null);
  };

  const handleClose = () => {
    setPreviewIdle(null);
    onClose();
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.fullOverlay}>
        <LinearGradient
          colors={['#0a0e27', '#111b47', '#0a0e27']}
          style={StyleSheet.absoluteFill}
        />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>IDLE ANIMATIONS</Text>
          <Text style={styles.headerSub}>Choose your lobby vibe</Text>
        </View>

        {/* Character preview */}
        <View style={styles.characterArea}>
          <View style={styles.characterGlow} />
          <AnimatedCharacter
            size={280}
            selectedIdle={currentDisplay}
          />
          <LinearGradient
            colors={['rgba(100,180,255,0.3)', 'rgba(80,140,255,0.12)', 'transparent']}
            style={styles.characterPlatform}
          />
          {currentDisplay && (
            <View style={styles.nowPlayingBadge}>
              <Text style={styles.nowPlayingText}>
                {IDLE_INFO[currentDisplay].icon} {IDLE_INFO[currentDisplay].name}
              </Text>
            </View>
          )}
          {!currentDisplay && (
            <View style={styles.nowPlayingBadge}>
              <Text style={[styles.nowPlayingText, { color: colors.textSecondary }]}>
                Default (Random)
              </Text>
            </View>
          )}
        </View>

        {/* Idle variant grid */}
        <ScrollView
          style={styles.gridScroll}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Reset to default option */}
          <Pressable onPress={handleClear} style={[styles.idleCard, !equippedIdle && !previewIdle && styles.idleCardEquipped]}>
            <LinearGradient
              colors={!equippedIdle && !previewIdle
                ? ['rgba(100,180,255,0.15)', 'rgba(100,180,255,0.06)']
                : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']
              }
              style={styles.idleCardInner}
            >
              <Text style={styles.idleCardIcon}>🔄</Text>
              <View style={styles.idleCardText}>
                <Text style={styles.idleCardName}>Default</Text>
                <Text style={styles.idleCardDesc}>Random variants</Text>
              </View>
              {!equippedIdle && !previewIdle && <Text style={styles.equippedBadge}>ACTIVE</Text>}
            </LinearGradient>
          </Pressable>

          {/* Idle variant cards */}
          {IDLE_VARIANT_IDS.map(id => {
            const info = IDLE_INFO[id];
            const isEquipped = equippedIdle === id && !previewIdle;
            const isPreviewing = previewIdle === id;
            const isActive = isEquipped || isPreviewing;

            return (
              <Pressable
                key={id}
                onPress={() => handleTap(id)}
                style={[styles.idleCard, isActive && styles.idleCardEquipped]}
              >
                <LinearGradient
                  colors={isActive
                    ? ['rgba(255,140,0,0.15)', 'rgba(255,140,0,0.06)']
                    : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']
                  }
                  style={styles.idleCardInner}
                >
                  <Text style={styles.idleCardIcon}>{info.icon}</Text>
                  <View style={styles.idleCardText}>
                    <Text style={[styles.idleCardName, isActive && { color: colors.orange }]}>
                      {info.name}
                    </Text>
                    <Text style={styles.idleCardDesc}>Tap to preview</Text>
                  </View>
                  {isEquipped && <Text style={styles.equippedBadge}>EQUIPPED</Text>}
                  {isPreviewing && (
                    <Pressable onPress={handleEquip} style={styles.equipBtn}>
                      <Text style={styles.equipBtnText}>EQUIP</Text>
                    </Pressable>
                  )}
                </LinearGradient>
              </Pressable>
            );
          })}
          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Close button */}
        <View style={styles.closeArea}>
          <Pressable onPress={handleClose} style={styles.closeBtn}>
            <LinearGradient
              colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.05)']}
              style={styles.closeBtnGradient}
            >
              <Text style={styles.closeBtnText}>CLOSE</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullOverlay: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 4,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 24,
    color: '#ffffff',
    letterSpacing: 3,
  },
  headerSub: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 12,
    color: 'rgba(200,220,255,0.5)',
    letterSpacing: 1,
    marginTop: 2,
  },
  characterArea: {
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  characterGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1,
    borderColor: 'rgba(100,180,255,0.1)',
    backgroundColor: 'rgba(80,140,255,0.03)',
  },
  characterPlatform: {
    width: 160,
    height: 12,
    borderRadius: 80,
    marginTop: -10,
  },
  nowPlayingBadge: {
    position: 'absolute',
    bottom: 4,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,140,0,0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.3)',
  },
  nowPlayingText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: colors.orange,
    letterSpacing: 0.5,
  },
  gridScroll: {
    flex: 1,
  },
  gridContent: {
    paddingHorizontal: 16,
    gap: 6,
  },
  idleCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  idleCardEquipped: {
    borderColor: 'rgba(255,140,0,0.4)',
  },
  idleCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  idleCardIcon: {
    fontSize: 26,
  },
  idleCardText: {
    flex: 1,
  },
  idleCardName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#ffffff',
  },
  idleCardDesc: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  equippedBadge: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: colors.orange,
    letterSpacing: 1,
    backgroundColor: 'rgba(255,140,0,0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  equipBtn: {
    backgroundColor: colors.orange,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  equipBtnText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: '#ffffff',
    letterSpacing: 1,
  },
  closeArea: {
    paddingHorizontal: 40,
    paddingBottom: 36,
    paddingTop: 8,
  },
  closeBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  closeBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  closeBtnText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 16,
    color: '#ffffff',
    letterSpacing: 3,
  },
});
