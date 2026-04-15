import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { AnimatedCharacter, useEmoteTrigger, EmoteId } from '../components/ui/AnimatedCharacter';
import { Character3DPortrait } from '../components/3d/Character3DPortrait';
import { FEATURES } from '../config/features';
import { FortniteEmoteWheel } from '../components/ui/FortniteEmoteWheel';
import { PetDisplay } from '../components/ui/PetDisplay';
import { RankBadge } from '../components/ui/RankBadge';
import { EMOTE_EMOJI, EMOTE_NAME } from '../components/ui/EmoteShowcase';
import { useShopStore } from '../stores/shopStore';
import { RANKED_TIERS, RankedTierInfo } from '../stores/rankedStore';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PartyLobby'>;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Cap at phone frame inner width on web
const CONTENT_WIDTH = Math.min(SCREEN_WIDTH, 386);
const SLOT_WIDTH = CONTENT_WIDTH * 0.42;

// Room code generator
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// Bot friend data
interface BotFriend {
  name: string;
  level: number;
  rankTier: RankedTierInfo;
  ready: boolean;
  emote: EmoteId | null;
  petId: string | null;
}

const BOT_EMOTES: EmoteId[] = [
  'thumbsup', 'wave', 'dab', 'clapping', 'flexbiceps', 'laughpoint',
  'fingerguns', 'dancechestpump', 'fistpump', 'shrug',
];

