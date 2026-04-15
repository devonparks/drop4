import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { SlideInDown } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlossyButton } from './GlossyButton';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

export function WelcomeOverlay() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(true); // Start dismissed, check storage

  useEffect(() => {
    AsyncStorage.getItem('drop4_welcome_dismissed').then(val => {
      if (val === 'true') {
        setDismissed(true);
      } else {
        setDismissed(false);
        const timer = setTimeout(() => setVisible(true), 1500);
        return () => clearTimeout(timer);
      }
    });
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    AsyncStorage.setItem('drop4_welcome_dismissed', 'true');
  };

  if (dismissed || !visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.overlay}>
        <Animated.View entering={SlideInDown.springify().damping(12)} style={styles.card}>
          <LinearGradient
            colors={['rgba(255,140,0,0.15)', 'rgba(255,140,0,0.05)', 'transparent']}
            style={styles.glow}
          />
          <Text style={styles.emoji}>🎮</Text>
          <Text style={styles.title}>Welcome to Drop4!</Text>
          <Text style={styles.message}>
            Stack pieces, connect four in a row, and dominate the competition.
            Start with a Quick Match or dive into Career Mode!
          </Text>
          <View style={styles.features}>
            <Text style={styles.feature}>🎯 Play against AI at 3 difficulty levels</Text>
            <Text style={styles.feature}>🏆 36 Career levels with boss battles</Text>
            <Text style={styles.feature}>🎨 Unlock board skins and piece styles</Text>
            <Text style={styles.feature}>🕺 Express yourself with emotes</Text>
          </View>
          <GlossyButton
            label="LET'S GO!"
            variant="orange"
            onPress={handleDismiss}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  card: {
    width: '85%', maxWidth: 340, backgroundColor: colors.surface,
    borderRadius: 24, padding: 24, alignItems: 'center', overflow: 'hidden',
    borderWidth: 1, borderColor: colors.surfaceBorder,
  },
  glow: { ...StyleSheet.absoluteFillObject, borderRadius: 24 },
  emoji: { fontSize: 48, marginBottom: 8 },
  title: { fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 22, color: '#ffffff', marginBottom: 8 },
  message: {
    fontFamily: fonts.body, fontWeight: weight.regular,
    fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 19, marginBottom: 14,
  },
  features: { width: '100%', gap: 6, marginBottom: 16 },
  feature: {
    fontFamily: fonts.body, fontWeight: weight.medium,
    fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 18,
  },
});
