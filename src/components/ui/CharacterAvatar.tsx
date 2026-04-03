import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import { useShopStore } from '../../stores/shopStore';

interface CharacterAvatarProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  variant?: 'player' | 'bot_easy' | 'bot_medium' | 'bot_hard';
  style?: any;
}

// Character images exported directly from Unity character creator.
// Placeholder transparent PNGs exist by default — Unity overwrites them with real renders.
const characterImages: Record<string, ImageSourcePropType> = {
  player_avatar: require('../../assets/images/characters/player_avatar.png'),
  player_idle: require('../../assets/images/characters/player_idle.png'),
  player_play: require('../../assets/images/characters/player_play.png'),
  player_front: require('../../assets/images/characters/player_front.png'),
  bot_easy_avatar: require('../../assets/images/characters/bot_easy_avatar.png'),
  bot_easy_idle: require('../../assets/images/characters/bot_easy_idle.png'),
  bot_medium_avatar: require('../../assets/images/characters/bot_medium_avatar.png'),
  bot_hard_avatar: require('../../assets/images/characters/bot_hard_avatar.png'),
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

  // Check if we have a real image for this variant + size
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

  // Fallback to emoji until images are exported
  return (
    <Text style={[{ fontSize: px }, style]}>
      {fallbackEmoji[variant] || '😎'}
    </Text>
  );
};

const styles = StyleSheet.create({
  largeImage: {
    width: 150,
    height: 200,
  },
  xlargeImage: {
    width: 180,
    height: 250,
  },
});
