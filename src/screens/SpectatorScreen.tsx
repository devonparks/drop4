import React, { useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Animated,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { useShopStore } from '../stores/shopStore';
import { haptics } from '../services/haptics';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Spectator'>;
};

// ── Types ────────────────────────────────────────────────────────────────────

interface LiveMatch {
  id: string;
  player1: { name: string; elo: number };
  player2: { name: string; elo: number };
  wager: number;
  moveCount: number;
  spectators: number;
  board: number[][]; // 0 = empty, 1 = red, 2 = yellow
}

// ── Mock data generator ──────────────────────────────────────────────────────

const PLAYER_NAMES = [
  'xDragon42', 'NovaBlade', 'TurboKid', 'ShadowFox',
  'IcyPhoenix', 'PixelWolf', 'CosmicAce', 'ZenMaster',
  'BlitzKing', 'NeonViper',
];

function randomBoard(): number[][] {
  const ROWS = 6;
  const COLS = 7;
  const board: number[][] = Array.from({ length: ROWS }, () =>
    Array(COLS).fill(0),
  );
  // Simulate a partially played game (8-18 moves)
  const totalMoves = 8 + Math.floor(Math.random() * 11);
  for (let m = 0; m < totalMoves; m++) {
    const col = Math.floor(Math.random() * COLS);
    // Drop piece in column — find lowest empty row
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][col] === 0) {
        board[r][col] = (m % 2) + 1; // alternate 1 and 2
        break;
      }
    }
  }
  return board;
}

function generateMockMatches(): LiveMatch[] {
  const shuffled = [...PLAYER_NAMES].sort(() => Math.random() - 0.5);
  const wagers = [10, 100, 100, 1000, 5000];

  return Array.from({ length: 5 }, (_, i) => {
    const board = randomBoard();
    const pieces = board.flat().filter(c => c !== 0).length;
    return {
      id: `match_${i}`,
      player1: {
        name: shuffled[i * 2],
        elo: 800 + Math.floor(Math.random() * 600),
      },
      player2: {
        name: shuffled[i * 2 + 1],
        elo: 800 + Math.floor(Math.random() * 600),
      },
      wager: wagers[i],
      moveCount: pieces,
      spectators: Math.floor(Math.random() * 20) + 1,
      board,
    };
  });
}

// ── Pulsing live dot ─────────────────────────────────────────────────────────

function PulsingDot() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.liveDot, { opacity }]} />
  );
}

// ── Mini board preview ───────────────────────────────────────────────────────

function MiniBoard({ board }: { board: number[][] }) {
  return (
    <View style={styles.miniBoard}>
      {board.map((row, r) => (
        <View key={r} style={styles.miniBoardRow}>
          {row.map((cell, c) => (
            <View
              key={c}
              style={[
                styles.miniCell,
                cell === 1 && styles.miniCellRed,
                cell === 2 && styles.miniCellYellow,
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

// ── Match card ───────────────────────────────────────────────────────────────

function MatchCard({
  match,
  onWatch,
}: {
  match: LiveMatch;
  onWatch: () => void;
}) {
  return (
    <View style={styles.card}>
      <LinearGradient
        colors={['rgba(255,140,0,0.06)', 'rgba(0,0,0,0)']}
        style={styles.cardGradient}
      >
        {/* Top row — players */}
        <View style={styles.playersRow}>
          <View style={styles.playerCol}>
            <Text style={styles.playerName} numberOfLines={1}>
              {match.player1.name}
            </Text>
            <Text style={styles.playerElo}>{match.player1.elo} ELO</Text>
          </View>

          <View style={styles.vsContainer}>
            <Text style={styles.vsText}>VS</Text>
          </View>

          <View style={[styles.playerCol, { alignItems: 'flex-end' }]}>
            <Text style={styles.playerName} numberOfLines={1}>
              {match.player2.name}
            </Text>
            <Text style={styles.playerElo}>{match.player2.elo} ELO</Text>
          </View>
        </View>

        {/* Middle — board + info */}
        <View style={styles.middleRow}>
          <MiniBoard board={match.board} />

          <View style={styles.matchInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>WAGER</Text>
              <Text style={styles.infoValue}>
                {'🪙 '}{match.wager.toLocaleString()}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>MOVES</Text>
              <Text style={styles.infoValueSmall}>{match.moveCount}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>WATCHING</Text>
              <Text style={styles.infoValueSmall}>
                {'👁 '}{match.spectators}
              </Text>
            </View>
          </View>
        </View>

        {/* Watch button */}
        <Pressable
          onPress={() => {
            haptics.tap();
            onWatch();
          }}
          style={styles.watchBtnWrap}
        >
          <LinearGradient
            colors={['#ffa733', '#ff8c00', '#cc7000']}
            style={styles.watchBtn}
          >
            <Text style={styles.watchBtnText}>WATCH</Text>
          </LinearGradient>
        </Pressable>
      </LinearGradient>
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export function SpectatorScreen({ navigation }: Props) {
  const { coins, gems, level } = useShopStore();
  const matches = useMemo(() => generateMockMatches(), []);

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <TopBar
          coins={coins}
          gems={gems}
          level={level}
          showBack
          onBackPress={() => navigation.goBack()}
        />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <PulsingDot />
            <Text style={styles.title}>LIVE MATCHES</Text>
          </View>
          <Text style={styles.subtitle}>
            Watch Gold Court wager matches in real time
          </Text>
        </View>

        {/* Match list */}
        <FlatList
          data={matches}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <MatchCard
              match={item}
              onWatch={() => {
                haptics.tap();
                Alert.alert(
                  'Spectator Mode',
                  `Watching ${item.player1.name} vs ${item.player2.name}\n\nFull spectator view coming in Season 1!`,
                  [{ text: 'OK' }]
                );
              }}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>{'👁'}</Text>
              <Text style={styles.emptyText}>No live matches right now</Text>
              <Text style={styles.emptySubtext}>
                Check back later to spectate Gold Court games
              </Text>
            </View>
          }
        />
      </View>
    </ScreenBackground>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.red,
    shadowColor: colors.red,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 24,
    color: '#ffffff',
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // List
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 100,
    gap: 10,
  },

  // Card
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  cardGradient: {
    padding: 14,
    borderRadius: 14,
  },

  // Players row
  playersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  playerCol: {
    flex: 1,
  },
  playerName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#ffffff',
  },
  playerElo: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  vsContainer: {
    backgroundColor: 'rgba(255,140,0,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginHorizontal: 8,
  },
  vsText: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.orange,
    letterSpacing: 1,
  },

  // Middle row
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },

  // Mini board
  miniBoard: {
    backgroundColor: colors.boardDark,
    borderRadius: 6,
    padding: 3,
    borderWidth: 1,
    borderColor: colors.boardFrame,
  },
  miniBoardRow: {
    flexDirection: 'row',
  },
  miniCell: {
    width: 8,
    height: 8,
    borderRadius: 4,
    margin: 0.5,
    backgroundColor: colors.boardHole,
  },
  miniCellRed: {
    backgroundColor: colors.pieceRed,
  },
  miniCellYellow: {
    backgroundColor: colors.pieceYellow,
  },

  // Match info
  matchInfo: {
    flex: 1,
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: colors.coinGold,
  },
  infoValueSmall: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 12,
    color: '#ffffff',
  },

  // Watch button
  watchBtnWrap: {
    alignSelf: 'stretch',
  },
  watchBtn: {
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff8c00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  watchBtnText: {
    fontFamily: fonts.body,
    fontWeight: weight.extrabold,
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 1.5,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptySubtext: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
});
