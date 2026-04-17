import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { AnimatedCharacter } from '../components/ui/AnimatedCharacter';
import { CharacterSnapshot } from '../components/3d/CharacterSnapshot';
import { getRosterCustomization } from '../data/npcCustomizations';
import { useCharacterStore } from '../stores/characterStore';
import { FEATURES } from '../config/features';
import { useRosterStore } from '../stores/rosterStore';
import { ROSTER, RosterCharacter } from '../data/characterRoster';
import { CAREER_RATINGS } from '../data/careerLevels';
import { useShopStore } from '../stores/shopStore';
import { haptics } from '../services/haptics';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Roster'>;
};

// Card sizing is flex-based so it works inside the web PhoneFrame (fixed 390)
// AND on native devices of any width. We don't use Dimensions.get('window')
// because that returns the BROWSER width on web, not the PhoneFrame width.
const CARD_GAP = 12;
// Conservative preview height — wide enough to look great on any phone, narrow
// enough to never overflow the smallest target (iPhone SE @ 320).
const CARD_PREVIEW_SIZE = 130;

// ─────────────────────────────────────────────────────────────────────────
// Character Card
// ─────────────────────────────────────────────────────────────────────────

interface CardProps {
  character: RosterCharacter;
  isUnlocked: boolean;
  isEquipped: boolean;
  onEquip: () => void;
}

// ─────────────────────────────────────────────────────────────────────────
// Rarity tier derived from the character's "OVR" rating.
// Determines the card frame gradient, badge color, and backdrop mood —
// the same logic you see on an NBA 2K MyTeam card.
// ─────────────────────────────────────────────────────────────────────────
type CardTier = 'bronze' | 'silver' | 'gold' | 'ruby' | 'amethyst' | 'diamond' | 'darkmatter';

interface TierStyle {
  name: string;
  frameGradient: [string, string, string];
  cardBg: [string, string, string];
  ratingColor: string;
  glow: string;
}

const TIER_STYLES: Record<CardTier, TierStyle> = {
  bronze:     { name: 'BRONZE',  frameGradient: ['#c07532', '#8a4a14', '#5a2e04'], cardBg: ['#2a1810', '#1a0e06', '#0e0604'], ratingColor: '#e89545', glow: '#c07532' },
  silver:     { name: 'SILVER',  frameGradient: ['#d6d6e8', '#9090a0', '#606070'], cardBg: ['#1e1e2a', '#14141c', '#08080e'], ratingColor: '#e8e8f8', glow: '#b0b0c0' },
  gold:       { name: 'GOLD',    frameGradient: ['#f7d664', '#d4a020', '#8a6a08'], cardBg: ['#2a2208', '#1a1604', '#0a0802'], ratingColor: '#ffe066', glow: '#d4a020' },
  ruby:       { name: 'RUBY',    frameGradient: ['#ff5064', '#c0203c', '#700a1c'], cardBg: ['#2a0810', '#1a0408', '#0a0204'], ratingColor: '#ff6078', glow: '#e02040' },
  amethyst:   { name: 'AMETHYST',frameGradient: ['#b45cff', '#7020c0', '#3a0872'], cardBg: ['#1e0a30', '#140620', '#08020e'], ratingColor: '#c074ff', glow: '#9040d0' },
  diamond:    { name: 'DIAMOND', frameGradient: ['#9df0ff', '#4ab8e0', '#1a6090'], cardBg: ['#0a1a28', '#060e18', '#020608'], ratingColor: '#b8f0ff', glow: '#4ac8ff' },
  darkmatter: { name: 'DARK MATTER', frameGradient: ['#ff2050', '#9020ff', '#400060'], cardBg: ['#100015', '#08000a', '#000005'], ratingColor: '#ff4080', glow: '#c01080' },
};

