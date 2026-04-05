import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { AnimatedCharacter, useEmoteTrigger, EmoteId } from '../components/ui/AnimatedCharacter';
import { FortniteEmoteWheel } from '../components/ui/FortniteEmoteWheel';
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
const SLOT_WIDTH = SCREEN_WIDTH * 0.42;

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
  const equippedEmotes = useShopStore(s => s.equippedEmotes) as EmoteId[];

  const [roomCode] = useState(generateRoomCode);
  const [isReady, setIsReady] = useState(false);
  const [emoteWheelOpen, setEmoteWheelOpen] = useState(false);

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
    },
    {
      name: 'JamieConnect',
      level: 12,
      rankTier: RANKED_TIERS.find(t => t.id === 'gold')!,
      ready: false,
      emote: null,
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

  const handleInvite = () => {
    haptics.tap();
    playSound('click');
    // Placeholder — would open friend invite modal
  };

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
          <View style={styles.roomCodeContainer}>
            <Text style={styles.roomCodeLabel}>ROOM:</Text>
            <Text style={styles.roomCode}>{roomCode}</Text>
          </View>
        </View>

        {/* Spectator info */}
        <View style={styles.spectatorBar}>
          <View style={styles.spectatorBadge}>
            <Text style={styles.spectatorIcon}>{'👁'}</Text>
            <Text style={styles.spectatorText}>SPECTATING</Text>
          </View>
          <Text style={styles.spectatorSub}>Your friends will watch your match</Text>
        </View>

        {/* Character slots — horizontal scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.slotsContainer}
          snapToInterval={SLOT_WIDTH + 12}
          decelerationRate="fast"
        >
          {/* Slot 1 — YOU */}
          <View style={[styles.playerSlot, styles.playerSlotSelf]}>
            <LinearGradient
              colors={['rgba(100,180,255,0.12)', 'rgba(60,100,200,0.04)']}
              style={styles.slotGradient}
            >
              {/* Character */}
              <View style={styles.characterWrap}>
                <AnimatedCharacter
                  size={180}
                  emote={myEmote}
                  onEmoteComplete={clearMyEmote}
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

              {/* YOU badge */}
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText}>YOU</Text>
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
                  <AnimatedCharacter
                    size={180}
                    emote={bot.emote || undefined}
                    onEmoteComplete={() => {
                      setBots(prev =>
                        prev.map((b, i) => i === index ? { ...b, emote: null } : b)
                      );
                    }}
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
          <Pressable onPress={handleInvite} style={styles.playerSlot}>
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

          {/* Ready button */}
          <View style={styles.readyBtnWrap}>
            <GlossyButton
              label={isReady ? 'UNREADY' : 'READY'}
              variant={isReady ? 'purple' : 'green'}
              iconRight={isReady ? '✕' : '✓'}
              onPress={handleReady}
            />
          </View>

          {/* Invite button */}
          <Pressable onPress={handleInvite} style={styles.inviteBtn}>
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
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 28,
    color: '#ffffff',
    letterSpacing: 4,
    textShadowColor: 'rgba(100,180,255,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  roomCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  roomCodeLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 12,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  roomCode: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 20,
    color: colors.orange,
    letterSpacing: 4,
  },

  // Spectator bar
  spectatorBar: {
    alignItems: 'center',
    paddingVertical: 6,
    gap: 2,
  },
  spectatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(155,89,182,0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(155,89,182,0.3)',
  },
  spectatorIcon: {
    fontSize: 14,
  },
  spectatorText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: colors.purple,
    letterSpacing: 1.5,
  },
  spectatorSub: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 10,
    color: 'rgba(155,89,182,0.6)',
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
});
