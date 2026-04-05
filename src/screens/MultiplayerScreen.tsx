import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useShopStore } from '../stores/shopStore';
import { useRankedStore, RANKED_TIERS, formatRank } from '../stores/rankedStore';
import { useOnlineStore } from '../stores/onlineStore';
import { RankProgressCard } from '../components/ui/RankProgressCard';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import { borderRadius } from '../theme/spacing';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Multiplayer'>;
};

// --- Searching Overlay ---

function SearchingOverlay({ navigation }: { navigation: Props['navigation'] }) {
  const {
    isSearching,
    queueMode,
    searchDuration,
    isInMatch,
    matchId,
    opponentName,
    myPlayerNum,
    stopSearching,
    tickSearchTimer,
    clearMatch,
  } = useOnlineStore();

  const rankedElo = useRankedStore(s => s.elo);
  const rankedTier = useRankedStore(s => s.tier);
  const rankedTierInfo = useMemo(() => RANKED_TIERS.find(t => t.id === rankedTier) || RANKED_TIERS[0], [rankedTier]);

  // Tick the search timer every second
  useEffect(() => {
    if (!isSearching) return;
    const interval = setInterval(tickSearchTimer, 1000);
    return () => clearInterval(interval);
  }, [isSearching, tickSearchTimer]);

  // When a match is found, navigate to Game
  useEffect(() => {
    if (isInMatch && matchId && myPlayerNum) {
      const isRanked = queueMode === 'ranked';
      clearMatch();
      navigation.navigate('Game', {
        onlineMatchId: matchId,
        onlinePlayerNum: myPlayerNum,
        onlineOpponentName: opponentName ?? 'Opponent',
        rankedMode: isRanked,
        rankedClockSeconds: isRanked ? 180 : undefined,
      });
    }
  }, [isInMatch, matchId, myPlayerNum, queueMode, opponentName, clearMatch, navigation]);

  const minutes = Math.floor(searchDuration / 60);
  const seconds = searchDuration % 60;
  const timerText = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  if (!isSearching) return null;

  return (
    <Modal transparent animationType="fade" visible={isSearching}>
      <View style={overlayStyles.backdrop}>
        <View style={overlayStyles.card}>
          {/* Pulsing globe icon */}
          <Text style={overlayStyles.globe}>🌐</Text>

          {/* Title */}
          <AnimatedDotsText />

          {/* Timer */}
          <Text style={overlayStyles.timer}>{timerText}</Text>

          {/* Mode badge */}
          <View
            style={[
              overlayStyles.modeBadge,
              { backgroundColor: queueMode === 'ranked' ? colors.purple : colors.green },
            ]}
          >
            <Text style={overlayStyles.modeBadgeText}>
              {queueMode === 'ranked' ? '🏆 RANKED' : '🎮 CASUAL'}
            </Text>
          </View>

          {/* ELO display for ranked */}
          {queueMode === 'ranked' && (
            <View style={overlayStyles.eloRow}>
              <Text style={overlayStyles.eloLabel}>Your Rating</Text>
              <Text style={overlayStyles.eloValue}>{rankedElo}</Text>
              <Text style={overlayStyles.tierText}>
                {rankedTierInfo.icon} {rankedTierInfo.name}
              </Text>
            </View>
          )}

          {/* Cancel button */}
          <TouchableOpacity style={overlayStyles.cancelBtn} onPress={stopSearching}>
            <Text style={overlayStyles.cancelText}>CANCEL</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Separate component for animated dots so it re-renders smoothly
function AnimatedDotsText() {
  const [dots, setDots] = React.useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <Text style={overlayStyles.searchingText}>
      Searching for opponent{dots}
    </Text>
  );
}

// --- Main Screen ---

export function MultiplayerScreen({ navigation }: Props) {
  const coins = useShopStore(s => s.coins);
  const gems = useShopStore(s => s.gems);
  const level = useShopStore(s => s.level);
  const elo = useRankedStore(s => s.elo);
  const tier = useRankedStore(s => s.tier);
  const tierInfo = useMemo(() => RANKED_TIERS.find(t => t.id === tier) || RANKED_TIERS[0], [tier]);
  const { startSearching, isSearching } = useOnlineStore();

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <TopBar coins={coins} gems={gems} level={level} showBack onBackPress={() => navigation.goBack()} />

        <View style={styles.mainContent}>
          <Text style={styles.title}>MULTIPLAYER</Text>

          {/* Full rank progress card */}
          <RankProgressCard />

          {/* Online PvP */}
          <Text style={styles.sectionLabel}>PLAY ONLINE</Text>

          <View style={styles.buttonsWrap}>
            {/* Quick Match — casual online, no stakes */}
            <GlossyButton
              label="QUICK MATCH"
              subtitle="Find an opponent • No stakes"
              variant="green"
              icon="🌐"
              onPress={() => startSearching('casual')}
            />

            {/* Ranked — ELO rating, chess clock */}
            <GlossyButton
              label="RANKED"
              subtitle={`Chess clock • ${tierInfo.icon} ${formatRank(elo)} (${elo} MMR)`}
              variant="purple"
              icon="🏆"
              onPress={() => startSearching('ranked')}
            />

            {/* Gold Court — wager coins online */}
            <GlossyButton
              label="GOLD COURT"
              subtitle="Wager coins • High stakes"
              variant="gold"
              icon="👑"
              onPress={() => navigation.navigate('Stage')}
            />
          </View>

          {/* Local play */}
          <Text style={styles.sectionLabel}>LOCAL</Text>

          <View style={styles.buttonsWrap}>
            {/* Pass & Play — two players on same device */}
            <GlossyButton
              label="PASS & PLAY"
              subtitle="Two players, one device"
              variant="teal"
              icon="🎮"
              onPress={() => navigation.navigate('LocalPlay')}
            />

            {/* Tournament — local bracket */}
            <GlossyButton
              label="TOURNAMENT"
              subtitle="4-8 Player Bracket"
              variant="red"
              icon="🏟"
              onPress={() => navigation.navigate('Tournament')}
            />
          </View>
        </View>
      </View>

      {/* Searching overlay (portal-style modal) */}
      <SearchingOverlay navigation={navigation} />
    </ScreenBackground>
  );
}