export function PartyLobbyScreen({ navigation }: Props) {
  const coins = useShopStore(s => s.coins);
  const gems = useShopStore(s => s.gems);
  const level = useShopStore(s => s.level);
  const playerName = useShopStore(s => s.playerName);
  const equippedPet = useShopStore(s => s.equippedPet);
  const equippedEmotes = useShopStore(s => s.equippedEmotes) as EmoteId[];

  const [roomCode] = useState(generateRoomCode);
  const [isReady, setIsReady] = useState(false);
  const [emoteWheelOpen, setEmoteWheelOpen] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showInviteMenu, setShowInviteMenu] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Player emote
  const { emote: myEmote, triggerEmote: triggerMyEmote, clearEmote: clearMyEmote } = useEmoteTrigger();

  // Bot friends
  const [bots, setBots] = useState<BotFriend[]>([
    {
      name: 'Alex_Drops',
      level: 8,
      rankTier: RANKED_TIERS.find(t => t.id === 'silver')!,
      ready: false,
      emote: null,
      petId: 'husky',
    },
    {
      name: 'JamieConnect',
      level: 12,
      rankTier: RANKED_TIERS.find(t => t.id === 'gold')!,
      ready: false,
      emote: null,
      petId: 'shiba',
    },
  ]);

  // Bots auto-ready after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setBots(prev => prev.map(b => ({ ...b, ready: true })));
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Bots play random emotes every 5-8 seconds
  const botEmoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const scheduleEmote = () => {
      const delay = 5000 + Math.random() * 3000;
      botEmoteTimerRef.current = setTimeout(() => {
        setBots(prev => {
          const botIdx = Math.floor(Math.random() * prev.length);
          const randomEmote = BOT_EMOTES[Math.floor(Math.random() * BOT_EMOTES.length)];
          return prev.map((b, i) =>
            i === botIdx ? { ...b, emote: randomEmote } : b
          );
        });
        // Clear emote after 2.5s
        setTimeout(() => {
          setBots(prev => prev.map(b => ({ ...b, emote: null })));
        }, 2500);
        scheduleEmote();
      }, delay);
    };
    scheduleEmote();
    return () => {
      if (botEmoteTimerRef.current) clearTimeout(botEmoteTimerRef.current);
    };
  }, []);

  const handleEmoteSelect = (emoteId: EmoteId) => {
    triggerMyEmote(emoteId);
  };

  const handleReady = () => {
    haptics.tap();
    playSound('click');
    setIsReady(!isReady);
  };

  const handleLeave = () => {
    haptics.tap();
    navigation.goBack();
  };

  const handleCopyRoomCode = () => {
    haptics.tap();
    playSound('click');
    // Clipboard.setStringAsync(roomCode) in production
    setCodeCopied(true);
    Alert.alert('Copied!', `Room code ${roomCode} copied to clipboard.`);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleInviteFriends = () => {
    haptics.tap();
    playSound('click');
    setShowInviteMenu(false);
    navigation.navigate('Friends');
  };

  const handleChooseMode = () => {
    haptics.tap();
    playSound('click');
    navigation.navigate('Play');
  };

  // Check if all players are ready
  const allReady = isReady && bots.every(b => b.ready);

  // Get the player's tier for display
  const playerTier = RANKED_TIERS.find(t => t.id === 'silver') || RANKED_TIERS[0];

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <TopBar
          coins={coins}
          gems={gems}
          level={level}
          showBack
          onBackPress={handleLeave}
        />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>PARTY LOBBY</Text>
          <Text style={styles.headerSubtitle}>Invite friends and play together!</Text>

          {/* Room Code — big and prominent */}
          <Pressable onPress={handleCopyRoomCode} style={styles.roomCodeContainer}>
            <Text style={styles.roomCodeLabel}>ROOM CODE</Text>
            <View style={styles.roomCodeRow}>
              <Text style={styles.roomCode}>{roomCode}</Text>
              <View style={styles.roomCodeCopyBtn}>
                <Text style={styles.roomCodeCopyText}>
                  {codeCopied ? 'COPIED!' : 'COPY'}
                </Text>
              </View>
            </View>
            <Text style={styles.roomCodeHint}>Tap to copy and share with friends</Text>
          </Pressable>
        </View>

        {/* How It Works — expandable */}
        <Pressable
          onPress={() => {
            haptics.tap();
            setShowHowItWorks(!showHowItWorks);
          }}
          style={styles.howItWorksToggle}
        >
          <Text style={styles.howItWorksToggleIcon}>{'💡'}</Text>
          <Text style={styles.howItWorksToggleText}>HOW IT WORKS</Text>
          <Text style={styles.howItWorksArrow}>{showHowItWorks ? '▲' : '▼'}</Text>
        </Pressable>

        {showHowItWorks && (
          <View style={styles.howItWorksContent}>
            <View style={styles.howStep}>
              <Text style={styles.howStepNum}>1</Text>
              <Text style={styles.howStepText}>Share your room code with friends</Text>
            </View>
            <View style={styles.howStep}>
              <Text style={styles.howStepNum}>2</Text>
              <Text style={styles.howStepText}>They enter the code to join your lobby</Text>
            </View>
            <View style={styles.howStep}>
              <Text style={styles.howStepNum}>3</Text>
              <Text style={styles.howStepText}>Everyone picks emotes and idles while waiting</Text>
            </View>
            <View style={styles.howStep}>
              <Text style={styles.howStepNum}>4</Text>
              <Text style={styles.howStepText}>Host picks a game mode and starts the match</Text>
            </View>
            <View style={styles.howStep}>
              <Text style={styles.howStepNum}>5</Text>
              <Text style={styles.howStepText}>Friends who can't play will spectate</Text>
            </View>
          </View>
        )}

        {/* Character slots — horizontal scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.slotsContainer}
          snapToInterval={SLOT_WIDTH + 12}
          decelerationRate="fast"
        >
          {/* Slot 1 — YOU (HOST) */}
          <View style={[styles.playerSlot, styles.playerSlotSelf]}>
            <LinearGradient
              colors={['rgba(100,180,255,0.12)', 'rgba(60,100,200,0.04)']}
              style={styles.slotGradient}
            >
              {/* Character */}
              <View style={styles.characterWrap}>
                {FEATURES.character3D ? (
                  <Character3DPortrait width={180} height={220} showFloor={false} />
                ) : (
                  <AnimatedCharacter
                    size={180}
                    emote={myEmote}
                    onEmoteComplete={clearMyEmote}
                  />
                )}
                <PetDisplay
                  petId={equippedPet}
                  size={50}
                  isIdle={!myEmote}
                  style={styles.lobbyPetPosition}
                />
              </View>

              {/* Emote bubble */}
              {myEmote && myEmote !== 'idle' && (
                <View style={styles.emoteBubble}>
                  <Text style={styles.emoteBubbleEmoji}>{EMOTE_EMOJI[myEmote]}</Text>
                </View>
              )}

              {/* Info */}
              <Text style={styles.playerNameSelf}>{playerName}</Text>
              <View style={styles.playerInfo}>
                <Text style={styles.playerLevel}>Lv.{level}</Text>
                <RankBadge size="small" />
              </View>

              {/* Ready badge */}
              {isReady && (
                <View style={styles.readyBadge}>
                  <Text style={styles.readyText}>READY</Text>
                </View>
              )}

              {/* HOST badge */}
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText}>HOST</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Bot friend slots */}
          {bots.map((bot, index) => (
            <View key={bot.name} style={styles.playerSlot}>
              <LinearGradient
                colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
                style={styles.slotGradient}
              >
                {/* Character */}
                <View style={styles.characterWrap}>
                  {/* Bots keep 2D for now — no per-bot customization data yet */}
                  <AnimatedCharacter
                    size={180}
                    emote={bot.emote || undefined}
                    onEmoteComplete={() => {
                      setBots(prev =>
                        prev.map((b, i) => i === index ? { ...b, emote: null } : b)
                      );
                    }}
                  />
                  <PetDisplay
                    petId={bot.petId}
                    size={50}
                    isIdle={!bot.emote}
                    style={styles.lobbyPetPosition}
                  />
                </View>

                {/* Emote bubble */}
                {bot.emote && (
                  <View style={styles.emoteBubble}>
                    <Text style={styles.emoteBubbleEmoji}>{EMOTE_EMOJI[bot.emote]}</Text>
                  </View>
                )}

                {/* Info */}
                <Text style={styles.playerNameFriend}>{bot.name}</Text>
                <View style={styles.playerInfo}>
                  <Text style={styles.playerLevel}>Lv.{bot.level}</Text>
                  <View style={[styles.rankPill, { backgroundColor: bot.rankTier.color + '30', borderColor: bot.rankTier.color + '50' }]}>
                    <Text style={styles.rankPillIcon}>{bot.rankTier.icon}</Text>
                    <Text style={[styles.rankPillText, { color: bot.rankTier.color }]}>{bot.rankTier.name}</Text>
                  </View>
                </View>

                {/* Ready badge */}
                {bot.ready && (
                  <View style={styles.readyBadge}>
                    <Text style={styles.readyText}>READY</Text>
                  </View>
                )}
              </LinearGradient>
            </View>
          ))}

          {/* Empty invite slot */}
          <Pressable
            onPress={() => {
              haptics.tap();
              setShowInviteMenu(true);
            }}
            style={styles.playerSlot}
          >
            <View style={styles.emptySlot}>
              <View style={styles.inviteCircle}>
                <Text style={styles.invitePlus}>+</Text>
              </View>
              <Text style={styles.inviteText}>INVITE</Text>
            </View>
          </Pressable>
        </ScrollView>

        {/* Bottom buttons */}
        <View style={styles.bottomBar}>
          {/* Emote wheel trigger */}
          <Pressable
            onPress={() => {
              haptics.tap();
              playSound('click');
              setEmoteWheelOpen(true);
            }}
            style={styles.emoteBtn}
          >
            <LinearGradient
              colors={['rgba(255,220,50,0.25)', 'rgba(255,140,0,0.12)']}
              style={styles.emoteBtnGradient}
            >
              <Text style={styles.emoteBtnIcon}>{'😀'}</Text>
              <Text style={styles.emoteBtnLabel}>EMOTE</Text>
            </LinearGradient>
          </Pressable>

          {/* Ready / Start button — changes based on state */}
          <View style={styles.readyBtnWrap}>
            {allReady ? (
              <GlossyButton
                label="CHOOSE MODE"
                variant="orange"
                icon="🎮"
                onPress={handleChooseMode}
              />
            ) : (
              <GlossyButton
                label={isReady ? 'UNREADY' : 'READY'}
                variant={isReady ? 'purple' : 'green'}
                iconRight={isReady ? '✕' : '✓'}
                onPress={handleReady}
              />
            )}
          </View>

          {/* Invite button */}
          <Pressable
            onPress={() => {
              haptics.tap();
              setShowInviteMenu(true);
            }}
            style={styles.inviteBtn}
          >
            <LinearGradient
              colors={['rgba(100,180,255,0.2)', 'rgba(60,120,255,0.08)']}
              style={styles.inviteBtnGradient}
            >
              <Text style={styles.inviteBtnIcon}>{'📨'}</Text>
              <Text style={styles.inviteBtnLabel}>INVITE</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Leave button */}
        <Pressable onPress={handleLeave} style={styles.leaveBtn}>
          <Text style={styles.leaveBtnText}>LEAVE PARTY</Text>
        </Pressable>

        {/* Invite Menu Overlay */}
        {showInviteMenu && (
          <Pressable
            onPress={() => setShowInviteMenu(false)}
            style={styles.inviteMenuOverlay}
          >
            <View style={styles.inviteMenuCard}>
              <Text style={styles.inviteMenuTitle}>INVITE FRIENDS</Text>

              <Pressable
                onPress={handleCopyRoomCode}
                style={styles.inviteMenuOption}
              >
                <LinearGradient
                  colors={['rgba(255,140,0,0.15)', 'rgba(255,140,0,0.05)']}
                  style={styles.inviteMenuOptionGrad}
                >
                  <Text style={styles.inviteMenuOptionIcon}>{'📋'}</Text>
                  <View style={styles.inviteMenuOptionInfo}>
                    <Text style={styles.inviteMenuOptionTitle}>Copy Room Code</Text>
                    <Text style={styles.inviteMenuOptionSub}>Share code {roomCode} with friends</Text>
                  </View>
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={handleInviteFriends}
                style={styles.inviteMenuOption}
              >
                <LinearGradient
                  colors={['rgba(100,180,255,0.15)', 'rgba(100,180,255,0.05)']}
                  style={styles.inviteMenuOptionGrad}
                >
                  <Text style={styles.inviteMenuOptionIcon}>{'👥'}</Text>
                  <View style={styles.inviteMenuOptionInfo}>
                    <Text style={styles.inviteMenuOptionTitle}>Invite Friends</Text>
                    <Text style={styles.inviteMenuOptionSub}>Send invite from your friends list</Text>
                  </View>
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={() => setShowInviteMenu(false)}
                style={styles.inviteMenuCancel}
              >
                <Text style={styles.inviteMenuCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </Pressable>
        )}

        {/* Emote Wheel */}
        <FortniteEmoteWheel
          visible={emoteWheelOpen}
          equippedEmotes={equippedEmotes}
          onSelect={handleEmoteSelect}
          onClose={() => setEmoteWheelOpen(false)}
        />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: 2,
    paddingBottom: 4,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 26,
    color: '#ffffff',
    letterSpacing: 4,
    textShadowColor: 'rgba(100,180,255,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  headerSubtitle: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 8,
  },
  roomCodeContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,140,0,0.08)',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,140,0,0.25)',
  },
  roomCodeLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: colors.orange,
    letterSpacing: 2,
    marginBottom: 4,
  },
  roomCodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roomCode: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 32,
    color: '#ffffff',
    letterSpacing: 6,
  },
  roomCodeCopyBtn: {
    backgroundColor: 'rgba(255,140,0,0.25)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.5)',
  },
  roomCodeCopyText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: colors.orange,
    letterSpacing: 1,
  },
  roomCodeHint: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },

  // How It Works
  howItWorksToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    marginHorizontal: 16,
  },
  howItWorksToggleIcon: {
    fontSize: 14,
  },
  howItWorksToggleText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1.5,
  },
  howItWorksArrow: {
    fontSize: 10,
    color: colors.textMuted,
  },
  howItWorksContent: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 8,
    marginBottom: 4,
  },
  howStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  howStepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,140,0,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.4)',
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: colors.orange,
    overflow: 'hidden',
  },
  howStepText: {
    flex: 1,
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Player slots
  slotsContainer: {
    paddingHorizontal: 16,
    gap: 12,
    paddingVertical: 8,
  },
  playerSlot: {
    width: SLOT_WIDTH,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  playerSlotSelf: {
    borderColor: 'rgba(100,180,255,0.3)',
    shadowColor: 'rgba(100,180,255,0.4)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 6,
  },
  slotGradient: {
    paddingTop: 8,
    paddingBottom: 12,
    alignItems: 'center',
    borderRadius: 18,
    minHeight: 280,
  },
  characterWrap: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lobbyPetPosition: {
    position: 'absolute',
    bottom: 0,
    right: 4,
    zIndex: 5,
  },
  emoteBubble: {
    position: 'absolute',
    top: 8,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoteBubbleEmoji: {
    fontSize: 20,
  },
  playerNameSelf: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 16,
    color: '#ffffff',
    letterSpacing: 1,
    marginTop: 4,
  },
  playerNameFriend: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  playerLevel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: colors.textSecondary,
  },
  rankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  rankPillIcon: {
    fontSize: 11,
  },
  rankPillText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  readyBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(39,174,61,0.2)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(39,174,61,0.5)',
  },
  readyText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.green,
    letterSpacing: 2,
  },
  youBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(100,180,255,0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(100,180,255,0.4)',
  },
  youBadgeText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: 'rgba(150,210,255,0.9)',
    letterSpacing: 1,
  },

  // Empty invite slot
  emptySlot: {
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  inviteCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  invitePlus: {
    fontSize: 28,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '300',
  },
  inviteText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 2,
  },

  // Bottom buttons
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    paddingVertical: 8,
  },
  emoteBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  emoteBtnGradient: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,200,50,0.3)',
  },
  emoteBtnIcon: {
    fontSize: 22,
  },
  emoteBtnLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: colors.orange,
    letterSpacing: 1,
  },
  readyBtnWrap: {
    flex: 1,
  },
  inviteBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  inviteBtnGradient: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(100,180,255,0.3)',
  },
  inviteBtnIcon: {
    fontSize: 22,
  },
  inviteBtnLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: 'rgba(150,210,255,0.9)',
    letterSpacing: 1,
  },

  // Leave button
  leaveBtn: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  leaveBtnText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: 'rgba(231,76,60,0.7)',
    letterSpacing: 2,
  },

  // Invite Menu Overlay
  inviteMenuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  inviteMenuCard: {
    width: '85%',
    maxWidth: 340,
    backgroundColor: '#141a3a',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 10,
  },
  inviteMenuTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 18,
    color: '#ffffff',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 4,
  },
  inviteMenuOption: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  inviteMenuOptionGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  inviteMenuOptionIcon: {
    fontSize: 24,
  },
  inviteMenuOptionInfo: {
    flex: 1,
  },
  inviteMenuOptionTitle: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#ffffff',
  },
  inviteMenuOptionSub: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  inviteMenuCancel: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  inviteMenuCancelText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: colors.textMuted,
    letterSpacing: 1,
  },
});
