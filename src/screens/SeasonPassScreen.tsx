import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useSeasonStore, SeasonReward } from '../stores/seasonStore';
import { haptics } from '../services/haptics';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';

function RewardTierCard({ reward, currentTier, hasPremium }: {
  reward: SeasonReward;
  currentTier: number;
  hasPremium: boolean;
}) {
  const isUnlocked = currentTier >= reward.tier;
  const isCurrent = currentTier === reward.tier - 1;

  return (
    <View style={[styles.tierCard, isCurrent && styles.tierCardCurrent]}>
      {/* Tier number */}
      <View style={[styles.tierBadge, isUnlocked && styles.tierBadgeUnlocked]}>
        <Text style={[styles.tierNum, isUnlocked && { color: '#fff' }]}>{reward.tier}</Text>
      </View>

      {/* Free track */}
      <View style={[styles.rewardSlot, isUnlocked && styles.rewardUnlocked]}>
        {reward.freeReward ? (
          <>
            <Text style={styles.rewardIcon}>{reward.freeReward.icon}</Text>
            <Text style={styles.rewardName}>{reward.freeReward.name}</Text>
            <Text style={styles.trackLabel}>FREE</Text>
          </>
        ) : (
          <Text style={styles.emptySlot}>—</Text>
        )}
        {isUnlocked && <View style={styles.claimedBadge}><Text style={styles.claimedText}>✓</Text></View>}
      </View>

      {/* Premium track */}
      <View style={[styles.rewardSlot, styles.premiumSlot, isUnlocked && hasPremium && styles.rewardUnlocked]}>
        {reward.premiumReward ? (
          <>
            <Text style={styles.rewardIcon}>{reward.premiumReward.icon}</Text>
            <Text style={styles.rewardName}>{reward.premiumReward.name}</Text>
            <Text style={[styles.trackLabel, { color: colors.coinGold }]}>PREMIUM</Text>
          </>
        ) : (
          <Text style={styles.emptySlot}>—</Text>
        )}
        {!hasPremium && <View style={styles.lockOverlay}><Text style={styles.lockIcon}>🔒</Text></View>}
        {isUnlocked && hasPremium && <View style={styles.claimedBadge}><Text style={styles.claimedText}>✓</Text></View>}
      </View>
    </View>
  );
}

export function SeasonPassScreen() {
  const { seasonName, currentTier, maxTier, xp, xpPerTier, hasPremium, rewards } = useSeasonStore();
  const progressPct = (xp / xpPerTier) * 100;

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{seasonName.toUpperCase()}</Text>
          <Text style={styles.subtitle}>Tier {currentTier} / {maxTier}</Text>

          {/* XP progress */}
          <View style={styles.xpSection}>
            <View style={styles.xpRow}>
              <Text style={styles.xpLabel}>Season XP</Text>
              <Text style={styles.xpValue}>{xp} / {xpPerTier}</Text>
            </View>
            <View style={styles.xpBar}>
              <LinearGradient
                colors={[colors.orange, '#ff6600']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.xpFill, { width: `${Math.min(progressPct, 100)}%` }]}
              />
            </View>
          </View>
        </View>

        {/* Premium upgrade CTA */}
        {!hasPremium && (
          <View style={styles.premiumCta}>
            <LinearGradient
              colors={['rgba(255,209,102,0.15)', 'rgba(255,209,102,0.05)']}
              style={styles.premiumGradient}
            >
              <View style={styles.premiumContent}>
                <Text style={styles.premiumTitle}>👑 Upgrade to Premium</Text>
                <Text style={styles.premiumDesc}>Unlock exclusive rewards on every tier</Text>
              </View>
              <GlossyButton label="UPGRADE" variant="gold" small onPress={() => haptics.tap()} />
            </LinearGradient>
          </View>
        )}

        {/* Track labels */}
        <View style={styles.trackHeaders}>
          <View style={{ width: 40 }} />
          <Text style={[styles.trackHeaderText, { flex: 1 }]}>Free Track</Text>
          <Text style={[styles.trackHeaderText, { flex: 1, color: colors.coinGold }]}>Premium Track</Text>
        </View>

        {/* Reward tiers */}
        <View style={styles.tierList}>
          {rewards.map(reward => (
            <RewardTierCard
              key={reward.tier}
              reward={reward}
              currentTier={currentTier}
              hasPremium={hasPremium}
            />
          ))}
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 22,
    color: '#ffffff',
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 14,
    color: colors.orange,
    marginTop: 2,
  },
  xpSection: {
    width: '100%',
    marginTop: 12,
  },
  xpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  xpLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
  xpValue: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: '#ffffff',
  },
  xpBar: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 5,
  },
  premiumCta: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  premiumGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,209,102,0.3)',
  },
  premiumContent: {
    flex: 1,
    marginRight: 12,
  },
  premiumTitle: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 15,
    color: colors.coinGold,
  },
  premiumDesc: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  trackHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  trackHeaderText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  tierList: {
    gap: 6,
  },
  tierCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
    minHeight: 64,
  },
  tierCardCurrent: {
    // Highlight current tier
  },
  tierBadge: {
    width: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierBadgeUnlocked: {
    backgroundColor: 'rgba(39,174,61,0.3)',
  },
  tierNum: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 16,
    color: colors.textSecondary,
  },
  rewardSlot: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
  },
  premiumSlot: {
    borderColor: 'rgba(255,209,102,0.15)',
    backgroundColor: 'rgba(255,209,102,0.03)',
  },
  rewardUnlocked: {
    borderColor: 'rgba(39,174,61,0.3)',
    backgroundColor: 'rgba(39,174,61,0.08)',
  },
  rewardIcon: {
    fontSize: 20,
  },
  rewardName: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 10,
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 2,
  },
  trackLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 8,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  emptySlot: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: {
    fontSize: 16,
  },
  claimedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimedText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: '#ffffff',
  },
});
