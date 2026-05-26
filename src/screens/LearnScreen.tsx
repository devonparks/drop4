import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { StaggeredEntry, PressScale } from '../components/animations';
import { useShopStore } from '../stores/shopStore';
import { useGameStore } from '../stores/gameStore';
import { useTutorialStore } from '../stores/tutorialStore';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Learn'>;
};

interface Lesson {
  id: string;
  title: string;
  description: string;
  icon: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tips: string[];
}

const LESSONS: Lesson[] = [
  {
    id: 'basics', title: 'The Basics', description: 'How to play Connect 4', icon: '📖',
    difficulty: 'beginner',
    tips: [
      'Drop pieces into any column by tapping it',
      'Connect 4 pieces in a row to win — horizontally, vertically, or diagonally',
      'You are RED, your opponent is YELLOW',
      'Take turns dropping one piece at a time',
    ],
  },
  {
    id: 'center', title: 'Control the Center', description: 'The center column is the most powerful', icon: '🎯',
    difficulty: 'beginner',
    tips: [
      'The center column connects to the most winning combinations',
      'Always try to claim the center column early',
      'A piece in the center can be part of horizontal, vertical, AND diagonal wins',
      'If your opponent takes center, try the columns next to it',
    ],
  },
  {
    id: 'blocking', title: 'Blocking', description: 'Read and stop your opponent', icon: '🛡',
    difficulty: 'beginner',
    tips: [
      'Always check if your opponent has 3 in a row before your move',
      'Count pieces in every direction: horizontal, vertical, diagonal',
      'If they have 3 connected with an open end, BLOCK immediately',
      'A forced block is not wasted — it keeps you alive',
    ],
  },
  {
    id: 'traps', title: 'Setting Traps', description: 'Create two-way win conditions', icon: '🪤',
    difficulty: 'intermediate',
    tips: [
      'A trap is when you have TWO ways to win and opponent can only block ONE',
      'Build pieces in L-shape or T-shape to create multiple threats',
      'The key is having two lines of 3 that share a common empty space',
      'Force your opponent to block one threat while the other becomes unblockable',
    ],
  },
  {
    id: 'vertical', title: 'Vertical Strategy', description: 'Stack smart — height matters', icon: '📐',
    difficulty: 'intermediate',
    tips: [
      'Stacking 3 pieces vertically forces a block, giving you tempo',
      'Odd rows (1st, 3rd, 5th from bottom) favor the first player',
      'Even rows favor the second player — use this to your advantage',
      'Never stack 3 high if your opponent can easily block the top',
    ],
  },
  {
    id: 'double', title: 'Double Traps', description: 'The unbeatable setup', icon: '⚡',
    difficulty: 'advanced',
    tips: [
      'A double trap has THREE connected with open spaces on BOTH ends',
      'The opponent can only block one end — you win on the other',
      'Set this up by building two separate 3-in-a-rows simultaneously',
      'This is the mark of a master player — guaranteed win',
    ],
  },
  {
    id: 'diagonal', title: 'Diagonal Mastery', description: 'The hardest threats to spot', icon: '↗',
    difficulty: 'intermediate',
    tips: [
      'Diagonal threats are harder for opponents to see than horizontal ones',
      'Build diagonals by stacking toward the center from both sides',
      'A diagonal 3-in-a-row is easy to miss — use it to your advantage',
      'Combine a diagonal threat with a horizontal one to create unblockable traps',
    ],
  },
  {
    id: 'go_second', title: 'Going Second', description: 'How to play from behind', icon: '↩',
    difficulty: 'advanced',
    tips: [
      'The first player has a natural advantage — you need to be more precise',
      'Mirror your opponent\'s opening moves to neutralize their tempo',
      'Focus on even-numbered rows (2nd, 4th, 6th from bottom) — these favor player 2',
      'Force trades early to reach a balanced mid-game where your skill matters more',
    ],
  },
  {
    id: 'speed', title: 'Speed Play', description: 'Win under pressure', icon: '⏱',
    difficulty: 'intermediate',
    tips: [
      'Pre-plan your next TWO moves while your opponent is thinking',
      'Stick to simple strategies under time pressure — center control wins',
      'Don\'t try fancy traps when the clock is ticking — play the obvious best move',
      'If unsure, drop in the center column. It\'s almost never wrong.',
    ],
  },
  {
    id: 'obstacles', title: 'Obstacle Levels', description: 'Play around the walls', icon: '🧱',
    difficulty: 'advanced',
    tips: [
      'Walls block columns — you can\'t drop pieces through them',
      'Use walls as anchors for your connections — they can\'t be displaced',
      'Walls can trap your opponent into bad positions if you plan around them',
      'Always count available columns before committing to a strategy',
    ],
  },
  {
    id: 'bomb', title: 'Bomb Power Piece', description: 'Clear a column to disrupt the board', icon: '💣',
    difficulty: 'intermediate',
    tips: [
      'The Bomb clears an entire column — use it to remove an opponent\'s stack',
      'Save your Bomb for when the opponent has a strong vertical setup',
      'Bombing the center column is rarely smart — it helps both players equally',
      'You only get ONE Bomb per career match — timing is everything',
    ],
  },
  {
    id: 'rainbow', title: 'Rainbow Power Piece', description: 'A wild piece that counts as both colors', icon: '🌈',
    difficulty: 'intermediate',
    tips: [
      'The Rainbow piece counts for BOTH players — choose placement carefully',
      'Use it to complete YOUR connection while blocking theirs simultaneously',
      'Rainbow is strongest when it connects two separate threats at once',
      'Don\'t waste it early — save it for when you can finish a line',
    ],
  },
  {
    id: 'heavy', title: 'Heavy Power Piece', description: 'Push down to crush pieces below', icon: '🪨',
    difficulty: 'advanced',
    tips: [
      'The Heavy piece pushes existing pieces down, changing the board layout',
      'Use it to break an opponent\'s connection by shifting their pieces',
      'Heavy can create openings below by compressing a column',
      'Best used on columns where the opponent has built tall stacks',
    ],
  },
  {
    id: 'bosses', title: 'Boss Battles', description: 'Beat Tommy, Sal, and the Warden', icon: '👑',
    difficulty: 'advanced',
    tips: [
      'Each boss has a unique rule — read the matchup badge carefully before starting',
      'Tommy\'s column parity rule limits which columns you can use — plan 2 moves ahead',
      'Sal flips gravity every 4 moves — build from top AND bottom',
      'The Warden seeds threat pieces — block them early or they snowball',
    ],
  },
];

