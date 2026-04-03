import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
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
  completed: boolean;
  tips: string[];
}

const LESSONS: Lesson[] = [
  {
    id: 'basics',
    title: 'The Basics',
    description: 'How to play Connect 4',
    icon: '📖',
    difficulty: 'beginner',
    completed: false,
    tips: [
      'Drop pieces into any column by tapping it',
      'Connect 4 pieces in a row to win — horizontally, vertically, or diagonally',
      'You are RED, your opponent is YELLOW',
      'Take turns dropping one piece at a time',
    ],
  },
  {
    id: 'center',
    title: 'Control the Center',
    description: 'The center column is the most powerful position',
    icon: '🎯',
    difficulty: 'beginner',
    completed: false,
    tips: [
      'The center column connects to the most winning combinations',
      'Always try to claim the center column early in the game',
      'A piece in the center can be part of horizontal, vertical, AND diagonal wins',
      'If your opponent takes center, try to take the columns next to it',
    ],
  },
  {
    id: 'blocking',
    title: 'Blocking',
    description: 'Learn to read and stop your opponent',
    icon: '🛡',
    difficulty: 'beginner',
    completed: false,
    tips: [
      'Always check if your opponent has 3 in a row before making your move',
      'Count your opponent\'s pieces in every direction: horizontal, vertical, diagonal',
      'If they have 3 connected with an open end, you MUST block immediately',
      'A forced block is not a wasted move — it keeps you alive',
    ],
  },
  {
    id: 'traps',
    title: 'Setting Traps',
    description: 'Create two-way win conditions',
    icon: '🪤',
    difficulty: 'intermediate',
    completed: false,
    tips: [
      'A trap is when you have TWO ways to win and your opponent can only block ONE',
      'Build pieces in an L-shape or T-shape to create multiple threats',
      'The key is having two separate lines of 3 that share a common empty space',
      'Force your opponent to block one threat while the other becomes unblockable',
    ],
  },
  {
    id: 'vertical',
    title: 'Vertical Strategy',
    description: 'Stack smart — height matters',
    icon: '📐',
    difficulty: 'intermediate',
    completed: false,
    tips: [
      'Stacking 3 pieces vertically forces a block, giving you tempo control',
      'Odd rows (1st, 3rd, 5th from bottom) favor the first player',
      'Even rows favor the second player — use this to your advantage',
      'Never stack 3 high if your opponent can easily block the top',
    ],
  },
  {
    id: 'advanced_traps',
    title: 'Double Traps',
    description: 'The unbeatable setup',
    icon: '⚡',
    difficulty: 'advanced',
    completed: false,
    tips: [
      'A double trap has THREE connected with open spaces on BOTH ends',
      'The opponent can only block one end — you win on the other',
      'Set this up by building two separate 3-in-a-rows simultaneously',
      'This is the mark of a master player — if you can set this up, you win',
    ],
  },
];

const difficultyColors: Record<string, string> = {
  beginner: colors.green,
  intermediate: colors.orange,
  advanced: colors.red,
};

export function LearnScreen({ navigation }: Props) {
  const { coins, gems, level } = useShopStore();
  const newGame = useGameStore(s => s.newGame);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  const handlePractice = (lesson: Lesson) => {
    const diff = lesson.difficulty === 'beginner' ? 'easy' : lesson.difficulty === 'intermediate' ? 'medium' : 'hard';
    newGame(diff as any, true);
    navigation.navigate('Game');
  };

  if (selectedLesson) {
    return (
      <ScreenBackground>
        <View style={styles.container}>
          <TopBar
            coins={coins}
            gems={gems}
            level={level}
            showBack
            onBackPress={() => setSelectedLesson(null)}
          />

          <ScrollView contentContainerStyle={styles.lessonContent}>
            <Text style={styles.lessonIcon}>{selectedLesson.icon}</Text>
            <Text style={styles.lessonTitle}>{selectedLesson.title}</Text>
            <Text style={[styles.diffBadgeText, { color: difficultyColors[selectedLesson.difficulty] }]}>
              {selectedLesson.difficulty.toUpperCase()}
            </Text>

            <View style={styles.tipsList}>
              {selectedLesson.tips.map((tip, i) => (
                <View key={i} style={styles.tipCard}>
                  <View style={styles.tipNumber}>
                    <Text style={styles.tipNumText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>

            <GlossyButton
              label="PRACTICE NOW"
              variant="green"
              iconRight="▶"
              onPress={() => handlePractice(selectedLesson)}
            />
          </ScrollView>
        </View>
      </ScreenBackground>
    );
  }

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

        <View style={styles.header}>
          <Text style={styles.title}>LEARN</Text>
          <Text style={styles.subtitle}>Master the game</Text>
        </View>

        <ScrollView contentContainerStyle={styles.lessonList} showsVerticalScrollIndicator={false}>
          {LESSONS.map((lesson, i) => (
            <Pressable
              key={lesson.id}
              onPress={() => { haptics.tap(); setSelectedLesson(lesson); }}
              style={styles.lessonCard}
            >
              <Text style={styles.cardIcon}>{lesson.icon}</Text>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{lesson.title}</Text>
                <Text style={styles.cardDesc}>{lesson.description}</Text>
              </View>
              <View style={[styles.diffBadge, { backgroundColor: `${difficultyColors[lesson.difficulty]}20` }]}>
                <Text style={[styles.diffText, { color: difficultyColors[lesson.difficulty] }]}>
                  {lesson.difficulty === 'beginner' ? '⭐' : lesson.difficulty === 'intermediate' ? '⭐⭐' : '⭐⭐⭐'}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 28,
    color: '#ffffff',
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  lessonList: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 100,
  },
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardIcon: {
    fontSize: 28,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 15,
    color: '#ffffff',
  },
  cardDesc: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  diffBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  diffText: {
    fontSize: 12,
  },
  diffBadgeText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    letterSpacing: 1,
    marginTop: 4,
  },
  // Lesson detail view
  lessonContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 8,
  },
  lessonIcon: {
    fontSize: 48,
    marginTop: 8,
  },
  lessonTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 24,
    color: '#ffffff',
  },
  tipsList: {
    width: '100%',
    gap: 8,
    marginVertical: 12,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  tipNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,140,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  tipNumText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: colors.orange,
  },
  tipText: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 20,
    flex: 1,
  },
});
