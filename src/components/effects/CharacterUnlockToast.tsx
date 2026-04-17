import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeOut, SlideInRight } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRosterStore } from '../../stores/rosterStore';
import { getCharacter } from '../../data/characterRoster';
import { AnimatedCharacter } from '../ui/AnimatedCharacter';
import { CharacterSnapshot } from '../3d/CharacterSnapshot';
import { getRosterCustomization } from '../../data/npcCustomizations';
import { useCharacterStore } from '../../stores/characterStore';
import { FEATURES } from '../../config/features';
import { playSound } from '../../services/audio';
import { haptics } from '../../services/haptics';
import { fonts, weight } from '../../theme/typography';

/**
 * Global character-unlock toast.
 *
 * Mounted once at the App root. Subscribes to `pendingUnlocks` on the roster
 * store, pops one off at a time, and shows a slide-in card with the new
 * character's preview. Auto-dismisses after a few seconds (or on tap).
 *
 * Triggered indirectly: completeLevel() → unlockForCareerLevel() pushes the
 * id into pendingUnlocks. This component does the rest — no caller wiring.
 */
/** 3D snapshot for the unlock preview — uses cached PNG like RosterScreen. */
function UnlockPreview3D({ characterId }: { characterId: string }) {
  const playerCust = useCharacterStore((s) => s.customization);
  const custom = getRosterCustomization(characterId);
  return (
    <CharacterSnapshot
      width={64}
      height={64}
      customization={custom ?? playerCust}
    />
  );
}

export function CharacterUnlockToast() {
  const pendingUnlocks = useRosterStore((s) => s.pendingUnlocks);
  const consumePendingUnlock = useRosterStore((s) => s.consumePendingUnlock);

  const [activeId, setActiveId] = useState<string | null>(null);

  // Pop the next id off the queue when nothing is showing.
  useEffect(() => {
    if (activeId) return;
    if (pendingUnlocks.length === 0) return;
    const next = consumePendingUnlock();
    if (next) {
      setActiveId(next);
      playSound('achievement');
      haptics.achievement();
    }
  }, [pendingUnlocks, activeId, consumePendingUnlock]);

  // Auto-dismiss
  useEffect(() => {
    if (!activeId) return;
    const timer = setTimeout(() => setActiveId(null), 4500);
    return () => clearTimeout(timer);
  }, [activeId]);

  if (!activeId) return null;

  const character = getCharacter(activeId);
  if (!character) {
    // Stale id — skip and let the next iteration pick up the rest.
    setTimeout(() => setActiveId(null), 0);
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View entering={SlideInRight.springify()} exiting={FadeOut}>
        <Pressable
          onPress={() => setActiveId(null)}
          accessibilityRole="button"
          accessibilityLabel={`New character unlocked: ${character.name}, ${character.title}`}
          accessibilityHint="Tap to dismiss"
        >
          <LinearGradient
            colors={['rgba(155,89,182,0.95)', 'rgba(74,28,109,0.95)']}
            style={styles.toast}
          >
            <View style={styles.previewWrap}>
              {FEATURES.character3D
                ? <UnlockPreview3D characterId={character.id} />
                : <AnimatedCharacter characterId={character.id} size={64} />}
            </View>
            <View style={styles.textCol}>
              <Text style={styles.eyebrow}>NEW CHARACTER UNLOCKED</Text>
              <Text style={styles.name}>{character.name}</Text>
              <Text style={styles.title}>{character.title}</Text>
            </View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 80,
    right: 0,
    left: 0,
    alignItems: 'flex-end',
    zIndex: 350,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#9b59b6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
    maxWidth: 320,
  },
  previewWrap: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.25)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flexShrink: 1,
  },
  eyebrow: {
    fontFamily: fonts.body,
    fontSize: 9,
    fontWeight: weight.black,
    color: '#ffd1ff',
    letterSpacing: 1.2,
  },
  name: {
    fontFamily: fonts.heading,
    fontSize: 17,
    fontWeight: weight.black,
    color: '#ffffff',
    marginTop: 2,
  },
  title: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
  },
});