// --- Overlay Styles ---

const overlayStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xxl,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 32,
    paddingVertical: 28,
    alignItems: 'center',
    width: 300,
    gap: 12,
  },
  globe: {
    fontSize: 48,
    marginBottom: 4,
  },
  searchingText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 18,
    color: colors.textPrimary,
    textAlign: 'center',
    minWidth: 220,
  },
  timer: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 32,
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  modeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: borderRadius.round,
  },
  modeBadgeText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: '#ffffff',
    letterSpacing: 1,
  },
  eloRow: {
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  eloLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  eloValue: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 28,
    color: colors.textPrimary,
  },
  tierText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  cancelBtn: {
    marginTop: 8,
    backgroundColor: colors.red,
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
  },
  cancelText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 2,
  },
});

// --- Main Styles ---

const styles = StyleSheet.create({
  container: { flex: 1 },
  mainContent: { flex: 1, alignItems: 'center', paddingHorizontal: 20, gap: 8 },
  title: {
    fontFamily: fonts.heading, fontWeight: weight.bold,
    fontSize: 26, color: '#ffffff', letterSpacing: 2, marginTop: 4,
  },
  rankedCard: { width: '100%', maxWidth: 340, borderRadius: 14, overflow: 'hidden' },
  rankedGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  rankedIcon: { fontSize: 28 },
  rankedTier: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 15 },
  rankedElo: { fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 10, color: colors.textSecondary, marginTop: 1 },
  rankedStats: { alignItems: 'flex-end', gap: 3 },
  rankedWL: { fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 11, color: colors.textSecondary },
  rankedBar: { width: 60, height: 5, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  rankedFill: { height: '100%', borderRadius: 3 },
  sectionLabel: {
    fontFamily: fonts.body, fontWeight: weight.bold,
    fontSize: 10, color: colors.textSecondary, letterSpacing: 2,
    alignSelf: 'flex-start', marginLeft: 10, marginTop: 4,
  },
  buttonsWrap: { width: '100%', maxWidth: 340, gap: 6 },
});
