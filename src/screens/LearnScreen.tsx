import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useShopStore } from '../stores/shopStore';
import { useGameStore } from '../stores/gameStore';
import { haptics } from '../services/haptics';
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
];

const DIFF_COLORS: Record<string, string> = {
  beginner: colors.green, intermediate: colors.orange, advanced: colors.red,
};

export function LearnScreen({ navigation }: Props) {
  const coins = useShopStore(s => s.coins);
  const gems = useShopStore(s => s.gems);
  const level = useShopStore(s => s.level);
  const newGame = useGameStore(s => s.newGame);
  const [selected, setSelected] = useState<Lesson | null>(null);

  if (selected) {
    return (
      <ScreenBackground>
        <View style={styles.container}>
          <TopBar coins={coins} gems={gems} level={level}
            showBack onBackPress={() => setSelected(null)} />

          <ScrollView contentContainerStyle={styles.lessonDetail}>
            <Text style={styles.lessonIcon}>{selected.icon}</Text>
            <Text style={styles.lessonTitle}>{selected.title}</Text>
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
                const diff = selected.difficulty === 'beginner' ? 'easy'
                  : selected.difficulty === 'intermediate' ? 'medium' : 'hard';
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

        <Text style={styles.title}>LEARN</Text>
        <Text style={styles.subtitle}>Master the game</Text>

        <ScrollView contentContainerStyle={styles.lessonList} showsVerticalScrollIndicator={false}>
          {LESSONS.map(lesson => (
            <Pressable
              key={lesson.id}
              onPress={() => { haptics.tap(); setSelected(lesson); }}
              style={styles.lessonCard}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
                style={styles.lessonGradient}
              >
                <Text style={styles.cardIcon}>{lesson.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{lesson.title}</Text>
                  <Text style={styles.cardDesc}>{lesson.description}</Text>
                </View>
                <View style={[styles.diffBadge, { backgroundColor: `${DIFF_COLORS[lesson.difficulty]}20` }]}>
                  <Text style={[styles.diffBadgeText, { color: DIFF_COLORS[lesson.difficulty] }]}>
                    {lesson.difficulty === 'beginner' ? '⭐' : lesson.difficulty === 'intermediate' ? '⭐⭐' : '⭐⭐⭐'}
                  </Text>
                  <Text style={[styles.diffBadgeLabel, { color: DIFF_COLORS[lesson.difficulty] }]}>
                    {lesson.difficulty.toUpperCase()}
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    fontFamily: fonts.heading, fontWeight: weight.bold,
    fontSize: 26, color: '#ffffff', letterSpacing: 2, textAlign: 'center', marginTop: 4,
  },
  subtitle: {
    fontFamily: fonts.body, fontWeight: weight.regular,
    fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 10,
  },
  lessonList: { paddingHorizontal: 14, gap: 6, paddingBottom: 100 },
  lessonCard: { borderRadius: 14, overflow: 'hidden' },
  lessonGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14,
    borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  cardIcon: { fontSize: 28 },
  cardTitle: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 14, color: '#ffffff' },
  cardDesc: { fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 10, color: colors.textSecondary, marginTop: 1 },
  diffBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center' as const },
  diffBadgeText: { fontSize: 12 },
  diffBadgeLabel: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 8, letterSpacing: 0.5, marginTop: 1 },
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
