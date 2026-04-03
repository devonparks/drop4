import React from 'react';
import { Text } from 'react-native';
import { CharacterRenderer } from './CharacterRenderer';

interface CharacterAvatarProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  variant?: 'player' | 'bot_easy' | 'bot_medium' | 'bot_hard';
  style?: any;
}

const sizeMap = {
  small: 22,
  medium: 26,
  large: 150,
  xlarge: 200,
};

// Bot characters use emoji since they don't have custom configs
const botEmoji: Record<string, string> = {
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

  // Bot variants use emoji
  if (variant !== 'player') {
    return (
      <Text style={[{ fontSize: px > 50 ? px * 0.6 : px }, style]}>
        {botEmoji[variant] || '🤖'}
      </Text>
    );
  }

  // Player variant uses the character layer renderer
  const headOnly = size === 'small' || size === 'medium';

  return (
    <CharacterRenderer
      size={px}
      headOnly={headOnly}
      style={style}
    />
  );
};
