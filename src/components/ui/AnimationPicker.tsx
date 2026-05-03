// ═══════════════════════════════════════════════════════════════════════
// AnimationPicker — unified Emotes + Idles picker (AMG-native)
//
// Replaces the legacy emoji-based picker. Now keyed off the AMG runtime's
// HUMAN_EMOTES / HUMAN_IDLES so the ids selected here are the SAME ones
// the CompositeCharacter renderer expects — no legacy→AMG translation
// layer, which was the root cause of "I selected dab but it still picks
// a random emote on tap."
//
// Tab 1: EMOTES — Random tile pinned first, then OWNED emotes grouped by
//        category (dance / greet / taunt / general). Bottom CTA jumps
//        to the Shop emote tab to buy more.
// Tab 2: IDLES — Random tile pinned first, then all 7 unique idle poses.
//        Idles are not sold (yet) so all are always available.
//
// Selection persists in useShopStore:
//   • selectedHomeEmote (string | null) + homeEmoteRandomMode (boolean)
//   • equippedIdle (string | null) — null means random
// ═══════════════════════════════════════════════════════════════════════

import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
} from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { PreviewSafeModal } from './PreviewSafeModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Character3DPortrait } from '../3d/Character3DPortrait';
import { useShopStore } from '../../stores/shopStore';
import { HUMAN_EMOTES } from '../../data/animationRegistry';
import { EMOTE_ICON, IDLE_ICON } from '../../data/cosmeticIcons';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

type Tab = 'emotes' | 'idles';

// The 7 unique idle poses we ship icon art for. Femn variants share the
// male's pose icon (and animation rig), so the picker doesn't surface
// them — picking 'idle_base' covers both the base + base_femn animations
// at runtime depending on character gender.
const IDLE_POSES: { id: string; name: string }[] = [
  { id: 'idle_base',             name: 'Base'          },
  { id: 'idle_hands_on_hips',    name: 'Hands on Hips' },
  { id: 'idle_arms_folded',      name: 'Arms Folded'   },
  { id: 'idle_bored_foot_tap',   name: 'Foot Tap'      },
  { id: 'idle_bored_swing_arms', name: 'Swing Arms'    },
  { id: 'idle_bored_slump',      name: 'Slump'         },
  { id: 'idle_check_watch',      name: 'Check Watch'   },
];

const EMOTE_CATEGORY_ORDER: Array<{ key: string; label: string }> = [
  { key: 'dance', label: 'Dance' },
  { key: 'greet', label: 'Greet' },
  { key: 'taunt', label: 'Taunt' },
  { key: 'emote', label: 'Expressive' },
];

interface AnimationPickerProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: Tab;
}