function getCardTier(rating: number, isBoss: boolean, isDarkLord: boolean): CardTier {
  if (isDarkLord) return 'darkmatter';
  if (isBoss) return 'diamond';
  if (rating >= 90) return 'amethyst';
  if (rating >= 86) return 'ruby';
  if (rating >= 82) return 'gold';
  if (rating >= 78) return 'silver';
  return 'bronze';
}

/**
 * Inner preview component. When 3D is on, uses CharacterSnapshot for cached
 * PNG rendering — 40+ cards in a grid can't afford live <Canvas> each.
 * For the equipped character we use the player's own customization. For
 * other roster characters we pull a predefined 3D look from npcCustomizations.
 */
function RosterCardPreview({ characterId, size, isEquipped }: {
  characterId: string; size: number; isEquipped: boolean;
}) {
  const playerCust = useCharacterStore((s) => s.customization);
  if (!FEATURES.character3D) {
    return (
      <AnimatedCharacter
        characterId={characterId}
        size={size}
        selectedIdle={isEquipped ? null : 'foottap'}
      />
    );
  }
  const custom = getRosterCustomization(characterId);
  // Default (player) character uses the live customization so it reflects edits
  return (
    <CharacterSnapshot
      width={size}
      height={size}
      customization={custom ?? playerCust}
    />
  );
}

