import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useSeasonStore, SeasonReward } from '../stores/seasonStore';
import { useShopStore } from '../stores/shopStore';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { PressScale, PulseGlow } from '../components/animations';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';

/** Parse coin amounts from reward names like "100 Coins" */
function parseCoinAmount(name: string): number {
  const match = name.match(/^(\d+)\s*Coins?$/i);
  return match ? parseInt(match[1], 10) : 0;
}

type RewardItem = { type: string; name: string; icon: string; id?: string };
type GrantHelpers = {
  addCoins: (n: number) => void;
  purchaseItem: (cat: 'boards' | 'pieces' | 'dropEffects' | 'winAnimations' | 'boardAccessories', id: string, cost: number) => boolean;
  purchaseEmote: (id: string, cost: number) => boolean;
  purchasePet: (id: string, cost: number) => boolean;
};

function grantReward(reward: RewardItem, helpers: GrantHelpers) {
  const { addCoins, purchaseItem, purchaseEmote, purchasePet } = helpers;
  switch (reward.type) {
    case 'coins': {
      const amount = parseCoinAmount(reward.name);
      if (amount > 0) addCoins(amount);
      break;
    }
    case 'pieces':
      if (reward.id) purchaseItem('pieces', reward.id, 0);
      break;
    case 'board':
      if (reward.id) purchaseItem('boards', reward.id, 0);
      break;
    case 'dropEffect':
      if (reward.id) purchaseItem('dropEffects', reward.id, 0);
      break;
    case 'winAnimation':
      if (reward.id) purchaseItem('winAnimations', reward.id, 0);
      break;
    case 'boardAccessory':
      if (reward.id) purchaseItem('boardAccessories', reward.id, 0);
      break;
    case 'emote':
      if (reward.id) purchaseEmote(reward.id, 0);
      break;
    case 'pet':
      if (reward.id) purchasePet(reward.id, 0);
      break;
  }
}

function RewardTierCard({ reward, currentTier, hasPremium }: {
  reward: SeasonReward;
  currentTier: number;
  hasPremium: boolean;
}) {
  const isUnlocked = currentTier >= reward.tier;

  const isFreeClaimed = useSeasonStore(s => s.isFreeClaimed(reward.tier));
  const isPremiumClaimed = useSeasonStore(s => s.isPremiumClaimed(reward.tier));
  const claimFreeReward = useSeasonStore(s => s.claimFreeReward);
  const claimPremiumReward = useSeasonStore(s => s.claimPremiumReward);
  const addCoins = useShopStore(s => s.addCoins);
  const purchaseItem = useShopStore(s => s.purchaseItem);
  const purchaseEmote = useShopStore(s => s.purchaseEmote);
  const purchasePet = useShopStore(s => s.purchasePet);

  const canClaimFree = isUnlocked && reward.freeReward && !isFreeClaimed;
  const canClaimPremium = isUnlocked && hasPremium && reward.premiumReward && !isPremiumClaimed;

  const handleClaimFree = useCallback(() => {
    if (!reward.freeReward) return;
    const success = claimFreeReward(reward.tier);
    if (success) {
      haptics.win();
      playSound('coin');
      playSound('level_up');
      grantReward(reward.freeReward, { addCoins, purchaseItem, purchaseEmote, purchasePet });
    }
  }, [reward, claimFreeReward, addCoins, purchaseItem, purchaseEmote, purchasePet]);

  const handleClaimPremium = useCallback(() => {
    if (!reward.premiumReward) return;
    const success = claimPremiumReward(reward.tier);
    if (success) {
      haptics.win();
      playSound('coin');
      playSound('level_up');
      grantReward(reward.premiumReward, { addCoins, purchaseItem, purchaseEmote, purchasePet });
    }
  }, [reward, claimPremiumReward, addCoins, purchaseItem, purchaseEmote, purchasePet]);

  return (
    <View style={styles.tierCard}>
      {/* Tier number */}
      <View style={[styles.tierBadge, isUnlocked && styles.tierBadgeUnlocked]}>
        <Text style={[styles.tierNum, isUnlocked && { color: '#fff' }]}>{reward.tier}</Text>
      </View>

      {/* Free track */}
      <View style={[
        styles.rewardSlot,
        isUnlocked && styles.rewardUnlocked,
        canClaimFree && styles.rewardClaimable,
      ]}>
        {reward.freeReward ? (
          <>
            <Text style={styles.rewardIcon}>{reward.freeReward.icon}</Text>
            <Text style={styles.rewardName}>{reward.freeReward.name}</Text>
            <View style={styles.trackPill}>
              <Text style={styles.trackPillText}>FREE</Text>
            </View>
          </>
        ) : (
          <Text style={styles.emptySlot}>{'\u2014'}</Text>
        )}
        {isFreeClaimed && (
          <View style={styles.claimedBadge}>
            <Text style={styles.claimedText}>{'\u2713'}</Text>
          </View>
        )}
        {canClaimFree && (
          <PulseGlow color="#27ae3d" size={32} active>
            <PressScale
              onPress={handleClaimFree}
              scaleTo={0.93}
              accessibilityRole="button"
              accessibilityLabel={`Claim free tier ${reward.tier} reward: ${reward.freeReward?.name ?? ''}`}
            >
              <View style={styles.claimBtn}>
                <LinearGradient
                  colors={[colors.greenLight, colors.green, colors.greenDark]}
                  style={styles.claimGradient}
                >
                  <Text style={styles.claimText}>CLAIM</Text>
                </LinearGradient>
              </View>
            </PressScale>
          </PulseGlow>
        )}
      </View>

      {/* Premium track */}
      <View style={[
        styles.rewardSlot,
        styles.premiumSlot,
        isUnlocked && hasPremium && styles.rewardUnlocked,
        canClaimPremium && styles.rewardClaimablePremium,
      ]}>
        {reward.premiumReward ? (
          <>
            <Text style={styles.rewardIcon}>{reward.premiumReward.icon}</Text>
            <Text style={styles.rewardName}>{reward.premiumReward.name}</Text>
            <View style={[styles.trackPill, styles.trackPillPremium]}>
              <Text style={[styles.trackPillText, { color: '#1a1a00' }]}>PREMIUM</Text>
            </View>
          </>
        ) : (
          <Text style={styles.emptySlot}>{'\u2014'}</Text>
        )}
        {!hasPremium && <View style={styles.lockOverlay}><Text style={styles.lockIcon}>{'\uD83D\uDD12'}</Text></View>}
        {isPremiumClaimed && (
          <View style={styles.claimedBadge}>
            <Text style={styles.claimedText}>{'\u2713'}</Text>
          </View>
        )}
        {canClaimPremium && (
          <PulseGlow color="#f1c40f" size={32} active>
            <PressScale
              onPress={handleClaimPremium}
              scaleTo={0.93}
              accessibilityRole="button"
              accessibilityLabel={`Claim premium tier ${reward.tier} reward: ${reward.premiumReward?.name ?? ''}`}
            >
              <View style={styles.claimBtn}>
                <LinearGradient
                  colors={[colors.goldLight, colors.gold, colors.goldDark]}
                  style={styles.claimGradient}
                >
                  <Text style={[styles.claimText, { color: '#1a1a00' }]}>CLAIM</Text>
                </LinearGradient>
              </View>
            </PressScale>
          </PulseGlow>
        )}
      </View>
    </View>
  );
}

