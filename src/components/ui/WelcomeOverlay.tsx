import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { SlideInDown, FadeIn, ZoomIn } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlossyButton } from './GlossyButton';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

// Card width: bounded by min(88vw, 360). Pages inside use this same width
// so each occupies a full page in the paged ScrollView.
const CARD_WIDTH = Math.min(Dimensions.get('window').width * 0.88, 360);

// ═══════════════════════════════════════════════════════════════════════
// WelcomeOverlay — first-launch interactive walkthrough
//
// Replaces the old bullet-list welcome with a 4-page carousel the
// player taps through. Each page previews a pillar of the game
// (gameplay → customization → career → daily rewards). Pages are
// dot-paginated; final page has "LET'S GO" that dismisses and sets
// the persistent flag.
//
// Keeps the same AsyncStorage gate ('drop4_welcome_dismissed') so
// DailyRewardPopup / WelcomeBackPopup polling still lines up.
// ═══════════════════════════════════════════════════════════════════════

interface WelcomePage {
  emoji: string;
  kicker: string;
  title: string;
  lines: string[];
  gradient: [string, string];
}

const PAGES: WelcomePage[] = [
  {
    emoji: '🎮',
    kicker: 'WELCOME TO',
    title: 'DROP4',
    lines: [
      'Drop pieces. Connect four in a row.',
      'Outplay the opposition.',
      'Simple rules — every match plays different.',
    ],
    gradient: ['#ff8c42', '#ff5722'],
  },
  {
    emoji: '✨',
    kicker: 'EXPRESS YOURSELF',
    title: 'Customize',
    lines: [
      '152 outfits across 12 packs.',
      '16 collectible pets.',
      '48 emotes + idle animations.',
    ],
    gradient: ['#ba68c8', '#6a1b9a'],
  },
  {
    emoji: '🏆',
    kicker: 'TAKE THE CITY',
    title: 'Career Mode',
    lines: [
      '36 levels across 3 cities.',
      'Brooklyn, Venice Beach, Harlem.',
      'Jeopardy rounds, boss battles, unique seeds.',
    ],
    gradient: ['#4dd0e1', '#0288d1'],
  },
  {
    emoji: '🎁',
    kicker: 'LOG IN DAILY',
    title: 'Rewards',
    lines: [
      'Day 7 = rare outfit unlock.',
      'Free daily spin for coins, gems, pets.',
      'Streak freeze saves you on missed days.',
    ],
    gradient: ['#ffd54f', '#ff8c00'],
  },
];

export function WelcomeOverlay() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);
  const pageWidthRef = useRef<number>(CARD_WIDTH);

  useEffect(() => {
    AsyncStorage.getItem('drop4_welcome_dismissed').then(val => {
      if (val === 'true') {
        setDismissed(true);
      } else {
        setDismissed(false);
        const timer = setTimeout(() => setVisible(true), 900);
        return () => clearTimeout(timer);
      }
    });
  }, []);

  const handleDismiss = () => {
    haptics.tap();
    playSound('click');
    setVisible(false);
    setDismissed(true);
    AsyncStorage.setItem('drop4_welcome_dismissed', 'true');
  };

  const goToPage = (p: number) => {
    setPage(p);
    haptics.tap();
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ x: p * pageWidthRef.current, animated: true });
    }
  };

  const handleNext = () => {
    if (page < PAGES.length - 1) goToPage(page + 1);
    else handleDismiss();
  };

  if (dismissed || !visible) return null;

  const isLast = page === PAGES.length - 1;

  return (
    <Modal transparent visible={visible} animationType="none">
      <View
        style={styles.overlay}
        accessibilityViewIsModal
        accessibilityLiveRegion="polite"
      >
        <Animated.View entering={SlideInDown.springify().damping(12)} style={styles.card}>
          <Pressable
            onPress={handleDismiss}
            style={styles.skipBtn}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Skip walkthrough"
          >
            <Text style={styles.skipBtnText}>SKIP</Text>
          </Pressable>

          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const newPage = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH);
              if (newPage !== page) setPage(newPage);
            }}
            style={styles.scroll}
          >
            {PAGES.map((p, i) => (
              <PageContent key={i} page={p} width={CARD_WIDTH} isCurrent={i === page} />
            ))}
          </ScrollView>

          <View style={styles.dots}>
            {PAGES.map((_, i) => (
              <Pressable
                key={i}
                onPress={() => goToPage(i)}
                accessibilityRole="button"
                accessibilityLabel={`Page ${i + 1}`}
                hitSlop={8}
              >
                <View style={[styles.dot, i === page && styles.dotActive]} />
              </Pressable>
            ))}
          </View>

          <GlossyButton
            label={isLast ? "LET'S GO!" : 'NEXT'}
            variant="orange"
            icon={isLast ? '\u{1F680}' : '\u203A'}
            iconRight=""
            onPress={handleNext}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

function PageContent({ page, width, isCurrent }: { page: WelcomePage; width: number; isCurrent: boolean }) {
  return (
    <View style={[styles.page, { width }]}>
      <LinearGradient
        colors={[page.gradient[0] + 'aa', page.gradient[1] + '33', 'transparent']}
        style={styles.pageGlow}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.8 }}
      />

      {isCurrent ? (
        <Animated.Text entering={ZoomIn.duration(500).springify().damping(10)} style={styles.pageEmoji}>
          {page.emoji}
        </Animated.Text>
      ) : (
        <Text style={styles.pageEmoji}>{page.emoji}</Text>
      )}

      <Text style={[styles.pageKicker, { color: page.gradient[0] }]}>{page.kicker}</Text>
      <Text style={styles.pageTitle}>{page.title}</Text>

      <View style={styles.pageLines}>
        {page.lines.map((line, i) => (
          <Animated.Text
            key={`${page.title}-${i}`}
            entering={isCurrent ? FadeIn.delay(200 + i * 90).duration(300) : undefined}
            style={styles.pageLine}
          >
            {line}
          </Animated.Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center' },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingTop: 16,
    paddingBottom: 22,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    height: 440,
  },
  skipBtn: {
    position: 'absolute',
    top: 14,
    right: 16,
    zIndex: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  skipBtnText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.5,
  },
  scroll: {
    width: '100%',
    flex: 1,
  },
  page: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  pageGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  pageEmoji: {
    fontSize: 64,
    marginBottom: 14,
  },
  pageKicker: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 11,
    letterSpacing: 3,
    marginBottom: 4,
  },
  pageTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 30,
    color: '#ffffff',
    letterSpacing: 0.5,
    marginBottom: 16,
    textAlign: 'center',
  },
  pageLines: {
    gap: 6,
    alignItems: 'center',
  },
  pageLine: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
    textAlign: 'center',
    lineHeight: 19,
  },
  dots: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 10,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  dotActive: {
    backgroundColor: colors.orange,
    width: 22,
  },
});
