import React, { useMemo, useRef, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';
import { haptics } from '../../services/haptics';
import { CharacterAvatar } from './CharacterAvatar';
import { useRankedStore, RANKED_TIERS, formatRank } from '../../stores/rankedStore';

interface TopBarProps {
  coins: number;
  gems: number;
  level: number;
  showBack?: boolean;
  onBackPress?: () => void;
  onProfilePress?: () => void;
  onSettingsPress?: () => void;
  onCoinPress?: () => void;
  onGemPress?: () => void;
}

export function TopBar({
  coins,
  gems,
  level,
  showBack = false,
  onBackPress,
  onProfilePress,
  onSettingsPress,
  onCoinPress,
  onGemPress,
}: TopBarProps) {
  const elo = useRankedStore(s => s.elo);
  const tier = useRankedStore(s => s.tier);
  const tierInfo = useMemo(() => RANKED_TIERS.find(t => t.id === tier) || RANKED_TIERS[0], [tier]);
  const rankLabel = useMemo(() => formatRank(elo), [elo]);

  const formatNum = (n: number) =>
    n >= 10000 ? `${(n / 1000).toFixed(0)}k` :
    n >= 1000 ? n.toLocaleString() :
    n.toString();

  // Coin change flash animation: green for increase, red for decrease
  const prevCoinsRef = useRef(coins);
  const coinFlashAnim = useRef(new Animated.Value(0)).current;
  const [coinFlashColor, setCoinFlashColor] = useState('#27ae3d');
  useEffect(() => {
    if (coins !== prevCoinsRef.current) {
      setCoinFlashColor(coins > prevCoinsRef.current ? '#27ae3d' : '#e74c3c');
      coinFlashAnim.setValue(1);
      Animated.timing(coinFlashAnim, { toValue: 0, duration: 500, useNativeDriver: false }).start();
      prevCoinsRef.current = coins;
    }
  }, [coins]);

  const coinTextColor = coinFlashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#ffffff', coinFlashColor],
  });

  return (
    <View style={styles.container}>
      {/* Left: Back or Settings */}
      <View style={styles.leftSlot}>
        {showBack ? (
          <Pressable
            onPress={() => { haptics.tap(); onBackPress?.(); }}
          >
            <LinearGradient
              colors={['#ffa733', '#ff8c00', '#cc7000']}
              style={styles.backBtn}
            >
              <Text style={styles.backIcon}>{'<'}</Text>
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => { haptics.tap(); onSettingsPress?.(); }}
            style={styles.settingsBtn}
          >
            <Text style={styles.settingsIcon}>{'⚙'}</Text>
          </Pressable>
        )}
      </View>

      {/* Center: Currency displays */}
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.currencies}
      >
        <CurrencyPill emoji="🪙" value={formatNum(coins)} color={colors.coinGold} onPress={onCoinPress} onPlusPress={onCoinPress} animatedTextColor={coinTextColor} />
        <CurrencyPill emoji="💎" value={formatNum(gems)} color={colors.gemGreen} onPress={onGemPress} onPlusPress={onGemPress} />
        <CurrencyPill emoji="🔴" value={level.toString()} color={colors.red} />
      </LinearGradient>

      {/* Right: Profile avatar + rank */}
      <Pressable
        onPress={() => { haptics.tap(); onProfilePress?.(); }}
        style={styles.avatarWrap}
      >
        <LinearGradient
          colors={['#d4ac0d', '#f1c40f', '#d4ac0d']}
          style={styles.avatarRing}
        >
          <View style={styles.avatarInner}>
            <CharacterAvatar size="small" variant="player" />
          </View>
        </LinearGradient>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>{level}</Text>
        </View>
        <Text style={[styles.rankLabel, { color: tierInfo.color }]} numberOfLines={1}>{rankLabel}</Text>
      </Pressable>
    </View>
  );
}

function CurrencyPill({ emoji, value, color, onPress, onPlusPress, animatedTextColor }: {
  emoji: string; value: string; color: string; onPress?: () => void; onPlusPress?: () => void; animatedTextColor?: Animated.AnimatedInterpolation<string>;
}) {
  return (
    <Pressable onPress={() => { haptics.tap(); onPress?.(); }} style={styles.pill}>
      <Text style={styles.pillEmoji}>{emoji}</Text>
      {animatedTextColor ? (
        <Animated.Text style={[styles.pillValue, { color: animatedTextColor }]}>{value}</Animated.Text>
      ) : (
        <Text style={styles.pillValue}>{value}</Text>
      )}
      <Pressable onPress={() => { haptics.tap(); onPlusPress?.(); }}>
        <LinearGradient
          colors={['#34c94d', '#27ae3d', '#1e8a30']}
          style={styles.plusBtn}
        >
          <Text style={styles.plusText}>+</Text>
        </LinearGradient>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 10,
  },
  leftSlot: {
    width: 40,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff8c00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  backIcon: {
    fontSize: 18,
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    color: '#fff',
  },
  settingsBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  settingsIcon: {
    fontSize: 20,
  },
  currencies: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flex: 1,
    justifyContent: 'center',
    borderRadius: 20,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    paddingLeft: 6,
    paddingRight: 2,
    paddingVertical: 3,
    gap: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: 'rgba(0,0,0,0.8)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  pillEmoji: {
    fontSize: 17,
  },
  pillValue: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: '#ffffff',
    textShadowColor: 'rgba(255,255,255,0.15)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
  plusBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 1,
    shadowColor: '#34c94d',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
  },
  plusText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: '#ffffff',
    marginTop: -1,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatarRing: {
    width: 42,
    height: 42,
    borderRadius: 21,
    padding: 2,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
    backgroundColor: '#1a1a3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 22,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0a0e27',
  },
  levelText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: '#ffffff',
  },
  rankLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 8,
    textAlign: 'center',
    marginTop: 1,
    letterSpacing: 0.3,
  },
});
