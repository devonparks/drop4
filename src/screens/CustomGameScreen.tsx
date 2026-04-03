import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useShopStore } from '../stores/shopStore';
import { useGameStore } from '../stores/gameStore';
import { haptics } from '../services/haptics';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CustomGame'>;
};

// Setting picker component
function SettingRow({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (val: string) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map(opt => (
          <Pressable
            key={opt.value}
            onPress={() => { haptics.tap(); onChange(opt.value); }}
            style={[styles.optionBtn, value === opt.value && styles.optionBtnActive]}
          >
            <Text style={[styles.optionText, value === opt.value && styles.optionTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function CustomGameScreen({ navigation }: Props) {
  const { coins, gems, level } = useShopStore();
  const newGame = useGameStore(s => s.newGame);

  const [boardSize, setBoardSize] = useState('6x7');
  const [connectCount, setConnectCount] = useState('4');
  const [timer, setTimer] = useState('none');
  const [firstMove, setFirstMove] = useState('random');
  const [opponent, setOpponent] = useState('ai_medium');

  const startCustomGame = () => {
    haptics.tap();
    const isAi = opponent !== 'local';
    const difficulty = opponent === 'ai_easy' ? 'easy' : opponent === 'ai_hard' ? 'hard' : 'medium';

    // Parse board size
    const [cols, rows] = boardSize.split('x').map(Number);

    newGame(difficulty as any, isAi, {
      rows: rows || 7,
      cols: cols || 6,
      connectCount: parseInt(connectCount) || 4,
      timerSeconds: timer === 'none' ? 0 : parseInt(timer) || 0,
    });
    navigation.navigate('Game');
  };

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <TopBar
          coins={coins}
          gems={gems}
          level={level}
          showBack
          onBackPress={() => navigation.goBack()}
        />

        <View style={styles.header}>
          <Text style={styles.title}>CUSTOM GAME</Text>
          <Text style={styles.subtitle}>Your rules, your way</Text>
        </View>

        <View style={styles.settingsWrap}>
          <SettingRow
            label="Board Size"
            value={boardSize}
            options={[
              { label: '5x5', value: '5x5' },
              { label: '6x7', value: '6x7' },
              { label: '7x8', value: '7x8' },
              { label: '8x9', value: '8x9' },
            ]}
            onChange={setBoardSize}
          />

          <SettingRow
            label="Connect"
            value={connectCount}
            options={[
              { label: '3', value: '3' },
              { label: '4', value: '4' },
              { label: '5', value: '5' },
              { label: '6', value: '6' },
            ]}
            onChange={setConnectCount}
          />

          <SettingRow
            label="Timer"
            value={timer}
            options={[
              { label: 'None', value: 'none' },
              { label: '5s', value: '5' },
              { label: '10s', value: '10' },
              { label: '30s', value: '30' },
            ]}
            onChange={setTimer}
          />

          <SettingRow
            label="First Move"
            value={firstMove}
            options={[
              { label: 'Random', value: 'random' },
              { label: 'You', value: 'player' },
              { label: 'Opponent', value: 'opponent' },
            ]}
            onChange={setFirstMove}
          />

          <SettingRow
            label="Opponent"
            value={opponent}
            options={[
              { label: 'Easy AI', value: 'ai_easy' },
              { label: 'Med AI', value: 'ai_medium' },
              { label: 'Hard AI', value: 'ai_hard' },
              { label: 'Local', value: 'local' },
            ]}
            onChange={setOpponent}
          />
        </View>

        <View style={styles.startWrap}>
          <GlossyButton
            label="START GAME"
            variant="orange"
            iconRight="▶"
            onPress={startCustomGame}
          />
        </View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 28,
    color: '#ffffff',
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  settingsWrap: {
    flex: 1,
    paddingHorizontal: 16,
    gap: 12,
  },
  settingRow: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  settingLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 13,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionBtnActive: {
    backgroundColor: 'rgba(255,140,0,0.15)',
    borderColor: colors.orange,
  },
  optionText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 13,
    color: colors.textSecondary,
  },
  optionTextActive: {
    color: colors.orange,
  },
  startWrap: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 8,
  },
});
