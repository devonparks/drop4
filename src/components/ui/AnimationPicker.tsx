import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedCharacter, EMOTE_CATEGORIES, EmoteId, IdleVariantId } from './AnimatedCharacter';
import { EMOTE_EMOJI, EMOTE_NAME } from './EmoteShowcase';
import { useShopStore } from '../../stores/shopStore';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

// ═══════════════════════════════════════════════════════════════════════
// AnimationPicker — unified Emotes + Idles picker
//
// Replaces the two separate side buttons (Emotes / Idles) with one
// clean modal that has two tabs. Players pick an emote OR an idle,
// and it applies when they tap their character on the Home screen.
//
// Tab 1: EMOTES — category grid with Random Mode toggle
// Tab 2: IDLES — list of idle variants + default (random)
// ═══════════════════════════════════════════════════════════════════════

type Tab = 'emotes' | 'idles';

const IDLE_INFO: Record<string, { name: string; icon: string }> = {
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

const IDLE_IDS: IdleVariantId[] = [
  'foottap', 'swingarms', 'checkwatch', 'headnod', 'lookaround',
  'stretch', 'yawn', 'chinscratch', 'weightshift', 'phonescroll',
];

interface AnimationPickerProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: Tab;
}

export function AnimationPicker({ visible, onClose, initialTab = 'emotes' }: AnimationPickerProps) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  // Sync tab when initialTab changes (e.g. left button = emotes, right = idles)
  React.useEffect(() => {
    if (visible) setActiveTab(initialTab);
  }, [visible, initialTab]);
  const insets = useSafeAreaInsets();

  // Emote state
  const selectedHomeEmote = useShopStore((s) => s.selectedHomeEmote);
  const homeEmoteRandomMode = useShopStore((s) => s.homeEmoteRandomMode);
  const setSelectedHomeEmote = useShopStore((s) => s.setSelectedHomeEmote);
  const setHomeEmoteRandomMode = useShopStore((s) => s.setHomeEmoteRandomMode);

  // Idle state
  const equippedIdle = useShopStore((s) => s.equippedIdle);
  const setEquippedIdle = useShopStore((s) => s.setEquippedIdle);

  if (!visible) return null;

  const handleSelectEmote = (id: EmoteId) => {
    haptics.tap();
    playSound('click');
    setSelectedHomeEmote(id);
    setTimeout(onClose, 80);
  };

  const handleSelectIdle = (id: IdleVariantId | null) => {
    haptics.tap();
    playSound('click');
    setEquippedIdle(id);
  };

  // What's currently active for the character preview
  const previewEmote = activeTab === 'emotes' && !homeEmoteRandomMode ? selectedHomeEmote : null;
  const previewIdle = activeTab === 'idles' ? (equippedIdle as IdleVariantId | null) : null;

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
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
            onPress={() => { haptics.tap(); setActiveTab('emotes'); }}
            style={[styles.tab, activeTab === 'emotes' && styles.tabActive]}
            accessibilityRole="tab"
            accessibilityLabel="Emotes tab"
            accessibilityState={{ selected: activeTab === 'emotes' }}
          >
            <Text style={[styles.tabText, activeTab === 'emotes' && styles.tabTextActive]}>🕺 EMOTES</Text>
          </Pressable>
          <Pressable
            onPress={() => { haptics.tap(); setActiveTab('idles'); }}
            style={[styles.tab, activeTab === 'idles' && styles.tabActive]}
            accessibilityRole="tab"
            accessibilityLabel="Idles tab"
            accessibilityState={{ selected: activeTab === 'idles' }}
          >
            <Text style={[styles.tabText, activeTab === 'idles' && styles.tabTextActive]}>💫 IDLES</Text>
          </Pressable>
        </View>

        {/* Character preview */}
        <View style={styles.previewArea}>
          <AnimatedCharacter
            size={140}
            emote={previewEmote as EmoteId | null}
            selectedIdle={previewIdle}
          />
          <View style={styles.nowPlaying}>
            <Text style={styles.nowPlayingText}>
              {activeTab === 'emotes'
                ? (homeEmoteRandomMode ? '🎲 Random' : selectedHomeEmote ? `${EMOTE_EMOJI[selectedHomeEmote as EmoteId] || '?'} ${EMOTE_NAME[selectedHomeEmote as EmoteId] || 'None'}` : 'None selected')
                : (equippedIdle ? `${IDLE_INFO[equippedIdle]?.icon || '?'} ${IDLE_INFO[equippedIdle]?.name || 'Custom'}` : '🔄 Random')}
            </Text>
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
              {/* Random mode toggle */}
              <View style={styles.randomRow}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={styles.randomTitle}>🎲 Random Mode</Text>
                  <Text style={styles.randomSub}>
                    {homeEmoteRandomMode ? 'Surprise emote on tap' : 'Plays your selection'}
                  </Text>
                </View>
                <Switch
                  value={homeEmoteRandomMode}
                  onValueChange={(v) => { haptics.tap(); setHomeEmoteRandomMode(v); }}
                  trackColor={{ false: 'rgba(255,255,255,0.15)', true: 'rgba(255,140,0,0.55)' }}
                  thumbColor={homeEmoteRandomMode ? colors.orange : '#e0e0e8'}
                />
              </View>

              {/* Emote grid by category */}
              {EMOTE_CATEGORIES.map((cat) => (
                <View key={cat.name} style={styles.catSection}>
                  <Text style={styles.catTitle}>{cat.name.toUpperCase()}</Text>
                  <View style={styles.catGrid}>
                    {cat.emotes.map((id) => {
                      const selected = !homeEmoteRandomMode && selectedHomeEmote === id;
                      return (
                        <Pressable
                          key={id}
                          onPress={() => handleSelectEmote(id)}
                          style={[styles.emoteCard, selected && styles.emoteCardSelected]}
                          accessibilityRole="button"
                          accessibilityLabel={`Select ${EMOTE_NAME[id] || id} emote`}
                          accessibilityState={{ selected }}
                        >
                          <Text style={styles.emoteEmoji}>{EMOTE_EMOJI[id] || '?'}</Text>
                          <Text style={[styles.emoteName, selected && { color: colors.orange }]} numberOfLines={1}>
                            {EMOTE_NAME[id] || id}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </>
          ) : (
            <>
              {/* Default (random) option */}
              <Pressable
                onPress={() => handleSelectIdle(null)}
                style={[styles.idleRow, !equippedIdle && styles.idleRowActive]}
                accessibilityRole="button"
                accessibilityLabel="Default idle, random variants"
                accessibilityState={{ selected: !equippedIdle }}
              >
                <Text style={styles.idleIcon}>🔄</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.idleName}>Default</Text>
                  <Text style={styles.idleSub}>Random idle variants</Text>
                </View>
                {!equippedIdle && <Text style={styles.activeBadge}>ACTIVE</Text>}
              </Pressable>

              {/* Idle variants */}
              {IDLE_IDS.map((id) => {
                const info = IDLE_INFO[id];
                const active = equippedIdle === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => handleSelectIdle(id)}
                    style={[styles.idleRow, active && styles.idleRowActive]}
                    accessibilityRole="button"
                    accessibilityLabel={`Equip ${info.name} idle`}
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={styles.idleIcon}>{info.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.idleName, active && { color: colors.orange }]}>{info.name}</Text>
                      <Text style={styles.idleSub}>Tap to preview</Text>
                    </View>
                    {active && <Text style={styles.activeBadge}>EQUIPPED</Text>}
                  </Pressable>
                );
              })}
            </>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* Close button */}
        <View style={[styles.closeArea, { paddingBottom: Math.max(16, insets.bottom + 12) }]}>
          <Pressable
            onPress={onClose}
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
    </Modal>
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
  nowPlaying: { position: 'absolute', bottom: 0, backgroundColor: 'rgba(255,140,0,0.15)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,140,0,0.3)' },
  nowPlayingText: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 11, color: colors.orange, letterSpacing: 0.5 },

  // Scroll
  scrollArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 12, paddingTop: 8 },

  // Random toggle
  randomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 4, marginBottom: 12, borderRadius: 14, backgroundColor: 'rgba(255,140,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,140,0,0.25)' },
  randomTitle: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 14, color: '#ffffff' },
  randomSub: { fontFamily: fonts.body, fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  // Emote grid
  catSection: { marginBottom: 14 },
  catTitle: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5, marginLeft: 4, marginBottom: 6 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  emoteCard: { flexBasis: '31%', flexGrow: 1, minWidth: 85, maxWidth: 125, borderRadius: 12, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)', paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center' },
  emoteCardSelected: { borderColor: 'rgba(255,140,0,0.6)', backgroundColor: 'rgba(255,140,0,0.12)' },
  emoteEmoji: { fontSize: 24 },
  emoteName: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 9, color: 'rgba(255,255,255,0.9)', marginTop: 3, textAlign: 'center' },

  // Idle list
  idleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, marginBottom: 4, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.06)', gap: 12 },
  idleRowActive: { borderColor: 'rgba(255,140,0,0.4)', backgroundColor: 'rgba(255,140,0,0.08)' },
  idleIcon: { fontSize: 22 },
  idleName: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 14, color: '#ffffff' },
  idleSub: { fontFamily: fonts.body, fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 1 },
  activeBadge: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 9, color: colors.orange, letterSpacing: 1, backgroundColor: 'rgba(255,140,0,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },

  // Close
  closeArea: { paddingHorizontal: 40, paddingTop: 8 },
  closeBtn: { borderRadius: 14, overflow: 'hidden' },
  closeBtnGradient: { paddingVertical: 14, alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  closeBtnText: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 16, color: '#ffffff', letterSpacing: 3 },
});