export function SeasonPassScreen() {
  const navigation = useNavigation();
  const seasonName = useSeasonStore(s => s.seasonName);
  const currentTier = useSeasonStore(s => s.currentTier);
  const maxTier = useSeasonStore(s => s.maxTier);
  const xp = useSeasonStore(s => s.xp);
  const xpPerTier = useSeasonStore(s => s.xpPerTier);
  const hasPremium = useSeasonStore(s => s.hasPremium);
  const rewards = useSeasonStore(s => s.rewards);
  const purchasePremium = useSeasonStore(s => s.purchasePremium);
  const coins = useShopStore(s => s.coins);
  const gems = useShopStore(s => s.gems);
  const level = useShopStore(s => s.level);
  const progressPct = (xp / xpPerTier) * 100;

  // Estimate ~30 day seasons — show days remaining
  const seasonDays = 30;
  const dayOfSeason = Math.min(Math.floor((currentTier / Math.max(maxTier, 1)) * seasonDays), seasonDays);
  const daysRemaining = Math.max(seasonDays - dayOfSeason, 1);

  return (
    <ScreenBackground>
      <TopBar coins={coins} gems={gems} level={level} showBack onBackPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Gradient header banner */}
        <LinearGradient
          colors={[colors.purpleDark, '#5b2d8e', colors.goldDark, colors.gold]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerBanner}
        >
          <View style={styles.headerBannerInner}>
            <Text style={styles.title} accessibilityRole="header">{seasonName.toUpperCase()}</Text>
            <View style={styles.tierCountdownRow}>
              <Text style={styles.subtitle}>Tier {currentTier} / {maxTier}</Text>
              <View style={styles.daysRemainingBadge}>
                <Text style={styles.daysRemainingNum}>{daysRemaining}</Text>
                <Text style={styles.daysRemainingLabel}>DAYS LEFT</Text>
              </View>
            </View>

            {/* XP progress */}
            <View style={styles.xpSection}>
              <View style={styles.xpRow}>
                <Text style={styles.xpLabel}>Season XP</Text>
                <Text style={styles.xpValue}>{xp} / {xpPerTier}</Text>
              </View>
              <View style={styles.xpBar}>
                <LinearGradient
                  colors={[colors.orange, '#ff6600', colors.coinGold]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.xpFill, { width: `${Math.min(progressPct, 100)}%` }]}
                />
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Premium upgrade CTA */}
        {!hasPremium && (
          <View style={styles.premiumCta}>
            <LinearGradient
              colors={[colors.goldDark, '#b8960a', colors.gold, colors.goldLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.premiumGradientOuter}
            >
              <View style={styles.premiumCardInner}>
                <View style={styles.premiumSparkleRow}>
                  <Text style={styles.premiumStar}>{'\u2728'}</Text>
                  <Text style={styles.premiumTitle} accessibilityRole="header">{'\uD83D\uDC51'} Upgrade to Premium</Text>
                  <Text style={styles.premiumStar}>{'\u2728'}</Text>
                </View>
                <Text style={styles.premiumDesc}>Unlock exclusive rewards on every tier</Text>
                <Text style={styles.premiumSubDesc}>2x coins, rare skins, and more</Text>
                <View style={{ marginTop: 10 }}>
                  <GlossyButton
                    label={`UPGRADE NOW — 💎100`}
                    variant="gold"
                    small
                    onPress={() => {
                      haptics.tap();
                      Alert.alert(
                        'Upgrade to Premium',
                        `Spend 100 💎 gems to unlock the Premium Season Pass?\n\nYou have ${gems} gems.`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Upgrade',
                            onPress: () => {
                              const success = purchasePremium();
                              if (success) {
                                haptics.win();
                                playSound('level_up');
                              } else {
                                Alert.alert('Not Enough Gems', `You need 100 💎 gems to upgrade.\n\nYou have ${gems} gems.`);
                              }
                            },
                          },
                        ]
                      );
                    }}
                  />
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Track labels as colored pills */}
        <View style={styles.trackHeaders}>
          <View style={{ width: 40 }} />
          <View style={[styles.trackHeaderPill, { flex: 1 }]}>
            <Text style={styles.trackHeaderPillText} accessibilityRole="header">FREE TRACK</Text>
          </View>
          <View style={[styles.trackHeaderPill, styles.trackHeaderPillPremium, { flex: 1 }]}>
            <Text style={[styles.trackHeaderPillText, { color: '#1a1a00' }]} accessibilityRole="header">PREMIUM TRACK</Text>
          </View>
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
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  /* --- Gradient header banner --- */
  headerBanner: {
    borderRadius: 18,
    marginBottom: 16,
    overflow: 'hidden',
  },
  headerBannerInner: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: 18,
    alignItems: 'center',
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 30,
    color: '#ffffff',
    letterSpacing: 3,
    textAlign: 'center',
    textShadowColor: 'rgba(241,196,15,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  tierCountdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 14,
    color: colors.orange,
  },
  daysRemainingBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  daysRemainingNum: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 16,
    color: colors.coinGold,
  },
  daysRemainingLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
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
    color: 'rgba(255,255,255,0.6)',
  },
  xpValue: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: '#ffffff',
  },
  xpBar: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 5,
  },
  /* --- Premium CTA golden card --- */
  premiumCta: {
    marginBottom: 16,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  premiumGradientOuter: {
    borderRadius: 18,
    padding: 2,
  },
  premiumCardInner: {
    backgroundColor: 'rgba(30,20,0,0.85)',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  premiumSparkleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  premiumStar: {
    fontSize: 16,
  },
  premiumTitle: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 18,
    color: colors.coinGold,
    textShadowColor: 'rgba(241,196,15,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  premiumDesc: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6,
    textAlign: 'center',
  },
  premiumSubDesc: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  /* --- Track header pills --- */
  trackHeaders: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingHorizontal: 4,
    gap: 6,
  },
  trackHeaderPill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingVertical: 5,
    alignItems: 'center',
  },
  trackHeaderPillPremium: {
    backgroundColor: colors.coinGold,
  },
  trackHeaderPillText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tierList: {
    gap: 6,
  },
  tierCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
    minHeight: 76,
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
  rewardClaimable: {
    borderColor: 'rgba(46,204,113,0.6)',
    backgroundColor: 'rgba(46,204,113,0.12)',
    shadowColor: colors.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  rewardClaimablePremium: {
    borderColor: 'rgba(255,215,0,0.6)',
    backgroundColor: 'rgba(255,215,0,0.1)',
    shadowColor: colors.coinGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  rewardIcon: {
    fontSize: 22,
  },
  rewardName: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 10,
    color: '#ffffff',
    textAlign: 'center',
    marginTop: 2,
  },
  trackPill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 3,
  },
  trackPillPremium: {
    backgroundColor: colors.coinGold,
  },
  trackPillText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 7,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptySlot: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 14,
    color: colors.textMuted,
  },
  lockOverlay: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: {
    fontSize: 11,
  },
  claimedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimedText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: '#ffffff',
  },
  // Claim button
  claimBtn: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
  },
  claimGradient: {
    borderRadius: 8,
    paddingVertical: 5,
    alignItems: 'center',
  },
  claimText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: '#ffffff',
    letterSpacing: 1,
  },
});
