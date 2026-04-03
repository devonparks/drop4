import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, View } from 'react-native';

interface CharacterAvatarProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  variant?: 'player' | 'bot_easy' | 'bot_medium' | 'bot_hard';
  style?: any;
}

// Character images exported from Unity Synty Character Creator.
// Drop4Exporter.cs renders these directly to this folder.
const characterImages: Record<string, ImageSourcePropType> = {
  player_avatar: require('../../assets/images/characters/player_avatar.png'),
  player_idle: require('../../assets/images/characters/player_idle.png'),
  player_play: require('../../assets/images/characters/player_play.png'),
  player_front: require('../../assets/images/characters/player_front.png'),
  bot_easy_avatar: require('../../assets/images/characters/bot_easy_avatar.png'),
  bot_easy_idle: require('../../assets/images/characters/bot_easy_idle.png'),
  bot_medium_avatar: require('../../assets/images/characters/bot_medium_avatar.png'),
  bot_medium_idle: require('../../assets/images/characters/bot_medium_idle.png'),
  bot_hard_avatar: require('../../assets/images/characters/bot_hard_avatar.png'),
  bot_hard_idle: require('../../assets/images/characters/bot_hard_idle.png'),
};

const sizeMap = {
  small: 22,   // TopBar avatar
  medium: 26,  // PlayerHUD avatar
  large: 72,   // HomeScreen
  xlarge: 100, // PlayScreen
};

const fallbackEmoji: Record<string, string> = {
  player: '😎',
  bot_easy: '🤖',
  bot_medium: '🤖',
  bot_hard: '🤖',
};

export const CharacterAvatar: React.FC<CharacterAvatarProps> = ({
  size = 'medium',
  variant = 'player',
  style,
}) => {
  const px = sizeMap[size];

  // Select image based on variant + size context
  const imageKey = size === 'large' || size === 'xlarge'
    ? `${variant === 'player' ? 'player' : variant}_idle`
    : `${variant === 'player' ? 'player' : variant}_avatar`;

  const imageSource = characterImages[imageKey];

  if (imageSource) {
    return (
      <Image
        source={imageSource}
        style={[
          { width: px, height: px },
          size === 'large' && styles.largeImage,
          size === 'xlarge' && styles.xlargeImage,
          style,
        ]}
        resizeMode="contain"
      />
    );
  }

  // Fallback to emoji if images haven't been exported yet
  return (
    <Text style={[{ fontSize: px }, style]}>
      {fallbackEmoji[variant] || '😎'}
    </Text>
  );
};

const styles = StyleSheet.create({
  largeImage: {
    width: 160,
    height: 160,
  },
  xlargeImage: {
    width: 200,
    height: 200,
  },
});