function CharacterCard({ character, isUnlocked, isEquipped, onEquip }: CardProps) {
  const sigCount = character.signatureEmotes.length;

  // Rating + tier lookups. The default_player has no career level so we
  // hand-assign a starter rating.
  const rating = character.unlockedAtCareerLevel != null
    ? CAREER_RATINGS[character.unlockedAtCareerLevel] ?? 70
    : 75;
  const isDarkLord = character.id === 'the_dark_lord';
  const tier = getCardTier(rating, character.isBoss, isDarkLord);
  const tierStyle = TIER_STYLES[tier];

  return (
    <Pressable
      onPress={isUnlocked ? onEquip : undefined}
      disabled={!isUnlocked}
      accessibilityRole="button"
      accessibilityLabel={
        isUnlocked
          ? `${character.name}, ${tierStyle.name} tier, rating ${rating}`
          : `Locked character${character.unlockedAtCareerLevel != null ? `, unlocks at career level ${character.unlockedAtCareerLevel}` : ''}`
      }
      accessibilityState={{ disabled: !isUnlocked, selected: isEquipped }}
      accessibilityHint={isUnlocked && !isEquipped ? 'Double tap to equip' : undefined}
      style={[
        styles.card,
        {
          borderColor: isEquipped ? colors.greenLight : tierStyle.frameGradient[0],
          shadowColor: tierStyle.glow,
        },
      ]}
    >
      {/* Outer rarity frame — two-stop gradient top-to-bottom */}
      <LinearGradient
        colors={tierStyle.frameGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Inner card background — dark backdrop inside the frame */}
      <View style={styles.cardInner}>
        <LinearGradient
          colors={isUnlocked ? tierStyle.cardBg : ['#0a0a0f', '#050508', '#020204']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Foil shimmer — diagonal lighter band across the top half */}
        {isUnlocked && (
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.12)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.8 }}
            style={styles.foilShimmer}
            pointerEvents="none"
          />
        )}

        {/* Rating badge — top-left, player-card style */}
        {isUnlocked && (
          <View style={[styles.ratingBadge, { borderColor: tierStyle.ratingColor, shadowColor: tierStyle.glow }]}>
            <Text style={[styles.ratingNumber, { color: tierStyle.ratingColor }]}>{rating}</Text>
            <Text style={styles.ratingLabel}>OVR</Text>
          </View>
        )}

        {/* Tier label — top-right */}
        {isUnlocked && (
          <View style={styles.tierLabelWrap}>
            <Text style={[styles.tierLabel, { color: tierStyle.ratingColor }]}>{tierStyle.name}</Text>
          </View>
        )}

        {/* Equipped tag */}
        {isEquipped && (
          <View style={styles.equippedTag}>
            <Text style={styles.equippedTagText}>EQUIPPED</Text>
          </View>
        )}

        {/* Character preview */}
        <View style={styles.previewBox}>
          {isUnlocked ? (
            <RosterCardPreview characterId={character.id} size={CARD_PREVIEW_SIZE} isEquipped={isEquipped} />
          ) : (
            <View style={styles.lockedSilhouette}>
              <Text style={styles.lockEmoji}>🔒</Text>
            </View>
          )}
        </View>

        {/* Name banner — diagonal gradient bar bottom third */}
        <LinearGradient
          colors={['transparent', tierStyle.frameGradient[1] + 'ee', tierStyle.frameGradient[2]]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.nameBanner}
          pointerEvents="none"
        />

        {/* Name + title */}
        <Text style={[styles.name, !isUnlocked && styles.dimText]} numberOfLines={1}>
          {isUnlocked ? character.name.toUpperCase() : '???'}
        </Text>
        <Text
          style={[
            styles.title,
            { color: isUnlocked ? tierStyle.ratingColor : 'rgba(255,255,255,0.35)' },
          ]}
          numberOfLines={1}
        >
          {isUnlocked ? character.title : 'LOCKED'}
        </Text>

        {/* Unlock condition / signature count */}
        {!isUnlocked && character.unlockedAtCareerLevel != null && (
          <Text style={styles.unlockLine}>
            Beat Career Level {character.unlockedAtCareerLevel}
          </Text>
        )}
        {isUnlocked && sigCount > 0 && (
          <Text style={styles.signatureLine}>
            ✦ {sigCount} signature emote{sigCount === 1 ? '' : 's'}
          </Text>
        )}
      </View>

      {/* Boss / Dark Lord marquee corner flag */}
      {character.isBoss && isUnlocked && (
        <View style={[styles.bossTag, { backgroundColor: tierStyle.ratingColor }]}>
          <Text style={[styles.bossTagText, { color: '#0a0a0f' }]}>
            {isDarkLord ? '★ FINAL BOSS ★' : '★ BOSS ★'}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────

export function RosterScreen({ navigation }: Props) {
  // Primitive selectors only — no method calls inside selectors per CLAUDE.md
  const equippedCharacterId = useRosterStore((s) => s.equippedCharacterId);
  const unlockedCharacterIds = useRosterStore((s) => s.unlockedCharacterIds);
  const equipCharacter = useRosterStore((s) => s.equipCharacter);
  const coins = useShopStore((s) => s.coins);
  const gems = useShopStore((s) => s.gems);
  const level = useShopStore((s) => s.level);

  // v1: count only starters + bosses (the playable characters shown on this screen)
  const playableIds = useMemo(() => {
    const starters = ROSTER.filter((c) => c.unlockedAtCareerLevel == null).map((c) => c.id);
    const bosses = ROSTER.filter((c) => c.isBoss).map((c) => c.id);
    return new Set([...starters, ...bosses]);
  }, []);
  const unlockedCount = unlockedCharacterIds.filter((id) => playableIds.has(id)).length;
  const totalCount = playableIds.size;

  // v1 roster: show starters + boss unlocks only (not every career NPC).
  // Boss characters are the prestige unlocks; regular NPCs are just faces on
  // the career node path. This keeps the roster screen tight and premium.
  const sections = useMemo(() => {
    const starters = ROSTER.filter((c) => c.unlockedAtCareerLevel == null);
    const bossUnlocks = ROSTER.filter((c) => c.isBoss);
    return [
      { title: 'Your Characters', data: starters },
      { title: 'Boss Unlocks', data: bossUnlocks },
    ];
  }, []);

  const handleEquip = (id: string) => {
    if (id === equippedCharacterId) return;
    haptics.tap();
    equipCharacter(id);
  };

  return (
    <ScreenBackground>
      <TopBar
        coins={coins}
        gems={gems}
        level={level}
        showBack
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header card with collection progress */}
        <LinearGradient
          colors={['rgba(155,89,182,0.18)', 'rgba(155,89,182,0.04)']}
          style={styles.headerCard}
        >
          <Text style={styles.headerEyebrow} accessibilityRole="header">YOUR COLLECTION</Text>
          <Text style={styles.headerCount}>
            {unlockedCount}<Text style={styles.headerCountTotal}> / {totalCount}</Text>
          </Text>
          <Text style={styles.headerSub}>
            Beat career opponents to add them to your roster
          </Text>
        </LinearGradient>

        {sections.map((section) => {
          if (section.data.length === 0) return null;
          const sectionUnlocked = section.data.filter((c) =>
            unlockedCharacterIds.includes(c.id),
          ).length;
          return (
            <View key={section.title} style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle} accessibilityRole="header">{section.title}</Text>
                <Text style={styles.sectionCount}>
                  {sectionUnlocked}/{section.data.length}
                </Text>
              </View>
              <View style={styles.grid}>
                {section.data.map((character) => (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    isUnlocked={unlockedCharacterIds.includes(character.id)}
                    isEquipped={character.id === equippedCharacterId}
                    onEquip={() => handleEquip(character.id)}
                  />
                ))}
              </View>
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenBackground>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerCard: {
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 22,
    borderWidth: 1,
    borderColor: 'rgba(155,89,182,0.4)',
    marginBottom: 24,
  },
  headerEyebrow: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: weight.bold,
    color: colors.purpleLight,
    letterSpacing: 1.5,
  },
  headerCount: {
    fontFamily: fonts.heading,
    fontSize: 44,
    fontWeight: weight.black,
    color: '#ffffff',
    marginTop: 4,
  },
  headerCountTotal: {
    fontSize: 24,
    color: colors.textMuted,
    fontWeight: weight.medium,
  },
  headerSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    fontWeight: weight.bold,
    color: '#ffffff',
  },
  sectionCount: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: weight.bold,
    color: colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
  },
  card: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: 140,
    maxWidth: 200,
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    minHeight: 260,
    // Shadow for premium elevation; shadowColor set dynamically per tier
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  // The dark backdrop inside the rarity frame — reveals the frame as a border
  cardInner: {
    position: 'absolute',
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: 14,
    overflow: 'hidden',
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 10,
  },
  foilShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    opacity: 0.9,
  },
  ratingBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    zIndex: 3,
  },
  ratingNumber: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 17,
    lineHeight: 19,
  },
  ratingLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 7,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
    marginTop: -2,
  },
  tierLabelWrap: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 3,
  },
  tierLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 8,
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  nameBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '38%',
  },
  bossTag: {
    position: 'absolute',
    bottom: -2,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: 'center',
    zIndex: 4,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.5)',
  },
  bossTagText: {
    fontFamily: fonts.body,
    fontSize: 9,
    fontWeight: weight.black,
    color: '#0a0a0f',
    letterSpacing: 1,
  },
  equippedTag: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: colors.green,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    zIndex: 2,
  },
  equippedTagText: {
    fontFamily: fonts.body,
    fontSize: 9,
    fontWeight: weight.black,
    color: '#ffffff',
    letterSpacing: 1,
  },
  previewBox: {
    height: CARD_PREVIEW_SIZE,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  lockedSilhouette: {
    width: CARD_PREVIEW_SIZE - 16,
    height: CARD_PREVIEW_SIZE - 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockEmoji: {
    fontSize: 36,
    opacity: 0.6,
  },
  name: {
    fontFamily: fonts.heading,
    fontSize: 14,
    fontWeight: weight.bold,
    color: '#ffffff',
    marginTop: 8,
    textAlign: 'center',
  },
  title: {
    fontFamily: fonts.body,
    fontSize: 10,
    fontWeight: weight.bold,
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 2,
  },
  dimText: {
    color: colors.textMuted,
  },
  unlockLine: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  signatureLine: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.coinGold,
    textAlign: 'center',
    marginTop: 6,
    fontWeight: weight.bold,
  },
});
