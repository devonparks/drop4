import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

interface PlayerProfileCardProps {
  name: string;
  level: number;
  elo?: number;
  tier?: string;
  tierIcon?: string;
  tierColor?: string;
  isOnline?: boolean;
  compact?: boolean;
  side?: 'left' | 'right';
}

export function PlayerProfileCard({
  name,
  level,
  elo,
  tier,
  tierIcon,
  tierColor,
  isOnline,
  compact = false,
  side = 'left',
}: PlayerProfileCardProps) {
  const initial = name.charAt(0).toUpperCase();

  // Generate a deterministic color from the name
  const avatarHue = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  const avatarBg = `hsl(${avatarHue}, 60%, 40%)`;

  const avatarSize = compact ? 36 : 50;
  const avatarRadius = avatarSize / 2;
  const avatarFontSize = compact ? 16 : 22;

  return (
    <View style={[
      styles.container,
      compact && styles.containerCompact,
      side === 'right' && styles.containerRight,
    ]}>
      {/* Avatar circle */}
      <View style={[
        styles.avatarWrap,
        { width: avatarSize, height: avatarSize, borderRadius: avatarRadius },
      ]}>
        <View style={[
          styles.avatar,
          {
            width: avatarSize - 4,
            height: avatarSize - 4,
            borderRadius: (avatarSize - 4) / 2,
            backgroundColor: avatarBg,
          },
        ]}>
          <Text style={[styles.avatarInitial, { fontSize: avatarFontSize }]}>{initial}</Text>
        </View>
        {/* Online indicator */}
        {isOnline && (
          <View style={[
            styles.onlineDot,
            compact && styles.onlineDotCompact,
          ]} />
        )}
      </View>

      {/* Info column */}
      <View style={[
        styles.info,
        side === 'right' && styles.infoRight,
      ]}>
        <View style={[styles.nameRow, side === 'right' && { justifyContent: 'flex-end' }]}>
          <Text style={[styles.name, compact && styles.nameCompact]} numberOfLines={1}>
            {name}
          </Text>
          {/* Level badge */}
          <View style={[styles.levelBadge, compact && styles.levelBadgeCompact]}>
            <Text style={[styles.levelText, compact && styles.levelTextCompact]}>{level}</Text>
          </View>
        </View>

        {/* ELO + Tier row */}
        {elo !== undefined && (
          <View style={[styles.tierRow, side === 'right' && { justifyContent: 'flex-end' }]}>
            {tierIcon && <Text style={styles.tierIcon}>{tierIcon}</Text>}
            {tier && (
              <Text style={[styles.tierName, tierColor ? { color: tierColor } : {}]}>
                {tier}
              </Text>
            )}
            <Text style={styles.eloText}>{elo}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  containerCompact: {
    padding: 6,
    gap: 8,
    borderRadius: 10,
  },
  containerRight: {
    flexDirection: 'row-reverse',
  },
  avatarWrap: {
    position: 'relative',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    color: '#ffffff',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.green,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  onlineDotCompact: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  info: {
    flex: 1,
  },
  infoRight: {
    alignItems: 'flex-end',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#ffffff',
  },
  nameCompact: {
    fontSize: 12,
  },
  levelBadge: {
    backgroundColor: colors.orange,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  levelBadgeCompact: {
    paddingHorizontal: 4,
    paddingVertical: 0,
    borderRadius: 6,
  },
  levelText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 10,
    color: '#ffffff',
  },
  levelTextCompact: {
    fontSize: 9,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  tierIcon: {
    fontSize: 14,
  },
  tierName: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: colors.textSecondary,
  },
  eloText: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textMuted,
  },
});
