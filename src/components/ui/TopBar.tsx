import React, { useMemo, useRef, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Image, ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';
import { haptics } from '../../services/haptics';
import { playSound } from '../../services/audio';
import { Character3DPortrait } from '../3d/Character3DPortrait';
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

  // Coin change flash animation: green for increase, red for decrease + scale pop
  const prevCoinsRef = useRef(coins);
  const coinFlashAnim = useRef(new Animated.Value(0)).current;
  const coinScaleAnim = useRef(new Animated.Value(1)).current;
  const [coinFlashColor, setCoinFlashColor] = useState('#27ae3d');
  useEffect(() => {
    if (coins !== prevCoinsRef.current) {
      setCoinFlashColor(coins > prevCoinsRef.current ? '#27ae3d' : '#e74c3c');
      // Color flash
      coinFlashAnim.setValue(1);
      Animated.timing(coinFlashAnim, { toValue: 0, duration: 500, useNativeDriver: false }).start();
      // Scale pop: 1 -> 1.15 -> 1
      coinScaleAnim.setValue(1.15);
      Animated.spring(coinScaleAnim, { toValue: 1, friction: 5, tension: 200, useNativeDriver: true }).start();
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
            onPress={() => { haptics.tap(); playSound('back'); onBackPress?.(); }}
            accessibilityLabel="Go back"
            accessibilityRole="button"
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
            onPress={() => { haptics.tap(); playSound('click'); onSettingsPress?.(); }}
            style={styles.settingsBtn}
            accessibilityLabel="Open settings"
            accessibilityRole="button"
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
        <CurrencyPill iconSource={require('../../assets/images/ui/icon-coin.png')} value={formatNum(coins)} onPress={onCoinPress} onPlusPress={onCoinPress} animatedTextColor={coinTextColor} scaleAnim={coinScaleAnim} label={`${coins} coins`} plusLabel="Buy more coins" />
        <CurrencyPill iconSource={require('../../assets/images/ui/icon-gem.png')} value={formatNum(gems)} onPress={onGemPress} onPlusPress={onGemPress} label={`${gems} gems`} plusLabel="Buy more gems" />
        <CurrencyPill iconSource={require('../../assets/images/ui/icon-streak.png')} value={level.toString()} label={`Level ${level}`} />
      </LinearGradient>

      {/* Right: Profile avatar + rank */}
      <Pressable
        onPress={() => { haptics.tap(); onProfilePress?.(); }}
        style={styles.avatarWrap}
        accessibilityLabel={`Open profile, level ${level}, ${rankLabel}`}
        accessibilityRole="button"
      >
        <LinearGradient
          colors={['#d4ac0d', '#f1c40f', '#d4ac0d']}
          style={styles.avatarRing}
        >
          <View style={styles.avatarInner}>
            <Character3DPortrait width={34} height={34} showFloor={false} />
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

function CurrencyPill({ iconSource, value, onPress, onPlusPress, animatedTextColor, scaleAnim, label, plusLabel }: {
  iconSource: ImageSourcePropType; value: string; onPress?: () => void; onPlusPress?: () => void; animatedTextColor?: Animated.AnimatedInterpolation<string>; scaleAnim?: Animated.Value; label?: string; plusLabel?: string;
}) {
  // IMPORTANT: on web RN's Pressable renders as <button>. The main tap area
  // and the "+" badge used to be nested Pressables → nested <button> in the
  // DOM, which React flags as a hydration error and which causes unreliable
  // "+" clicks in some browsers. The pill is now a plain View with two
  // sibling Pressables (tap area + "+"), so each button stays flat.
  const tapArea = (
    <Pressable
      onPress={onPress ? () => { haptics.tap(); onPress(); } : undefined}
      style={styles.pillInner}
      accessibilityLabel={label}
      accessibilityRole={onPress ? 'button' : 'text'}
    >
      <Image source={iconSource} style={styles.pillIcon} resizeMode="contain" />
      {animatedTextColor ? (
        <Animated.Text style={[styles.pillValue, { color: animatedTextColor }]}>{value}</Animated.Text>
      ) : (
        <Text style={styles.pillValue}>{value}</Text>
      )}
    </Pressable>
  );

  const plus = onPlusPress ? (
    <Pressable
      onPress={() => { haptics.tap(); onPlusPress(); }}
      accessibilityLabel={plusLabel}
      accessibilityRole="button"
    >
      <LinearGradient
        colors={['#34c94d', '#27ae3d', '#1e8a30']}
        style={styles.plusBtn}
      >
        <Text style={styles.plusText}>+</Text>
      </LinearGradient>
    </Pressable>
  ) : null;

  if (scaleAnim) {
    return (
      <Animated.View style={[styles.pill, { transform: [{ scale: scaleAnim }] }]}>
        {tapArea}
        {plus}
      </Animated.View>
    );
  }

  return (
    <View style={styles.pill}>
      {tapArea}
      {plus}
    </View>
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
    backgroundColor: 'rgba(0,0,0,0.62)',
    borderRadius: 18,
    paddingLeft: 4,
    paddingRight: 3,
    paddingVertical: 3,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    shadowColor: 'rgba(0,0,0,0.8)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  pillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 2,
  },
  // Flux-generated painted icon — coin / gem / streak flame. Replaces emoji
  // so currency reads as premium game art rather than system-font glyphs.
  pillIcon: {
    width: 22,
    height: 22,
  },
  pillValue: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: '#ffffff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    minWidth: 16,
  },
  // "+" buy-more badge. Sits inside the pill, slightly smaller than the
  // painted currency icon so it reads as a button rather than competing
  // with the icon for attention. Single subtle green glow only — the pill
  // itself already has a drop shadow, stacking two read as muddy.
  plusBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#34c94d',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 3,
    elevation: 2,
  },
  plusText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    lineHeight: 16,
    color: '#ffffff',
    marginTop: -1,
    textShadowColor: 'rgba(0,40,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  avatarWrap: {
    position: 'relative',
    alignItems: 'center',
    minWidth: 56,
    flexShrink: 0,
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
    fontSize: 9,
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: 0.2,
    minWidth: 56,
  },
});
