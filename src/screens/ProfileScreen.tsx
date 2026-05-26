import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Share, Image, ImageSourcePropType } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { PortraitFrame } from '../components/ui/PortraitFrame';
import { Character3DPortrait } from '../components/3d/Character3DPortrait';
import { PetDisplay } from '../components/ui/PetDisplay';
import { getPetById } from '../data/pets';
import { PETS_ENABLED } from '../data/featureFlags';
import { useShopStore, getCoinMilestoneInfo, getPlayerTitle, getPlayerTitleColor } from '../stores/shopStore';
import { useGameStore } from '../stores/gameStore';
import { useMatchHistoryStore } from '../stores/matchHistoryStore';
import { useAchievementStore, getAchievementScore, getMaxAchievementPoints } from '../stores/achievementStore';
import { useRankedStore, RANKED_TIERS, formatRank } from '../stores/rankedStore';
import { useChallengeStore } from '../stores/challengeStore';
import { useDailyRewardStore } from '../stores/dailyRewardStore';
import { useDailySpinStore } from '../stores/dailySpinStore';
import { useCharacterStore } from '../stores/characterStore';
import { useCareerStore } from '../stores/careerStore';
import { CAREER_CITIES, ALL_CAREER_LEVELS, getCityCompletion, getReputationStars } from '../data/careerLevels';
import { DEFAULT_PALETTE } from '@amg/cosmetic-ui';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { Shimmer, PressScale, StaggeredEntry } from '../components/animations';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';

// Painted Flux stat icons keyed by label — batch 4 added wins/losses/winrate/games.
// Missing keys render the card without a hero icon (streak "Current / Best"
// cards don't need painted icons — the value itself is the hero).
const STAT_ICONS: Record<string, ImageSourcePropType> = {
  'Wins': require('../assets/images/ui/stat-wins.png'),
  'Losses': require('../assets/images/ui/stat-losses.png'),
  'Win Rate': require('../assets/images/ui/stat-winrate.png'),
  'Games': require('../assets/images/ui/stat-games.png'),
  'Coins': require('../assets/images/ui/icon-coin.png'),
  'Gems': require('../assets/images/ui/icon-gem.png'),
};