export function AnimationPicker({ visible, onClose, initialTab = 'emotes' }: AnimationPickerProps) {
  const [activeTab, setActiveTab] = React.useState<Tab>(initialTab);
  const navigation = useNavigation<any>();

  // Sync tab when the parent passes a new initialTab (left btn = emotes,
  // right btn = idles). Also play the modal-in sound on first open.
  React.useEffect(() => {
    if (visible) {
      setActiveTab(initialTab);
      playSound('modal_in');
    }
  }, [visible, initialTab]);
  const insets = useSafeAreaInsets();

  // Store state
  const selectedHomeEmote = useShopStore((s) => s.selectedHomeEmote);
  const homeEmoteRandomMode = useShopStore((s) => s.homeEmoteRandomMode);
  const setSelectedHomeEmote = useShopStore((s) => s.setSelectedHomeEmote);
  const setHomeEmoteRandomMode = useShopStore((s) => s.setHomeEmoteRandomMode);
  const equippedIdle = useShopStore((s) => s.equippedIdle);
  const setEquippedIdle = useShopStore((s) => s.setEquippedIdle);
  const ownedEmotes = useShopStore((s) => s.ownedEmotes);

  // Owned-emote filter — used to decide which tiles are tappable
  // ("equip this") vs locked ("🔒 IN BAGS").
  const isOwned = useCallback((id: string, price: number | undefined) => {
    return ownedEmotes.includes(id) || (price ?? 0) === 0;
  }, [ownedEmotes]);

  // 2026-05-03 catalog pivot: AnimationPicker now shows ALL emotes
  // grouped by category (was: only owned). Locked emotes get a
  // padlock badge + tap-routes-to-LootBox so the picker doubles as
  // the catalog view for emotes — matches the new "Customize is the
  // catalog" model.
  const allByCategory = useMemo(() => {
    const map: Record<string, typeof HUMAN_EMOTES> = {};
    for (const e of HUMAN_EMOTES) {
      if (!map[e.category]) map[e.category] = [];
      map[e.category].push(e);
    }
    return map;
  }, []);

  if (!visible) return null;

  const handleSelectEmote = (id: string) => {
    haptics.tap();
    playSound('click');
    setSelectedHomeEmote(id);
    setTimeout(onClose, 80);
  };

  const handleSelectRandomEmote = () => {
    haptics.tap();
    playSound('click');
    setHomeEmoteRandomMode(true);
    // Don't auto-close — player may want to flip back to specific
  };

  const handleSelectIdle = (id: string | null) => {
    haptics.tap();
    playSound('click');
    setEquippedIdle(id);
  };

  const handleBuyMore = () => {
    haptics.tap();
    playSound('click');
    onClose();
    // After 2026-05-03 Shop pivot: route to LootBox screen (the bags
    // acquisition flow). The previous Shop > Emotes tab no longer
    // exists — Customize is the catalog now and bags are the source.
    navigation.dispatch(CommonActions.navigate({ name: 'LootBox' }));
  };

  // Locked-emote tap: route to bags screen so the player can roll for
  // the missing emote. Closes the picker so the player isn't trapped
  // behind two modals.
  const handleLockedTap = () => {
    haptics.tap();
    playSound('click');
    onClose();
    navigation.dispatch(CommonActions.navigate({ name: 'LootBox' }));
  };

  // ── Now-playing label ──
  // If the saved emote/idle id isn't recognized by the AMG runtime
  // (typically a legacy id like 'callme' from before the picker was
  // rewritten), the runtime falls back to random behavior on tap, so
  // the label should reflect that — show "Random" rather than the raw
  // stale id, which would confuse the player.
  const selectedEmoteMeta = selectedHomeEmote ? HUMAN_EMOTES.find((e) => e.id === selectedHomeEmote) : null;
  const selectedIdleMeta = equippedIdle ? IDLE_POSES.find((i) => i.id === equippedIdle) : null;

  const isNowPlayingRandom = activeTab === 'emotes'
    ? (homeEmoteRandomMode || !selectedEmoteMeta)
    : !selectedIdleMeta;

  const nowPlayingLabel = activeTab === 'emotes'
    ? (homeEmoteRandomMode || !selectedEmoteMeta
        ? 'Random Emote'
        : selectedEmoteMeta.name)
    : (selectedIdleMeta
        ? selectedIdleMeta.name
        : 'Random Idle');

  return (
    <PreviewSafeModal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <LinearGradient
          colors={['#0a0e27', '#111b47', '#0a0e27']}
          style={StyleSheet.absoluteFill}
        />

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.headerTitle}>ANIMATIONS</Text>
        </View>

        {/* Tab bar */}
        <View style={styles.tabRow}>
          <Pressable
            onPress={() => { haptics.tap(); playSound('click'); setActiveTab('emotes'); }}
            style={[styles.tab, activeTab === 'emotes' && styles.tabActive]}
            accessibilityRole="tab"
            accessibilityLabel="Emotes tab"
            accessibilityState={{ selected: activeTab === 'emotes' }}
          >
            <Text style={[styles.tabText, activeTab === 'emotes' && styles.tabTextActive]}>EMOTES</Text>
          </Pressable>
          <Pressable
            onPress={() => { haptics.tap(); playSound('click'); setActiveTab('idles'); }}
            style={[styles.tab, activeTab === 'idles' && styles.tabActive]}
            accessibilityRole="tab"
            accessibilityLabel="Idles tab"
            accessibilityState={{ selected: activeTab === 'idles' }}
          >
            <Text style={[styles.tabText, activeTab === 'idles' && styles.tabTextActive]}>IDLES</Text>
          </Pressable>
        </View>

        {/* Character preview — confirms what your selection looks like
            without leaving the modal. */}
        <View style={styles.previewArea}>
          <Character3DPortrait
            width={140}
            height={170}
            showFloor={false}
            autoRotate={false}
          />
          <View style={styles.nowPlaying}>
            {isNowPlayingRandom && (
              <Image
                source={require('../../assets/images/ui/creator-dice.png')}
                style={styles.nowPlayingDie}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            )}
            <Text style={styles.nowPlayingText}>{nowPlayingLabel}</Text>
          </View>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'emotes' ? (
            <>
              {/* Pinned RANDOM tile — always first. Picking it sets random
                  mode on; the runtime then picks from owned emotes per tap. */}
              <View style={styles.catSection}>
                <View style={styles.catGrid}>
                  <Pressable
                    onPress={handleSelectRandomEmote}
                    style={[styles.gridCard, styles.randomCard, homeEmoteRandomMode && styles.gridCardSelected]}
                    accessibilityRole="button"
                    accessibilityLabel="Random emote on tap"
                    accessibilityState={{ selected: homeEmoteRandomMode }}
                  >
                    <View style={styles.randomDie}>
                      <Image
                        source={require('../../assets/images/ui/creator-dice.png')}
                        style={styles.randomDieImg}
                        resizeMode="contain"
                        accessibilityIgnoresInvertColors
                      />
                    </View>
                    <Text style={[styles.gridCardName, homeEmoteRandomMode && { color: colors.orange }]}>
                      Random
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* All emotes grouped by category — owned tiles tap to
                  equip, locked tiles dim + show 🔒 IN BAGS and tap-route
                  to the LootBox screen. Picker now doubles as the
                  catalog view for emotes (matches 2026-05-03 pivot:
                  Customize is the catalog, bags are the acquisition). */}
              {EMOTE_CATEGORY_ORDER.map((cat) => {
                const list = allByCategory[cat.key] ?? [];
                if (list.length === 0) return null;
                return (
                  <View key={cat.key} style={styles.catSection}>
                    <Text style={styles.catTitle}>{cat.label.toUpperCase()}</Text>
                    <View style={styles.catGrid}>
                      {list.map((e) => {
                        const owned = isOwned(e.id, e.price);
                        const selected = owned && !homeEmoteRandomMode && selectedHomeEmote === e.id;
                        const icon = EMOTE_ICON[e.id];
                        return (
                          <Pressable
                            key={e.id}
                            onPress={() => owned ? handleSelectEmote(e.id) : handleLockedTap()}
                            style={[
                              styles.gridCard,
                              selected && styles.gridCardSelected,
                              !owned && styles.gridCardLocked,
                            ]}
                            accessibilityRole="button"
                            accessibilityLabel={owned ? `Select ${e.name} emote` : `${e.name} emote, locked, in bags`}
                            accessibilityState={{ selected }}
                          >
                            {icon ? (
                              <Image
                                source={icon}
                                style={[styles.gridCardIcon, !owned && styles.gridCardIconLocked]}
                                resizeMode="contain"
                                accessibilityIgnoresInvertColors
                              />
                            ) : (
                              <View style={styles.gridCardIconFallback} />
                            )}
                            <Text
                              style={[
                                styles.gridCardName,
                                selected && { color: colors.orange },
                                !owned && styles.gridCardNameLocked,
                              ]}
                              numberOfLines={1}
                            >
                              {e.name}
                            </Text>
                            {!owned && (
                              <View style={styles.lockBadge}>
                                <Text style={styles.lockBadgeText}>🔒 IN BAGS</Text>
                              </View>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}

              {/* "Open bags" CTA — bags are the new acquisition path
                  for any locked emote. Routes to LootBoxScreen so the
                  player can roll for missing animations. */}
              <Pressable
                onPress={handleBuyMore}
                {...(Platform.OS === 'web'
                  ? ({ onClick: handleBuyMore } as any)
                  : {})}
                style={styles.buyMoreCta}
                accessibilityRole="button"
                accessibilityLabel="Open bags to find more emotes"
              >
                <LinearGradient
                  colors={['rgba(255,140,0,0.25)', 'rgba(255,80,0,0.18)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.buyMoreGradient}
                >
                  <Text style={styles.buyMoreText}>OPEN BAGS FOR MORE</Text>
                  <Text style={styles.buyMoreArrow}>→</Text>
                </LinearGradient>
              </Pressable>
            </>
          ) : (
            <>
              {/* Pinned RANDOM tile for idles. equippedIdle === null = random. */}
              <View style={styles.catSection}>
                <View style={styles.catGrid}>
                  <Pressable
                    onPress={() => handleSelectIdle(null)}
                    style={[styles.gridCard, styles.randomCard, !equippedIdle && styles.gridCardSelected]}
                    accessibilityRole="button"
                    accessibilityLabel="Random idle, rotates every ~10 seconds"
                    accessibilityState={{ selected: !equippedIdle }}
                  >
                    <View style={styles.randomDie}>
                      <Image
                        source={require('../../assets/images/ui/creator-dice.png')}
                        style={styles.randomDieImg}
                        resizeMode="contain"
                        accessibilityIgnoresInvertColors
                      />
                    </View>
                    <Text style={[styles.gridCardName, !equippedIdle && { color: colors.orange }]}>
                      Random
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* All idle poses */}
              <View style={styles.catSection}>
                <Text style={styles.catTitle}>POSES</Text>
                <View style={styles.catGrid}>
                  {IDLE_POSES.map((idle) => {
                    const selected = equippedIdle === idle.id;
                    const icon = IDLE_ICON[idle.id];
                    return (
                      <Pressable
                        key={idle.id}
                        onPress={() => handleSelectIdle(idle.id)}
                        style={[styles.gridCard, selected && styles.gridCardSelected]}
                        accessibilityRole="button"
                        accessibilityLabel={`Equip ${idle.name} idle`}
                        accessibilityState={{ selected }}
                      >
                        {icon ? (
                          <Image
                            source={icon}
                            style={styles.gridCardIcon}
                            resizeMode="contain"
                            accessibilityIgnoresInvertColors
                          />
                        ) : (
                          <View style={styles.gridCardIconFallback} />
                        )}
                        <Text
                          style={[styles.gridCardName, selected && { color: colors.orange }]}
                          numberOfLines={1}
                        >
                          {idle.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Close button */}
        <View style={[styles.closeArea, { paddingBottom: Math.max(16, insets.bottom + 12) }]}>
          <Pressable
            onPress={() => { playSound('modal_out'); onClose(); }}
            {...(Platform.OS === 'web'
              ? ({ onClick: () => { playSound('modal_out'); onClose(); } } as any)
              : {})}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close animation picker"
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.05)']}
              style={styles.closeBtnGradient}
            >
              <Text style={styles.closeBtnText}>DONE</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </PreviewSafeModal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1 },
  header: { alignItems: 'center', paddingBottom: 4 },
  headerTitle: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 22, color: '#ffffff', letterSpacing: 3 },

  // Tabs
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 6, marginTop: 8, marginBottom: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.orange },
  tabText: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 13, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 },
  tabTextActive: { color: '#ffffff' },

  // Preview
  previewArea: { alignItems: 'center', height: 160, justifyContent: 'center', marginTop: 4 },
  nowPlaying: {
    position: 'absolute', bottom: 0,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,140,0,0.15)',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(255,140,0,0.3)',
  },
  nowPlayingDie: { width: 14, height: 14 },
  nowPlayingText: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 11, color: colors.orange, letterSpacing: 0.5 },

  // Scroll
  scrollArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 12, paddingTop: 8 },

  // Category sections
  catSection: { marginBottom: 14 },
  catTitle: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5, marginLeft: 4, marginBottom: 6 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },

  // Grid card (used for both emote tiles and idle tiles)
  gridCard: {
    flexBasis: '31%',
    flexGrow: 1,
    minWidth: 90,
    maxWidth: 130,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  gridCardSelected: { borderColor: 'rgba(255,140,0,0.6)', backgroundColor: 'rgba(255,140,0,0.12)' },
  // Locked emote/idle tile — dimmed icon, dimmed name, lock badge
  // pinned bottom-right. Tapping fires handleLockedTap which routes
  // to the LootBox screen so the player can roll for the missing
  // animation.
  gridCardLocked: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  gridCardIcon: { width: 64, height: 64, marginBottom: 2 },
  gridCardIconLocked: { opacity: 0.35 },
  gridCardIconFallback: { width: 64, height: 64, marginBottom: 2, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
  gridCardName: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 10, color: 'rgba(255,255,255,0.9)', marginTop: 2, textAlign: 'center' },
  gridCardNameLocked: { color: 'rgba(255,255,255,0.45)' },
  // Lock badge — small pill in the bottom-right corner of locked
  // tiles. "🔒 IN BAGS" tells the player exactly where to find this
  // animation. Warm-amber so it ties to the bag art.
  lockBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,180,90,0.4)',
  },
  lockBadgeText: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 7,
    color: 'rgba(255,180,90,0.95)',
    letterSpacing: 0.4,
  },

  // Random tile — slightly more prominent so the player knows it's the
  // "I want surprise" toggle, not just another emote pick.
  randomCard: {
    backgroundColor: 'rgba(255,140,0,0.06)',
    borderColor: 'rgba(255,140,0,0.25)',
  },
  randomDie: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,140,0,0.12)',
    marginBottom: 2,
  },
  randomDieText: { fontSize: 32 },
  randomDieImg: { width: 56, height: 56 },

  // Buy-more CTA
  buyMoreCta: { borderRadius: 14, overflow: 'hidden', marginTop: 6, marginHorizontal: 4 },
  buyMoreGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.4)',
  },
  buyMoreText: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 14, color: '#ffffff', letterSpacing: 2 },
  buyMoreArrow: { fontSize: 18, color: '#ffffff' },

  // Close
  closeArea: { paddingHorizontal: 40, paddingTop: 8 },
  closeBtn: { borderRadius: 14, overflow: 'hidden' },
  closeBtnGradient: { paddingVertical: 14, alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  closeBtnText: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 16, color: '#ffffff', letterSpacing: 3 },
});
