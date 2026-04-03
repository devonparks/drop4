import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

interface GameTimerProps {
  seconds: number;        // Total seconds per turn
  isActive: boolean;      // Is this player's turn
  onTimeUp: () => void;   // Called when timer hits 0
  playerColor: 'red' | 'yellow';
}

export function GameTimer({ seconds, isActive, onTimeUp, playerColor }: GameTimerProps) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset timer when turn changes
  useEffect(() => {
    setRemaining(seconds);
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (isActive && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            onTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, seconds]);

  if (seconds <= 0) return null; // No timer mode

  const pct = (remaining / seconds) * 100;
  const isLow = remaining <= 5;
  const barColor = isLow ? colors.red : playerColor === 'red' ? colors.pieceRed : colors.pieceYellow;

  return (
    <View style={styles.container}>
      <View style={styles.timerBar}>
        <View style={[styles.timerFill, {
          width: `${pct}%`,
          backgroundColor: barColor,
        }]} />
      </View>
      <Text style={[styles.timerText, isLow && { color: colors.red }]}>
        {remaining}s
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  timerBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
    borderRadius: 3,
  },
  timerText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: '#ffffff',
    width: 30,
    textAlign: 'right',
  },
});
