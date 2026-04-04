import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { GlossyButton } from './GlossyButton';
import { CharacterAvatar } from './CharacterAvatar';
import { useRankedStore, calculateOdds, RANKED_TIERS } from '../../stores/rankedStore';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

interface MatchmakingOverlayProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  opponentName?: string;
  opponentElo?: number;
}

export function MatchmakingOverlay({ visible, onAccept, onDecline, opponentName, opponentElo }: MatchmakingOverlayProps) {
  const [searching, setSearching] = useState(true);
  const [dots, setDots] = useState('');
  const playerElo = useRankedStore(s => s.elo);
  const playerTier = useRankedStore(s => s.getTier());

  // Simulate search animation
  useEffect(() => {
    if (!visible) return;
    setSearching(true);

    const dotTimer = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    // "Find" opponent after 2 seconds
    const findTimer = setTimeout(() => {
      setSearching(false);
    }, 2000);

    return () => { clearInterval(dotTimer); clearTimeout(findTimer); };
  }, [visible]);

  if (!visible) return null;

  const oppElo = opponentElo || Math.round(playerElo + (Math.random() - 0.3) * 400);
  const oppName = opponentName || 'Opponent';
  const oppTier = RANKED_TIERS.find(t => oppElo >= t.minElo) || RANKED_TIERS[0];
  const odds = calculateOdds(playerElo, oppElo);

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.overlay}>
        <Animated.View entering={SlideInDown.springify().damping(12)} style={styles.card}>
          {searching ? (
            <View style={styles.searchingArea}>
              <Text style={styles.searchIcon}>🔍</Text>
              <Text style={styles.searchText}>Finding opponent{dots}</Text>
              <Text style={styles.searchSub}>Matching near your skill level</Text>
            </View>
          ) : (
            <>
              <Text style={styles.foundTitle}>OPPONENT FOUND</Text>

              {/* VS display */}
              <View style={styles.vsRow}>
                {/* Player */}
                <View style={styles.playerCol}>
                  <CharacterAvatar size="medium" variant="player" />
                  <Text style={styles.vsName}>You</Text>
                  <Text style={[styles.vsTier, { color: playerTier.color }]}>{playerTier.icon} {playerElo}</Text>
                  <Text style={[styles.oddsText, odds.playerOdds.startsWith('+') ? { color: colors.green } : { color: colors.red }]}>
                    {odds.playerOdds}
                  </Text>
                </View>

                <Text style={styles.vsLabel}>VS</Text>

                {/* Opponent */}
                <View style={styles.playerCol}>
                  <CharacterAvatar size="medium" variant="bot_hard" />
                  <Text style={styles.vsName}>{oppName}</Text>
                  <Text style={[styles.vsTier, { color: oppTier.color }]}>{oppTier.icon} {oppElo}</Text>
                  <Text style={[styles.oddsText, odds.opponentOdds.startsWith('+') ? { color: colors.green } : { color: colors.red }]}>
                    {odds.opponentOdds}
                  </Text>
                </View>
              </View>

              {/* Odds info */}
              {odds.coinMultiplier > 1.2 && (
                <View style={styles.underdogBanner}>
                  <Text style={styles.underdogText}>
                    ⚡ UNDERDOG BONUS: {odds.coinMultiplier.toFixed(1)}x coins if you win!
                  </Text>
                </View>
              )}

              <View style={styles.buttons}>
                <GlossyButton label="ACCEPT" variant="green" small onPress={onAccept} style={{ flex: 1 }} />
                <GlossyButton label="DECLINE" variant="navy" small onPress={onDecline} style={{ flex: 1 }} />
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  card: {
    width: '85%', maxWidth: 340, backgroundColor: colors.surface,
    borderRadius: 20, padding: 20, alignItems: 'center',
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  searchingArea: { alignItems: 'center', paddingVertical: 20 },
  searchIcon: { fontSize: 40, marginBottom: 12 },
  searchText: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 18, color: '#ffffff' },
  searchSub: { fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  foundTitle: {
    fontFamily: fonts.heading, fontWeight: weight.bold,
    fontSize: 16, color: colors.orange, letterSpacing: 2, marginBottom: 12,
  },
  vsRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  playerCol: { alignItems: 'center', flex: 1, gap: 4 },
  vsName: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 13, color: '#ffffff' },
  vsTier: { fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 11 },
  vsLabel: {
    fontFamily: fonts.heading, fontWeight: weight.bold,
    fontSize: 20, color: colors.textSecondary,
  },
  oddsText: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 16,
  },
  underdogBanner: {
    backgroundColor: 'rgba(39,174,61,0.1)', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 6, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(39,174,61,0.2)',
  },
  underdogText: {
    fontFamily: fonts.body, fontWeight: weight.semibold,
    fontSize: 11, color: colors.green, textAlign: 'center',
  },
  buttons: { flexDirection: 'row', gap: 8, width: '100%' },
});
