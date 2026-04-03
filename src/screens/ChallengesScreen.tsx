import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { useChallengeStore, Challenge } from '../stores/challengeStore';
import { useShopStore } from '../stores/shopStore';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';

function ChallengeCard({ challenge, onClaim }: { challenge: Challenge; onClaim: () => void }) {
  const canClaim = challenge.progress >= challenge.target && !challenge.completed;
  const progressPct = Math.min((challenge.progress / challenge.target) * 100, 100);

  return (
    <View style={[styles.card, challenge.completed && styles.cardDone]}>
      <View style={styles.cardTop}>
        <Text style={styles.cardIcon}>{challenge.icon}</Text>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, challenge.completed && { color: colors.textSecondary }]}>
            {challenge.title}
          </Text>
          <Text style={styles.cardDesc}>{challenge.description}</Text>
        </View>
        <View style={styles.rewardBadge}>
          <Text style={styles.rewardText}>🪙 {challenge.reward}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressWrap}>
        <View style={styles.progressBg}>
          <LinearGradient
            colors={challenge.completed ? ['#27ae3d', '#1e8a30'] : [colors.orange, '#ff6600']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${progressPct}%` }]}
          />
        </View>
        <Text style={styles.progressText}>
          {challenge.progress}/{challenge.target}
        </Text>
      </View>

      {/* Claim button */}
      {canClaim && (
        <Pressable onPress={onClaim} style={styles.claimBtn}>
          <LinearGradient
            colors={['#34c94d', '#27ae3d', '#1e8a30']}
            style={styles.claimGradient}
          >
            <Text style={styles.claimText}>CLAIM</Text>
          </LinearGradient>
        </Pressable>
      )}

      {challenge.completed && (
        <View style={styles.completedBadge}>
          <Text style={styles.completedText}>✓ COMPLETED</Text>
        </View>
      )}
    </View>
  );
}

export function ChallengesScreen() {
  const { challenges, claimReward } = useChallengeStore();
  const { addCoins } = useShopStore();

  const handleClaim = (challengeId: string) => {
    const reward = claimReward(challengeId);
    if (reward > 0) {
      addCoins(reward);
      haptics.win();
      playSound('coin');
    }
  };

  const completedCount = challenges.filter(c => c.completed).length;

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>DAILY CHALLENGES</Text>
          <Text style={styles.subtitle}>Refreshes in 11h 46m</Text>
          <Text style={styles.progress}>{completedCount}/3 completed</Text>
        </View>

        <View style={styles.cardList}>
          {challenges.map(challenge => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              onClaim={() => handleClaim(challenge.id)}
            />
          ))}
        </View>

        {/* Bonus for completing all 3 */}
        <View style={[styles.bonusCard, completedCount === 3 && styles.bonusActive]}>
          <Text style={styles.bonusIcon}>🎁</Text>
          <View>
            <Text style={styles.bonusTitle}>Daily Bonus</Text>
            <Text style={styles.bonusDesc}>Complete all 3 challenges</Text>
          </View>
          <Text style={styles.bonusReward}>🪙 200</Text>
        </View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
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
  progress: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: colors.orange,
    marginTop: 4,
  },
  cardList: {
    gap: 10,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardDone: {
    opacity: 0.6,
    borderColor: 'rgba(39,174,61,0.2)',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
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
  rewardBadge: {
    backgroundColor: 'rgba(255,209,102,0.1)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  rewardText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: colors.coinGold,
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBg: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 12,
    color: colors.textSecondary,
    width: 30,
    textAlign: 'right',
  },
  claimBtn: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  claimGradient: {
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 12,
  },
  claimText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 1,
  },
  completedBadge: {
    marginTop: 6,
    alignSelf: 'center',
  },
  completedText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: colors.green,
    letterSpacing: 0.5,
  },
  bonusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    opacity: 0.5,
  },
  bonusActive: {
    opacity: 1,
    backgroundColor: 'rgba(255,209,102,0.08)',
    borderColor: 'rgba(255,209,102,0.3)',
  },
  bonusIcon: {
    fontSize: 28,
  },
  bonusTitle: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#ffffff',
  },
  bonusDesc: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textSecondary,
  },
  bonusReward: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 15,
    color: colors.coinGold,
    marginLeft: 'auto',
  },
});