function StatCard({ label, value, color = '#ffffff' }: { label: string; value: string | number; color?: string }) {
  const iconSource = STAT_ICONS[label];
  return (
    <View style={styles.statCard}>
      {iconSource && (
        <Image source={iconSource} style={styles.statIcon} resizeMode="contain" />
      )}
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function EquippedItem({ label, name, rarity }: { label: string; name: string; rarity: string }) {
  const rarityColors: Record<string, string> = {
    common: '#8892b0',
    uncommon: '#2ecc71',
    rare: '#3498db',
    epic: '#9b59b6',
    legendary: '#f1c40f',
  };
  return (
    <View style={styles.equippedItem}>
      <Text style={styles.equippedLabel}>{label}</Text>
      <Text style={[styles.equippedName, { color: rarityColors[rarity] || '#fff' }]}>{name}</Text>
    </View>
  );
}

export function ProfileScreen() {
  const navigation = useNavigation<any>();
  const playerName = useShopStore(s => s.playerName);
  const level = useShopStore(s => s.level);
  const xp = useShopStore(s => s.xp);
  const coins = useShopStore(s => s.coins);
  const gems = useShopStore(s => s.gems);
  const equipped = useShopStore(s => s.equipped);
  const equippedPet = useShopStore(s => s.equippedPet);
  const equippedCustomTitle = useShopStore(s => s.equippedCustomTitle);
  const equippedOutfitVariant = useCharacterStore(s => s.equippedOutfitVariant);
  const navigateTo = (screen: string) => navigation.dispatch(CommonActions.navigate({ name: screen }));
  const winStreak = useGameStore(s => s.winStreak);
  const bestStreak = useGameStore(s => s.bestStreak);
  const allMatches = useMatchHistoryStore(s => s.matches);
  const recentMatches = useMemo(() => allMatches.slice(0, 5), [allMatches]);
  const achievements = useAchievementStore(s => s.achievements);
  const elo = useRankedStore(s => s.elo);
  const tier = useRankedStore(s => s.tier);

  // Daily goals data
  const challenges = useChallengeStore(s => s.challenges);
  const dailyRewardLastClaim = useDailyRewardStore(s => s.lastClaimDate);
  const freezeCharges = useDailyRewardStore(s => s.freezeCharges);
  const currentStreak = useDailyRewardStore(s => s.currentStreak);
  const lastSpinDate = useDailySpinStore(s => s.lastSpinDate);

  // Use lifetime match history for accurate stats (not session scores which reset on local play)
  const { totalGames, lifetimeWins, winRate } = useMemo(() => {
    const total = allMatches.length;
    const wins = allMatches.filter(m => m.result === 'win').length;
    return { totalGames: total, lifetimeWins: wins, winRate: total > 0 ? Math.round((wins / total) * 100) : 0 };
  }, [allMatches]);

  // Daily goals calculations
  const dailyGoals = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();
    const gamesToday = allMatches.filter(m => m.timestamp >= todayMs).length;
    const completedChallenges = challenges.filter(c => c.completed).length;
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const rewardClaimed = dailyRewardLastClaim === todayStr;
    const spinUsed = lastSpinDate === todayStr;
    return { gamesToday, completedChallenges, rewardClaimed, spinUsed };
  }, [allMatches, challenges, dailyRewardLastClaim, lastSpinDate]);

  // Equipped camo variant — resolve display name + rarity for the profile card.
  const camoInfo = useMemo(() => {
    if (!equippedOutfitVariant) return { name: 'Default', rarity: 'common' };
    const v = DEFAULT_PALETTE.find((p) => p.id === equippedOutfitVariant);
    return v ? { name: v.label, rarity: v.rarity } : { name: 'Default', rarity: 'common' };
  }, [equippedOutfitVariant]);

  // Coin milestone
  const milestoneInfo = useMemo(() => getCoinMilestoneInfo(coins), [coins]);

  // Favorite difficulty (most-played)
  const favDifficulty = useMemo(() => {
    if (allMatches.length === 0) return 'No games yet';
    const counts: Record<string, number> = {};
    allMatches.forEach(m => { counts[m.difficulty] = (counts[m.difficulty] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0].charAt(0).toUpperCase() + top[0].slice(1) : 'No games yet';
  }, [allMatches]);

  // Favorite opponent (most-played)
  const favOpponent = useMemo(() => {
    if (allMatches.length === 0) return null;
    const counts: Record<string, number> = {};
    allMatches.forEach(m => { counts[m.opponent] = (counts[m.opponent] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? { name: top[0], games: top[1] } : null;
  }, [allMatches]);

  // Career progress
  const careerProgress = useCareerStore(s => s.progress);
  const careerStats = useMemo(() => {
    const totalLevels = ALL_CAREER_LEVELS.length;
    const maxStars = totalLevels * 3;
    let completedCount = 0;
    let totalStars = 0;
    let bossesDefeated = 0;
    for (const [id, p] of Object.entries(careerProgress)) {
      if (p.completed) completedCount++;
      totalStars += p.stars;
      const lvl = ALL_CAREER_LEVELS.find(l => l.id === Number(id));
      if (lvl?.isBoss && p.completed) bossesDefeated++;
    }
    const liveCities = CAREER_CITIES.filter(c => !c.comingSoon);
    let currentCityName = liveCities[0]?.nickname ?? 'The Rec';
    for (const city of liveCities) {
      const comp = getCityCompletion(city, careerProgress);
      if (comp.fraction < 1) {
        currentCityName = city.nickname;
        break;
      }
      if (city === liveCities[liveCities.length - 1]) currentCityName = 'All Cleared!';
    }
    const repStars = getReputationStars(totalStars);
    return { completedCount, totalLevels, totalStars, maxStars, bossesDefeated, currentCityName, repStars };
  }, [careerProgress]);

  // Share Profile handler
  const handleShareProfile = async () => {
    haptics.tap();
    playSound('click');
    const playerName = useShopStore.getState().playerName;
    const computedTitle = getPlayerTitle(level, tier, coins);
    const title = equippedCustomTitle ?? computedTitle;
    const tierInfo = RANKED_TIERS.find(t => t.id === tier) || RANKED_TIERS[0];
    const petName = equippedPet ? (getPetById(equippedPet)?.name ?? 'None') : 'None';
    const card = [
      '\uD83C\uDFAE Drop4 Player Card',
      `${playerName} (Lv.${level} ${title})`,
      `${tierInfo.icon} ${formatRank(elo)} \u2014 ${elo} ELO`,
      `\uD83D\uDCCA ${winRate}% Win Rate (${totalGames} games)`,
      `\u2B50 Favorite: ${favDifficulty}`,
      petName !== 'None' ? `\uD83D\uDC3E Pet: ${petName}` : null,
    ].filter(Boolean).join('\n');
    try {
      await Share.share({ message: card });
    } catch {}
  };

  // Map equipped IDs to display names
  const boardNames: Record<string, string> = {
    default: 'Classic Blue', wood: 'Wooden', neon: 'Neon Glow',
    galaxy: 'Galaxy', gold: 'Gold Court', ice: 'Ice Arena',
    lava: 'Lava Pit', darkmatter: 'Dark Matter',
  };
  const pieceNames: Record<string, string> = {
    classic: 'Classic', chrome: 'Chrome', fire_ice: 'Fire & Ice',
    neon: 'Neon', holo: 'Holographic', darkmatter: 'Dark Matter',
  };

  return (
    <ScreenBackground scene="profile">
      {/* Floating back button — absolute-positioned at top-left so it
          sits above the ScrollView without competing with the portrait
          layout. ProfileScreen doesn't have a TopBar (trophy card is
          the hero), so this dedicated gold-rimmed back chevron is the
          only way out. Matches the settings gear style from TopBar. */}
      <Pressable
        onPress={() => { haptics.tap(); playSound('back'); navigation.goBack(); }}
        style={styles.backBtn}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Text style={styles.backIcon}>{'‹'}</Text>
      </Pressable>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile header */}
        <StaggeredEntry index={0} delay={60}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarSection}>
            {/*
              Portrait treatment: tight-cropped character inside a tier
              frame with rating badge + tier label. The tier scales with
              player level so you visibly upgrade your card as you grind.
            */}
            <PortraitFrame
              // Live 3D portrait — reads the player's current outfit / hair /
              // skin colors from characterStore, so the card always matches
              // whatever they've got equipped. No floor, auto-rotate off for
              // the card look (constant angle feels more "trophy portrait").
              renderContent={(innerSize) => (
                <Character3DPortrait
                  width={innerSize}
                  height={innerSize}
                  showFloor={false}
                />
              )}
              rating={Math.min(99, 70 + Math.max(0, level - 1) * 2)}
              tier={
                level >= 30 ? 'darkmatter' :
                level >= 20 ? 'diamond' :
                level >= 15 ? 'amethyst' :
                level >= 10 ? 'ruby' :
                level >= 7  ? 'gold' :
                level >= 4  ? 'silver' :
                'bronze'
              }
              size={170}
            />
            {PETS_ENABLED && equippedPet && (
              <PetDisplay petId={equippedPet} size={50} style={{ position: 'absolute', right: -10, bottom: -5 }} />
            )}
          </View>

          <Text style={styles.playerName}>{playerName}</Text>

          {/* Player Title */}
          {(() => {
            const computedTitle = getPlayerTitle(level, tier, coins);
            const displayTitle = equippedCustomTitle ?? computedTitle;
            const titleColor = equippedCustomTitle ? '#f1c40f' : getPlayerTitleColor(computedTitle);
            return (
              <View style={[styles.playerTitleBadge, { borderColor: `${titleColor}40` }]}>
                <Text style={[styles.playerTitleText, { color: titleColor }]}>{displayTitle}</Text>
              </View>
            );
          })()}

          {/* Share Profile button */}
          <PressScale
            scaleTo={0.95}
            onPress={handleShareProfile}
            style={styles.shareProfileBtn}
            accessibilityRole="button"
            accessibilityLabel="Share profile"
            accessibilityHint="Share your player card with stats and rank"
          >
              <Text style={styles.shareProfileText}>{'\uD83D\uDCE4'} SHARE PROFILE</Text>
          </PressScale>

          {/* Level bar — chunky with XP inside */}
          <View style={styles.levelSection}>
            <Text style={styles.levelLabel}>Level {level}</Text>
            <View style={styles.xpBarChunky}>
              {xp > 0 ? (
                <Shimmer>
                  <LinearGradient
                    colors={[colors.orange, '#ff6600', colors.coinGold]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.xpFillChunky, { width: `${Math.max(Math.min((xp / (level * 100)) * 100, 100), 8)}%` }]}
                  >
                    <Text style={styles.xpInsideText}>{xp} / {level * 100} XP</Text>
                  </LinearGradient>
                </Shimmer>
              ) : (
                <LinearGradient
                  colors={[colors.orange, '#ff6600', colors.coinGold]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.xpFillChunky, { width: `${Math.max(Math.min((xp / (level * 100)) * 100, 100), 8)}%` }]}
                >
                  <Text style={styles.xpInsideText}>{xp} / {level * 100} XP</Text>
                </LinearGradient>
              )}
            </View>
            <Text style={styles.nextRewardHint}>
              Next reward at Level {level + 1}
            </Text>
          </View>
        </View>
        </StaggeredEntry>

        {/* Daily Goals */}
        <StaggeredEntry index={1} delay={60}>
        <Text style={styles.sectionTitle} accessibilityRole="header">DAILY GOALS</Text>
        <View style={styles.dailyGoalsCard}>
          <View style={styles.dailyGoalRow}>
            <Text style={styles.dailyGoalIcon}>🔥</Text>
            <Text style={styles.dailyGoalLabel}>Login streak</Text>
            <Text style={[styles.dailyGoalValue, currentStreak >= 2 && { color: colors.coinGold }]}>
              {currentStreak} day{currentStreak !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.dailyGoalRow}>
            <Text style={styles.dailyGoalIcon}>🎮</Text>
            <Text style={styles.dailyGoalLabel}>Games played today</Text>
            <Text style={[styles.dailyGoalValue, dailyGoals.gamesToday > 0 && { color: colors.green }]}>
              {dailyGoals.gamesToday}
            </Text>
          </View>
          <View style={styles.dailyGoalRow}>
            <Text style={styles.dailyGoalIcon}>🎯</Text>
            <Text style={styles.dailyGoalLabel}>Challenges completed</Text>
            <Text style={[styles.dailyGoalValue, dailyGoals.completedChallenges >= 3 && { color: colors.green }]}>
              {dailyGoals.completedChallenges}/3
            </Text>
          </View>
          <View style={styles.dailyGoalRow}>
            <Text style={styles.dailyGoalIcon}>🎁</Text>
            <Text style={styles.dailyGoalLabel}>Daily reward claimed</Text>
            <Text style={[styles.dailyGoalCheck, dailyGoals.rewardClaimed && { color: colors.green }]}>
              {dailyGoals.rewardClaimed ? '✅' : '❌'}
            </Text>
          </View>
          <View style={styles.dailyGoalRow}>
            <Text style={styles.dailyGoalIcon}>🎰</Text>
            <Text style={styles.dailyGoalLabel}>Daily spin used</Text>
            <Text style={[styles.dailyGoalCheck, dailyGoals.spinUsed && { color: colors.green }]}>
              {dailyGoals.spinUsed ? '✅' : '❌'}
            </Text>
          </View>
          {/* Streak freeze — retention safety net. Shown to all players so
              they KNOW they have a free save per week before they miss a day. */}
          <View style={[styles.dailyGoalRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.dailyGoalIcon}>🧊</Text>
            <Text style={styles.dailyGoalLabel}>Streak Freeze ready</Text>
            <Text style={[
              styles.dailyGoalCheck,
              freezeCharges > 0 && { color: '#4dd0e1' },
            ]}>
              {freezeCharges > 0 ? (currentStreak > 0 ? '🧊 Ready' : '🧊 Stored') : '— Used'}
            </Text>
          </View>
        </View>
        </StaggeredEntry>

        {/* Career Progress */}
        <StaggeredEntry index={2} delay={60}>
        <Text style={styles.sectionTitle} accessibilityRole="header">CAREER</Text>
        <View style={styles.careerCard}>
          <View style={styles.careerTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.careerCityLabel}>CURRENT CITY</Text>
              <Text style={styles.careerCityName}>{careerStats.currentCityName}</Text>
            </View>
            <View style={styles.careerRepBox}>
              <Text style={styles.careerRepStars}>
                {'★'.repeat(careerStats.repStars)}{'☆'.repeat(5 - careerStats.repStars)}
              </Text>
              <Text style={styles.careerRepLabel}>REPUTATION</Text>
            </View>
          </View>
          <View style={styles.careerProgressOuter}>
            <LinearGradient
              colors={[colors.orange, '#ff6600']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.careerProgressFill, { width: `${Math.max(careerStats.totalLevels > 0 ? (careerStats.completedCount / careerStats.totalLevels) * 100 : 0, 4)}%` as any }]}
            />
          </View>
          <View style={styles.careerStatRow}>
            <View style={styles.careerStatItem}>
              <Text style={styles.careerStatValue}>{careerStats.completedCount}/{careerStats.totalLevels}</Text>
              <Text style={styles.careerStatLabel}>Levels</Text>
            </View>
            <View style={styles.careerStatItem}>
              <Text style={[styles.careerStatValue, { color: colors.coinGold }]}>{careerStats.totalStars}/{careerStats.maxStars}</Text>
              <Text style={styles.careerStatLabel}>Stars</Text>
            </View>
            <View style={styles.careerStatItem}>
              <Text style={[styles.careerStatValue, { color: colors.pieceRed }]}>{careerStats.bossesDefeated}</Text>
              <Text style={styles.careerStatLabel}>Bosses</Text>
            </View>
          </View>
        </View>
        </StaggeredEntry>

        {/* Coin Milestone */}
        <StaggeredEntry index={3} delay={60}>
        <Text style={styles.sectionTitle} accessibilityRole="header">COIN GOAL</Text>
        <View style={styles.milestoneCard}>
          {milestoneInfo.currentTitle && (
            <View style={styles.milestoneCurrentRow}>
              <Text style={styles.milestoneCurrentIcon}>{milestoneInfo.currentIcon}</Text>
              <Text style={styles.milestoneCurrentTitle}>{milestoneInfo.currentTitle}</Text>
            </View>
          )}
          {milestoneInfo.nextMilestone ? (
            <>
              <View style={styles.milestoneProgressOuter}>
                <LinearGradient
                  colors={[colors.coinGold, colors.orange]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.milestoneProgressFill, { width: `${Math.max(milestoneInfo.progress * 100, 4)}%` as any }]}
                />
              </View>
              <Text style={styles.milestoneNextText}>
                Next: {milestoneInfo.nextMilestone.icon} {milestoneInfo.nextMilestone.title} ({milestoneInfo.nextMilestone.coins.toLocaleString()} coins) — {milestoneInfo.coinsToGo.toLocaleString()} to go!
              </Text>
            </>
          ) : (
            <Text style={styles.milestoneMaxText}>All milestones achieved!</Text>
          )}
        </View>
        </StaggeredEntry>

        {/* Compact links */}
        <StaggeredEntry index={4} delay={60}>
        <View style={styles.profileLinks}>
          <PressScale
            onPress={() => { haptics.tap(); playSound('click'); navigateTo('Stats'); }}
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel="Stats"
            accessibilityHint="Open the stats screen"
          >
            <View style={styles.profileLink}>
              <Text style={styles.profileLinkIcon}>📊</Text>
              <Text style={styles.profileLinkText}>Stats</Text>
              <Text style={styles.profileLinkArrow}>›</Text>
            </View>
          </PressScale>
          <PressScale
            onPress={() => { haptics.tap(); playSound('click'); navigateTo('Settings'); }}
            scaleTo={0.98}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            accessibilityHint="Open the settings screen"
          >
            <View style={styles.profileLink}>
              <Text style={styles.profileLinkIcon}>⚙️</Text>
              <Text style={styles.profileLinkText}>Settings</Text>
              <Text style={styles.profileLinkArrow}>›</Text>
            </View>
          </PressScale>
        </View>
        </StaggeredEntry>

        <StaggeredEntry index={5} delay={60}>
          <View style={styles.statsGrid}>
            <StatCard label="Wins" value={lifetimeWins} color={colors.green} />
            <StatCard label="Losses" value={allMatches.filter(m => m.result === 'loss').length} color={colors.pieceRed} />
            <StatCard label="Win Rate" value={`${winRate}%`} color={colors.orange} />
            <StatCard label="Games" value={totalGames} />
            <StatCard label="Best Streak" value={bestStreak} color={colors.coinGold} />
            <StatCard label="Career Stars" value={careerStats.totalStars} color={colors.coinGold} />
            <StatCard label="Coins" value={coins.toLocaleString()} color={colors.coinGold} />
            <StatCard label="Gems" value={gems} color={colors.gemGreen} />
          </View>
        </StaggeredEntry>

        {/* Favorite Opponent */}
        {favOpponent && (
          <StaggeredEntry index={6} delay={60}>
          <View style={styles.favOpponentCard}>
            <Text style={styles.favOpponentIcon}>{'\uD83C\uDFAF'}</Text>
            <View style={styles.favOpponentTextWrap}>
              <Text style={styles.favOpponentLabel}>MOST PLAYED</Text>
              <Text style={styles.favOpponentName} numberOfLines={1}>{favOpponent.name} <Text style={styles.favOpponentGames}>({favOpponent.games} game{favOpponent.games !== 1 ? 's' : ''})</Text></Text>
            </View>
          </View>
          </StaggeredEntry>
        )}

        {/* Equipped cosmetics */}
        <StaggeredEntry index={7} delay={60}>
        <Text style={styles.sectionTitle} accessibilityRole="header">EQUIPPED</Text>
          <View style={styles.equippedGrid}>
            <EquippedItem label="Board" name={boardNames[equipped.board] || equipped.board} rarity="common" />
            <EquippedItem label="Pieces" name={pieceNames[equipped.pieces] || equipped.pieces} rarity="common" />
            <EquippedItem label="Camo" name={camoInfo.name} rarity={camoInfo.rarity} />
            {PETS_ENABLED && (
              <EquippedItem
                label="Pet"
                name={equippedPet ? (getPetById(equippedPet)?.name ?? 'None') : 'None'}
                rarity={equippedPet ? (getPetById(equippedPet)?.rarity ?? 'common') : 'common'}
              />
            )}
          </View>
        </StaggeredEntry>

        {/* Achievements — compact summary, full list is in Challenges tab */}
        <StaggeredEntry index={8} delay={60}>
        <Text style={styles.sectionTitle} accessibilityRole="header">ACHIEVEMENTS</Text>
        {(() => {
          const unlocked = achievements.filter(a => a.unlocked).length;
          const total = achievements.length;
          const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0;
          const score = getAchievementScore(achievements);
          const maxScore = getMaxAchievementPoints();
          return (
            <View style={styles.achievementProgressCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={styles.achProgressPct}>{unlocked}/{total} unlocked</Text>
                <Text style={[styles.achProgressPct, { color: colors.coinGold }]}>{score} / {maxScore} pts</Text>
              </View>
              <View style={styles.achProgressBarOuter}>
                <LinearGradient
                  colors={[colors.orange, colors.coinGold]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.achProgressBarFill, { width: `${Math.max(pct, 4)}%` as any }]}
                />
              </View>
              <PressScale
                scaleTo={0.95}
                onPress={() => { haptics.tap(); playSound('click'); navigateTo('Challenges'); }}
                style={{ alignSelf: 'center', marginTop: 10, paddingHorizontal: 16, paddingVertical: 6, backgroundColor: 'rgba(255,140,0,0.15)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,140,0,0.3)' }}
                accessibilityRole="button"
                accessibilityLabel="View all achievements"
                accessibilityHint="Open the challenges screen with the full achievement list"
              >
                <Text style={{ fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 12, color: colors.orange, letterSpacing: 1 }}>VIEW ALL →</Text>
              </PressScale>
            </View>
          );
        })()}
        </StaggeredEntry>

        {/* Streaks */}
        <StaggeredEntry index={9} delay={60}>
        <Text style={styles.sectionTitle} accessibilityRole="header">STREAKS</Text>
        <View style={styles.statsGrid}>
          <StatCard label="Current" value={winStreak > 0 ? `🔥 ${winStreak}` : '0'} color={colors.orange} />
          <StatCard label="Best" value={bestStreak} color={colors.coinGold} />
        </View>
        </StaggeredEntry>


        {/* Match History */}
        {recentMatches.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]} accessibilityRole="header">RECENT MATCHES</Text>
              <PressScale
                scaleTo={0.95}
                onPress={() => { haptics.tap(); playSound('click'); navigateTo('MatchHistory'); }}
                accessibilityRole="button"
                accessibilityLabel="View all matches"
                accessibilityHint="Open the full match history"
              >
                <Text style={styles.viewAllLink}>View All →</Text>
              </PressScale>
            </View>

            {/* Form guide — last 10 results as colored dots */}
            {allMatches.length >= 3 && (
              <View style={styles.formGuideRow}>
                <Text style={styles.formGuideLabel}>Form:</Text>
                {allMatches.slice(0, 10).reverse().map((m, i) => (
                  <View
                    key={i}
                    style={[
                      styles.formDot,
                      { backgroundColor: m.result === 'win' ? colors.green : m.result === 'loss' ? colors.pieceRed : '#3498db' },
                    ]}
                  />
                ))}
              </View>
            )}
            <View style={styles.matchList}>
              {recentMatches.map(match => (
                <View key={match.id} style={styles.matchRow}>
                  <Text style={[styles.matchResult, {
                    color: match.result === 'win' ? colors.green : match.result === 'loss' ? colors.pieceRed : colors.textSecondary,
                  }]}>
                    {match.result === 'win' ? 'W' : match.result === 'loss' ? 'L' : 'D'}
                  </Text>
                  <View style={styles.matchInfo}>
                    <Text style={styles.matchOpponent} numberOfLines={1}>vs {match.opponent}</Text>
                    <Text style={styles.matchMeta}>{match.moves} moves</Text>
                  </View>
                  {match.coinsEarned > 0 && (
                    <Text style={styles.matchCoins}>+{match.coinsEarned} 🪙</Text>
                  )}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  // Floating back button — matches the TopBar settings gear size /
  // color treatment. Sits above ScrollView content via high zIndex.
  backBtn: {
    position: 'absolute',
    top: 48,
    left: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,210,120,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  backIcon: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: weight.bold,
    marginTop: -4,
    marginLeft: -2,
  },
  content: {
    paddingTop: 16,
    paddingBottom: 100,
  },
  // Hero banner around the portrait card. The previous header was a
  // bare centered View; bumping in a subtle gradient + name shadow
  // makes the player feel like the page belongs to THEM (Devon's
  // "profile needs a visual overhaul" cue).
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    marginBottom: 20,
    backgroundColor: 'rgba(255,140,0,0.04)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,200,120,0.15)',
    paddingBottom: 18,
  },
  avatarSection: {
    marginBottom: 14,
  },
  playerName: {
    fontFamily: fonts.heading,
    fontWeight: weight.black,
    fontSize: 34,
    color: '#ffffff',
    letterSpacing: 0.5,
    textShadow: '0px 0px 14px rgba(255,200,80,0.5)',
  },
  playerTitleBadge: {
    marginTop: 2,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  playerTitleText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  levelSection: {
    width: '100%',
    maxWidth: 300,
    marginTop: 14,
    alignItems: 'center',
  },
  levelLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 6,
  },
  xpBarChunky: {
    width: '100%',
    height: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  xpFillChunky: {
    height: '100%',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  xpInsideText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: '#ffffff',
    textShadow: '0px 1px 2px rgba(0,0,0,0.4)',
  },
  nextRewardHint: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  profileLinks: {
    marginTop: 16,
    gap: 6,
  },
  profileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  profileLinkIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  profileLinkText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#ffffff',
    flex: 1,
  },
  profileLinkArrow: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '600',
  },
  // Section headers — bumped weight + added a thin orange accent rule
  // beneath via borderBottomWidth so each section feels like a proper
  // dashboard module instead of plain stacked text.
  sectionTitle: {
    fontFamily: fonts.body,
    fontWeight: weight.black,
    fontSize: 13,
    color: '#ffffff',
    letterSpacing: 2.5,
    paddingHorizontal: 20,
    paddingBottom: 6,
    marginBottom: 12,
    marginTop: 18,
    marginHorizontal: 16,
    borderBottomWidth: 1.5,
    borderBottomColor: 'rgba(255,140,0,0.35)',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    width: '30%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    boxShadow: '0px 2px 4px rgba(0,0,0,0.2)',
    elevation: 3,
  },
  statValue: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 26,
    marginBottom: 3,
  },
  // Flux-painted stat icon — sits above the number. Adds identity to each
  // stat card without cluttering the tight 3-column grid (cards are ~30%
  // of screen width).
  statIcon: {
    width: 28,
    height: 28,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  equippedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  equippedItem: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    boxShadow: '0px 2px 3px rgba(0,0,0,0.15)',
    elevation: 2,
  },
  equippedLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 5,
  },
  equippedName: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 16,
    marginBottom: 10,
  },
  matchList: {
    paddingHorizontal: 16,
    gap: 4,
    marginBottom: 16,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  matchResult: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 18,
    width: 24,
    textAlign: 'center',
  },
  matchInfo: {
    flex: 1,
  },
  matchOpponent: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 13,
    color: '#ffffff',
  },
  matchMeta: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 10,
    color: colors.textSecondary,
  },
  matchCoins: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.coinGold,
  },
  viewAllLink: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: colors.orange,
  },
  // Form guide dots
  formGuideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  formGuideLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginRight: 4,
  },
  formDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    boxShadow: '0px 0px 3px rgba(0,0,0,0.6)',
    elevation: 2,
  },
  // Favorite Opponent card
  favOpponentCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(255,140,0,0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.15)',
    gap: 10,
  },
  favOpponentIcon: {
    fontSize: 22,
  },
  favOpponentTextWrap: {
    flex: 1,
  },
  favOpponentLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  favOpponentName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 15,
    color: colors.orange,
    marginTop: 1,
  },
  favOpponentGames: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 12,
    color: colors.textSecondary,
  },
  // Achievement progress card
  achievementProgressCard: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,209,102,0.12)',
  },
  achProgressBarOuter: {
    width: '100%',
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  achProgressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  achProgressPct: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  // Coin Milestone
  milestoneCard: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,215,0,0.06)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.15)',
  },
  milestoneCurrentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  milestoneCurrentIcon: {
    fontSize: 18,
  },
  milestoneCurrentTitle: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: colors.coinGold,
    letterSpacing: 0.5,
  },
  milestoneProgressOuter: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  milestoneProgressFill: {
    height: '100%',
    borderRadius: 5,
  },
  milestoneNextText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: colors.textSecondary,
  },
  milestoneMaxText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 12,
    color: colors.coinGold,
    textAlign: 'center',
  },

  // Daily Goals
  dailyGoalsCard: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(100,180,255,0.06)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(100,180,255,0.15)',
  },
  dailyGoalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  dailyGoalIcon: {
    fontSize: 16,
  },
  dailyGoalLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 13,
    color: '#ffffff',
    flex: 1,
  },
  dailyGoalValue: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 15,
    color: colors.textSecondary,
  },
  dailyGoalCheck: {
    fontSize: 16,
  },

  // Career Progress
  careerCard: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,140,0,0.06)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.2)',
  },
  careerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  careerCityLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },
  careerCityName: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 18,
    color: colors.orange,
    marginTop: 1,
  },
  careerRepBox: {
    alignItems: 'center',
  },
  careerRepStars: {
    fontSize: 16,
    color: colors.coinGold,
    letterSpacing: 2,
  },
  careerRepLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 8,
    color: colors.textMuted,
    letterSpacing: 1,
    marginTop: 2,
  },
  careerProgressOuter: {
    width: '100%',
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  careerProgressFill: {
    height: '100%',
    borderRadius: 5,
  },
  careerStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  careerStatItem: {
    alignItems: 'center',
  },
  careerStatValue: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 16,
    color: '#ffffff',
  },
  careerStatLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    marginTop: 1,
  },

  // Share Profile button
  shareProfileBtn: {
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,150,0,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,150,0,0.3)',
  },
  shareProfileText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold as any,
    fontSize: 12,
    color: colors.orange,
    letterSpacing: 1.5,
  },

});