const DIFF_COLORS: Record<string, string> = {
  beginner: colors.green, intermediate: colors.orange, advanced: colors.red,
};

export function LearnScreen({ navigation }: Props) {
  const coins = useShopStore(s => s.coins);
  const gems = useShopStore(s => s.gems);
  const level = useShopStore(s => s.level);
  const newGame = useGameStore(s => s.newGame);
  const resetScores = useGameStore(s => s.resetScores);
  const markLessonViewed = useTutorialStore(s => s.markLessonViewed);
  const hasViewedLesson = useTutorialStore(s => s.hasViewedLesson);
  const [selected, setSelected] = useState<Lesson | null>(null);

  if (selected) {
    return (
      <ScreenBackground>
        <View style={styles.container}>
          <TopBar coins={coins} gems={gems} level={level}
            showBack onBackPress={() => {
              markLessonViewed(selected.id);
              setSelected(null);
            }} />

          <ScrollView contentContainerStyle={styles.lessonDetail}>
            <Text style={styles.lessonIcon}>{selected.icon}</Text>
            <Text style={styles.lessonTitle} accessibilityRole="header">{selected.title}</Text>
            <Text style={[styles.diffLabel, { color: DIFF_COLORS[selected.difficulty] }]}>
              {selected.difficulty.toUpperCase()}
            </Text>

            <View style={styles.tipsList}>
              {selected.tips.map((tip, i) => (
                <View key={i} style={styles.tipCard}>
                  <LinearGradient
                    colors={['rgba(255,140,0,0.1)', 'rgba(255,140,0,0.03)']}
                    style={styles.tipNum}
                  >
                    <Text style={styles.tipNumText}>{i + 1}</Text>
                  </LinearGradient>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>

            <GlossyButton
              label="PRACTICE NOW"
              variant="green"
              iconRight="▶"
              onPress={() => {
                markLessonViewed(selected.id);
                const diff = selected.difficulty === 'beginner' ? 'easy'
                  : selected.difficulty === 'intermediate' ? 'medium' : 'hard';
                resetScores();
                newGame(diff as any, true);
                navigation.navigate('Game');
              }}
            />
          </ScrollView>
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <TopBar coins={coins} gems={gems} level={level}
          showBack onBackPress={() => navigation.goBack()} />

        <View style={styles.headerRow}>
          <Text style={styles.headerIcon}>{'\uD83D\uDCD6'}</Text>
          <Text style={styles.title} accessibilityRole="header">STRATEGY GUIDE</Text>
        </View>
        <Text style={styles.subtitle}>Master every technique</Text>

        <ScrollView contentContainerStyle={styles.lessonList} showsVerticalScrollIndicator={false}>
          {LESSONS.map((lesson, i) => {
            const isMastered = hasViewedLesson(lesson.id);
            return (
              <StaggeredEntry key={lesson.id} index={i}>
              <PressScale
                onPress={() => { haptics.tap(); playSound('click'); setSelected(lesson); }}
                scaleTo={0.97}
                accessibilityRole="button"
                accessibilityLabel={`${lesson.title} lesson, ${lesson.difficulty}${isMastered ? ', mastered' : ''}`}
                accessibilityHint="Opens lesson details and practice option"
              >
              <View style={styles.lessonCard}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
                  style={styles.lessonGradient}
                >
                  {/* Colored left accent bar */}
                  <View style={[styles.accentBar, { backgroundColor: DIFF_COLORS[lesson.difficulty] }]} />
                  <Text style={styles.cardIcon}>{lesson.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{lesson.title}</Text>
                    <Text style={styles.cardDesc}>{lesson.description}</Text>
                    <Text style={[styles.practiceSubtitle, { color: DIFF_COLORS[lesson.difficulty] }]}>
                      PRACTICE NOW {'\u25B6'}
                    </Text>
                  </View>
                  <View style={styles.cardRight}>
                    <View style={[styles.diffBadge, { backgroundColor: `${DIFF_COLORS[lesson.difficulty]}20` }]}>
                      <Text style={styles.diffBadgeText}>
                        {lesson.difficulty === 'beginner' ? '\u2B50' : lesson.difficulty === 'intermediate' ? '\u2B50\u2B50' : '\u2B50\u2B50\u2B50'}
                      </Text>
                      <Text style={[styles.diffBadgeLabel, { color: DIFF_COLORS[lesson.difficulty] }]}>
                        {lesson.difficulty.toUpperCase()}
                      </Text>
                    </View>
                    {isMastered && (
                      <View style={styles.masteredBadge}>
                        <Text style={styles.masteredText}>{'\u2713'} MASTERED</Text>
                      </View>
                    )}
                  </View>
                </LinearGradient>
              </View>
              </PressScale>
              </StaggeredEntry>
            );
          })}
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  headerIcon: {
    fontSize: 24,
  },
  title: {
    fontFamily: fonts.heading, fontWeight: weight.bold,
    fontSize: 26, color: '#ffffff', letterSpacing: 2, textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.body, fontWeight: weight.regular,
    fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 10,
  },
  lessonList: { paddingHorizontal: 14, gap: 8, paddingBottom: 100 },
  lessonCard: { borderRadius: 14, overflow: 'hidden' },
  lessonGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  accentBar: {
    width: 4,
    borderRadius: 2,
    alignSelf: 'stretch',
    marginRight: 2,
  },
  cardIcon: { fontSize: 30 },
  cardTitle: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 15, color: '#ffffff' },
  cardDesc: { fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 10, color: colors.textSecondary, marginTop: 1 },
  practiceSubtitle: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 9,
    letterSpacing: 0.5, marginTop: 4,
  },
  cardRight: {
    alignItems: 'center',
    gap: 6,
  },
  diffBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center' as const },
  diffBadgeText: { fontSize: 16 },
  diffBadgeLabel: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 8, letterSpacing: 0.5, marginTop: 1 },
  masteredBadge: {
    backgroundColor: 'rgba(39,174,61,0.2)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(39,174,61,0.4)',
  },
  masteredText: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 8,
    color: colors.green, letterSpacing: 0.5,
  },
  // Detail
  lessonDetail: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 40, gap: 6 },
  lessonIcon: { fontSize: 48, marginTop: 8 },
  lessonTitle: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 24, color: '#ffffff' },
  diffLabel: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 10, letterSpacing: 1 },
  tipsList: { width: '100%', gap: 8, marginVertical: 12 },
  tipCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  tipNum: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  tipNumText: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 13, color: colors.orange },
  tipText: {
    fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 13,
    color: 'rgba(255,255,255,0.8)', lineHeight: 19, flex: 1,
  },
});
