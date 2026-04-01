import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';
import { haptics } from '../../services/haptics';

interface TopBarProps {
  coins: number;
  gems: number;
  level: number;
  showBack?: boolean;
  onBackPress?: () => void;
  onProfilePress?: () => void;
}

export function TopBar({
  coins,
  gems,
  level,
  showBack = false,
  onBackPress,
  onProfilePress,
}: TopBarProps) {
  return (
    <View style={styles.container}>
      {/* Left: Back button or Settings */}
      <View style={styles.leftSlot}>
        {showBack ? (
          <Pressable
            onPress={() => { haptics.tap(); onBackPress?.(); }}
            style={styles.backBtn}
          >
            <Text style={styles.backIcon}>{'<'}</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => haptics.tap()}
            style={styles.settingsBtn}
          >
            <Text style={styles.settingsIcon}>{'⚙'}</Text>
          </Pressable>
        )}
      </View>

      {/* Center: Currency displays */}
      <View style={styles.currencies}>
        <CurrencyPill emoji="🪙" value={coins} color={colors.coinGold} />
        <CurrencyPill emoji="💎" value={gems} color={colors.gemGreen} />
        <CurrencyPill emoji="🔴" value={level} color={colors.red} />
      </View>

      {/* Right: Profile avatar */}
      <Pressable
        onPress={() => { haptics.tap(); onProfilePress?.(); }}
        style={styles.avatarWrap}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>😎</Text>
        </View>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>{level}</Text>
        </View>
      </Pressable>
    </View>
  );
}

function CurrencyPill({ emoji, value, color }: { emoji: string; value: number; color: string }) {
  const formattedValue = value >= 1000
    ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`
    : value.toString();

  return (
    <View style={styles.pill}>
      <Text style={styles.pillEmoji}>{emoji}</Text>
      <Text style={styles.pillValue}>{formattedValue.toLocaleString()}</Text>
      <Pressable onPress={() => haptics.tap()} style={styles.plusBtn}>
        <Text style={styles.plusText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    zIndex: 10,
  },
  leftSlot: {
    width: 44,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  backIcon: {
    fontSize: 20,
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    color: '#fff',
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    fontSize: 22,
  },
  currencies: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    paddingLeft: 6,
    paddingRight: 2,
    paddingVertical: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  pillEmoji: {
    fontSize: 16,
  },
  pillValue: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#ffffff',
  },
  plusBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  plusText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#ffffff',
    marginTop: -1,
  },
  avatarWrap: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarEmoji: {
    fontSize: 24,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bgDark,
  },
  levelText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: '#ffffff',
  },
});
