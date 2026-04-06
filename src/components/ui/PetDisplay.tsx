import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';
import { getPetById } from '../../data/pets';

// ═══════════════════════════════════════════════════════════
// PET DISPLAY — Shows equipped dog pet next to the character
// Positioned bottom-right of the character stage area.
// Uses sit image when idle, idle image when character is active.
// ═══════════════════════════════════════════════════════════

interface PetDisplayProps {
  /** Pet ID (null = no pet shown) */
  petId: string | null;
  /** Display size for the pet image */
  size?: number;
  /** Whether the character is currently idle (sit pose) or active */
  isIdle?: boolean;
  /** Additional styles */
  style?: any;
}

export function PetDisplay({ petId, size = 80, isIdle = true, style }: PetDisplayProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (petId) {
      // Fade + bounce in when pet appears
      fadeAnim.setValue(0);
      bounceAnim.setValue(8);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(bounceAnim, {
          toValue: 0,
          speed: 14,
          bounciness: 12,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [petId]);

  if (!petId) return null;

  const pet = getPetById(petId);
  if (!pet) return null;

  const source = isIdle ? pet.sitImage : pet.idleImage;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          opacity: fadeAnim,
          transform: [{ translateY: bounceAnim }],
        },
        style,
      ]}
    >
      <Image
        source={source}
        style={styles.petImage}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  petImage: {
    width: '100%',
    height: '100%',
  },
});
