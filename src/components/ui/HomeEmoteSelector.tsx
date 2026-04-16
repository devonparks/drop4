import React from 'react';
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
import { AnimatedCharacter, EMOTE_CATEGORIES, EmoteId } from './AnimatedCharacter';
import { EMOTE_EMOJI, EMOTE_NAME } from './EmoteShowcase';
import { useShopStore } from '../../stores/shopStore';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

// ═══════════════════════════════════════════════════════════════════════
// HomeEmoteSelector
//
// Full-screen picker that replaces the old "random on tap" behavior. User
// story:
//   1. Player taps the Emote button on Home.
//   2. This picker opens with a toggle at the top: "Random Mode".
//   3. Player either flips on Random Mode (any tap on the character plays
//      a surprise emote) OR picks a specific emote to equip.
//   4. Picking an emote auto-disables random mode, saves the choice, and
//      closes the picker.
//   5. Back on Home, tapping the character plays whichever is active.
//
// Persistence: lives in shopStore under `selectedHomeEmote` + `homeEmoteRandomMode`.
// ═══════════════════════════════════════════════════════════════════════

interface HomeEmoteSelectorProps {
  visible: boolean;
  onClose: () => void;
}

// One emote entry rendered in the grid
interface EmoteCardProps {
  id: EmoteId;
  isSelected: boolean;
  onPress: () => void;
}

function EmoteCard({ id, isSelected, onPress }: EmoteCardProps) {
  const emoji = EMOTE_EMOJI[id] || '❓';
  const name = EMOTE_NAME[id] || id;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, isSelected && styles.cardSelected]}
      accessibilityRole="button"
      accessibilityLabel={isSelected ? `${name} emote, equipped` : `Equip ${name} emote`}
      accessibilityHint="Sets this emote as your home tap reaction"
      accessibilityState={{ selected: isSelected }}
    >
      <LinearGradient
        colors={
          isSelected
            ? ['rgba(255,140,0,0.30)', 'rgba(255,140,0,0.10)']
            : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']
        }
        style={styles.cardGradient}
      >
        <Text style={styles.cardEmoji}>{emoji}</Text>
        <Text style={[styles.cardName, isSelected && { color: colors.orange }]} numberOfLines={1}>
          {name}
        </Text>
        {isSelected && (
          <View style={styles.equippedTag}>
            <Text style={styles.equippedTagText}>EQUIPPED</Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export function HomeEmoteSelector({ visible, onClose }: HomeEmoteSelectorProps) {
  const selectedHomeEmote = useShopStore((s) => s.selectedHomeEmote);
  const homeEmoteRandomMode = useShopStore((s) => s.homeEmoteRandomMode);
  const setSelectedHomeEmote = useShopStore((s) => s.setSelectedHomeEmote);
  const setHomeEmoteRandomMode = useShopStore((s) => s.setHomeEmoteRandomMode);
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  const handleSelect = (id: EmoteId) => {
    haptics.tap();
    playSound('click');
    setSelectedHomeEmote(id);
    // Close automatically so the player lands back on Home to try their new
    // choice. Mirrors the Basketball Stars / Clash Royale pattern.
    setTimeout(onClose, 80);
  };

  const handleToggleRandom = (enabled: boolean) => {
    haptics.tap();
    setHomeEmoteRandomMode(enabled);
  };

  const currentSelection = homeEmoteRandomMode ? null : (selectedHomeEmote as EmoteId | null);

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <LinearGradient
          colors={['#0a0e27', '#111b47', '#0a0e27']}
          style={StyleSheet.absoluteFill}
        />

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.headerTitle}>EMOTES</Text>
          <Text style={styles.headerSub}>
            Pick a favorite, or let it surprise you
          </Text>
        </View>

        {/* Random Mode toggle row */}
        <View style={styles.randomRow}>
          <View style={styles.randomTextWrap}>
            <Text style={styles.randomTitle}>🎲 Random Mode</Text>
            <Text style={styles.randomSub}>
              {homeEmoteRandomMode
                ? 'Tap your character for a surprise emote'
                : 'Use the emote you pick below'}
            </Text>
          </View>
          <Switch
            value={homeEmoteRandomMode}
            onValueChange={handleToggleRandom}
            trackColor={{ false: 'rgba(255,255,255,0.15)', true: 'rgba(255,140,0,0.55)' }}
            thumbColor={homeEmoteRandomMode ? colors.orange : '#e0e0e8'}
          />
        </View>

        {/* Character preview — shows the currently selected emote or idle */}
        <View style={styles.characterArea}>
          <View style={styles.characterGlow} />
          <AnimatedCharacter
            size={150}
            emote={homeEmoteRandomMode ? null : currentSelection}
          />
          <View style={styles.nowPlayingBadge}>
            <Text style={styles.nowPlayingText}>
              {homeEmoteRandomMode
                ? '🎲 Random'
                : currentSelection
                  ? `${EMOTE_EMOJI[currentSelection]} ${EMOTE_NAME[currentSelection]}`
                  : 'None selected'}
            </Text>
          </View>
        </View>

        {/* Emote grid organized by category */}
        <ScrollView
          style={styles.gridScroll}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
        >
          {EMOTE_CATEGORIES.filter((c) => c.name !== 'Idle').map((category) => (
            <View key={category.name} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{category.name.toUpperCase()}</Text>
              <View style={styles.categoryGrid}>
                {category.emotes.map((id) => (
                  <EmoteCard
                    key={id}
                    id={id}
                    isSelected={
                      !homeEmoteRandomMode && currentSelection === id
                    }
                    onPress={() => handleSelect(id)}
                  />
                ))}
              </View>
            </View>
          ))}
          <View style={{ height: 30 }} />
        </ScrollView>

        {/* Close button */}
        <View style={[styles.closeArea, { paddingBottom: Math.max(16, insets.bottom + 12) }]}>
          <Pressable
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close emote picker"
            accessibilityHint="Returns to the home screen"
          >
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
  overlay: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 22,
    color: '#ffffff',
    letterSpacing: 3,
  },
  headerSub: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 11,
    color: 'rgba(200,220,255,0.55)',
    letterSpacing: 0.5,
    marginTop: 2,
  },

  // Random mode toggle
  randomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(255,140,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.25)',
  },
  randomTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  randomTitle: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#ffffff',
  },
  randomSub: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },

  // Character preview
  characterArea: {
    height: 170,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 4,
  },
  characterGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.15)',
    backgroundColor: 'rgba(255,140,0,0.04)',
  },
  nowPlayingBadge: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,140,0,0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.35)',
  },
  nowPlayingText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: colors.orange,
    letterSpacing: 0.5,
  },

  // Grid
  gridScroll: {
    flex: 1,
  },
  gridContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  categorySection: {
    marginBottom: 14,
  },
  categoryTitle: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.5,
    marginLeft: 4,
    marginBottom: 6,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  card: {
    flexBasis: '31%',
    flexGrow: 1,
    minWidth: 90,
    maxWidth: 130,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardSelected: {
    borderColor: 'rgba(255,140,0,0.6)',
  },
  cardGradient: {
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    minHeight: 64,
    justifyContent: 'center',
  },
  cardEmoji: {
    fontSize: 24,
  },
  cardName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 3,
    textAlign: 'center',
  },
  equippedTag: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: 'rgba(255,140,0,0.85)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  equippedTagText: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 7,
    color: '#ffffff',
    letterSpacing: 0.5,
  },

  // Close
  closeArea: {
    paddingHorizontal: 40,
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
