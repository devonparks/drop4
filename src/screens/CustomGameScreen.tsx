import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Switch, Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { GlossyButton } from '../components/ui/GlossyButton';
import { useShopStore } from '../stores/shopStore';
import { useGameStore } from '../stores/gameStore';
import { useChallengeStore } from '../stores/challengeStore';
import { haptics } from '../services/haptics';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CustomGame'>;
};

// ═══════════════════════════════════════════════════════════
// SETTING PICKER — compact pill buttons
// ═══════════════════════════════════════════════════════════

function SettingRow({ label, icon, value, options, onChange }: {
  label: string;
  icon?: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (val: string) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLabelRow}>
        {icon && <Text style={styles.settingIcon}>{icon}</Text>}
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
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

// ═══════════════════════════════════════════════════════════
// MODIFIER TOGGLE — switch with emoji + description
// ═══════════════════════════════════════════════════════════

function ModifierToggle({ icon, name, description, value, onChange }: {
  icon: string;
  name: string;
  description: string;
  value: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <Pressable
      onPress={() => { haptics.tap(); onChange(!value); }}
      style={[styles.modifierRow, value && styles.modifierRowActive]}
    >
      <Text style={styles.modifierIcon}>{icon}</Text>
      <View style={styles.modifierInfo}>
        <Text style={[styles.modifierName, value && styles.modifierNameActive]}>{name}</Text>
        <Text style={styles.modifierDesc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(val) => { haptics.tap(); onChange(val); }}
        trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(255,140,0,0.4)' }}
        thumbColor={value ? colors.orange : 'rgba(255,255,255,0.4)'}
        ios_backgroundColor="rgba(255,255,255,0.1)"
      />
    </Pressable>
  );
}

// ═══════════════════════════════════════════════════════════
// SECTION CARD — wraps each settings group
// ═══════════════════════════════════════════════════════════

function SectionCard({ title, icon, children }: {
  title: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>{icon}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════
// CUSTOM GAME SCREEN — "PRIVATE MATCH"
// ═══════════════════════════════════════════════════════════

export function CustomGameScreen({ navigation }: Props) {
  const coins = useShopStore(s => s.coins);
  const gems = useShopStore(s => s.gems);
  const level = useShopStore(s => s.level);
  const newGame = useGameStore(s => s.newGame);

  // ── Game Rules ──
  const [boardSize, setBoardSize] = useState('6x7');
  const [connectCount, setConnectCount] = useState('4');
  const [timer, setTimer] = useState('none');
  const [firstMove, setFirstMove] = useState('random');
  const [winCondition, setWinCondition] = useState('first1');

  // ── Modifiers ──
  const [gravityFlip, setGravityFlip] = useState(false);
  const [randomStart, setRandomStart] = useState(false);
  const [suddenDeath, setSuddenDeath] = useState(false);
  const [blindMode, setBlindMode] = useState(false);
  const [sniperMode, setSniperMode] = useState(false);

  // ── Game Speed ──
  const [gameSpeed, setGameSpeed] = useState<'normal' | 'fast' | 'instant'>('normal');

  // ── Opponent ──
  const [opponent, setOpponent] = useState('ai_medium');

  // ── Match Code ──
  const [matchCode, setMatchCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

  // Parse current board dimensions for validation
  const [parsedCols, parsedRows] = boardSize.split('x').map(Number);
  const maxConnect = Math.min(parsedCols || 6, parsedRows || 7);
  const currentConnect = parseInt(connectCount) || 4;
  const isInvalidCombo = currentConnect > maxConnect;

  // Auto-clamp connectCount when board size shrinks below it
  const handleBoardSizeChange = (val: string) => {
    setBoardSize(val);
    const [newCols, newRows] = val.split('x').map(Number);
    const newMax = Math.min(newCols, newRows);
    if (parseInt(connectCount) > newMax) {
      setConnectCount(String(newMax));
    }
  };

  // Cap connectCount if user picks a value too large for the board
  const handleConnectChange = (val: string) => {
    const n = parseInt(val);
    if (n > maxConnect) {
      setConnectCount(String(maxConnect));
    } else {
      setConnectCount(val);
    }
  };

  // Generate a random 6-char match code
  const handleCreateMatch = () => {
    haptics.tap();
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    setGeneratedCode(code);
  };

  const startCustomGame = () => {
    haptics.tap();
    const isAi = !['local', 'online'].includes(opponent);
    const difficulty = opponent === 'ai_easy' ? 'easy'
      : opponent === 'ai_hard' ? 'hard'
      : opponent === 'ai_impossible' ? 'hard'
      : 'medium';

    // Parse board size
    const [cols, rows] = boardSize.split('x').map(Number);

    // Determine starting player
    let startingPlayer: 1 | 2 = 1;
    if (firstMove === 'player2') startingPlayer = 2;
    else if (firstMove === 'random') startingPlayer = Math.random() < 0.5 ? 1 : 2;

    newGame(difficulty as any, isAi, {
      rows: rows || 7,
      cols: cols || 6,
      connectCount: parseInt(connectCount) || 4,
      timerSeconds: timer === 'none' ? 0 : parseInt(timer) || 0,
      startingPlayer,
    });
    useChallengeStore.getState().updateProgress('try_custom', 1);
    const seriesWinsNeeded = winCondition === 'bo3' ? 2
      : winCondition === 'bo5' ? 3
      : winCondition === 'bo7' ? 4
      : undefined;
    navigation.navigate('Game', {
      gameSpeed: gameSpeed !== 'normal' ? gameSpeed : undefined,
      seriesWinsNeeded,
    } as any);
  };

  const activeModCount = [gravityFlip, randomStart, suddenDeath, blindMode, sniperMode].filter(Boolean).length;

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

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ══ HEADER ══ */}
          <View style={styles.header}>
            <Text style={styles.title}>PRIVATE MATCH</Text>
            <Text style={styles.subtitle}>Your rules, your way</Text>
          </View>

          {/* ══ GAME RULES ══ */}
          <SectionCard title="GAME RULES" icon="🎮">
            <SettingRow
              label="Board Size"
              icon="📐"
              value={boardSize}
              options={[
                { label: '5x5', value: '5x5' },
                { label: '5x6', value: '5x6' },
                { label: '6x7', value: '6x7' },
                { label: '7x8', value: '7x8' },
                { label: '8x9', value: '8x9' },
                { label: '10x10', value: '10x10' },
              ]}
              onChange={handleBoardSizeChange}
            />

            <SettingRow
              label="Connect Count"
              icon="🔗"
              value={connectCount}
              options={[
                { label: '3', value: '3' },
                { label: '4', value: '4' },
                { label: '5', value: '5' },
                { label: '6', value: '6' },
                { label: '7', value: '7' },
              ]}
              onChange={handleConnectChange}
            />

            {isInvalidCombo && (
              <Text style={styles.warningText}>
                Connect {currentConnect} is impossible on a {boardSize} board (max: {maxConnect})
              </Text>
            )}

            <SettingRow
              label="Turn Timer"
              icon="⏱"
              value={timer}
              options={[
                { label: 'None', value: 'none' },
                { label: '3s', value: '3' },
                { label: '5s', value: '5' },
                { label: '10s', value: '10' },
                { label: '15s', value: '15' },
                { label: '30s', value: '30' },
                { label: '60s', value: '60' },
              ]}
              onChange={setTimer}
            />

            <SettingRow
              label="First Move"
              icon="🎯"
              value={firstMove}
              options={[
                { label: 'Random', value: 'random' },
                { label: 'Player 1', value: 'player1' },
                { label: 'Player 2', value: 'player2' },
              ]}
              onChange={setFirstMove}
            />

            <SettingRow
              label="Win Condition"
              icon="🏆"
              value={winCondition}
              options={[
                { label: 'First to 1', value: 'first1' },
                { label: 'Best of 3', value: 'bo3' },
                { label: 'Best of 5', value: 'bo5' },
                { label: 'Best of 7', value: 'bo7' },
              ]}
              onChange={setWinCondition}
            />

            <SettingRow
              label="Game Speed"
              icon="⚡"
              value={gameSpeed}
              options={[
                { label: 'Normal', value: 'normal' },
                { label: 'Fast', value: 'fast' },
                { label: 'Instant', value: 'instant' },
              ]}
              onChange={(val) => setGameSpeed(val as 'normal' | 'fast' | 'instant')}
            />
          </SectionCard>

          {/* ══ MODIFIERS ══ */}
          <SectionCard title={`MODIFIERS${activeModCount > 0 ? ` (${activeModCount} active)` : ''}`} icon="⚡">
            <ModifierToggle
              icon="🔄"
              name="Gravity Flip"
              description="Pieces drop UP instead of down"
              value={gravityFlip}
              onChange={setGravityFlip}
            />
            <ModifierToggle
              icon="🎲"
              name="Random Start"
              description="Board starts with 5 random pieces pre-placed"
              value={randomStart}
              onChange={setRandomStart}
            />
            <ModifierToggle
              icon="⏱"
              name="Sudden Death"
              description="5s timer kicks in when column is half full"
              value={suddenDeath}
              onChange={setSuddenDeath}
            />
            <ModifierToggle
              icon="🌑"
              name="Blind Mode"
              description="Opponent pieces hidden until they connect 3"
              value={blindMode}
              onChange={setBlindMode}
            />
            <ModifierToggle
              icon="🎯"
              name="Sniper"
              description="3-in-a-row earns a bonus point"
              value={sniperMode}
              onChange={setSniperMode}
            />
          </SectionCard>

          {/* ══ OPPONENT ══ */}
          <SectionCard title="OPPONENT" icon="👤">
            <SettingRow
              label="Mode"
              value={opponent}
              options={[
                { label: 'Easy AI', value: 'ai_easy' },
                { label: 'Med AI', value: 'ai_medium' },
                { label: 'Hard AI', value: 'ai_hard' },
                { label: 'Impossible', value: 'ai_impossible' },
                { label: 'Local', value: 'local' },
                { label: 'Online', value: 'online' },
              ]}
              onChange={setOpponent}
            />

            {/* Opponent description */}
            <View style={styles.opponentDescRow}>
              <Text style={styles.opponentDescIcon}>
                {opponent === 'ai_easy' ? '🤖' :
                 opponent === 'ai_medium' ? '🤖' :
                 opponent === 'ai_hard' ? '🤖' :
                 opponent === 'ai_impossible' ? '💀' :
                 opponent === 'local' ? '🎮' : '🌐'}
              </Text>
              <Text style={styles.opponentDescText}>
                {opponent === 'ai_easy' ? 'A casual opponent. Good for warming up.' :
                 opponent === 'ai_medium' ? 'A balanced challenge for most players.' :
                 opponent === 'ai_hard' ? 'Thinks several moves ahead. Bring your A-game.' :
                 opponent === 'ai_impossible' ? 'Maximum depth search. Nearly unbeatable.' :
                 opponent === 'local' ? 'Pass & Play on the same device.' :
                 'Share a code to invite a friend.'}
              </Text>
            </View>
          </SectionCard>

          {/* ══ MATCH CODE (for online mode) ══ */}
          {opponent === 'online' && (
            <SectionCard title="MATCH CODE" icon="🔑">
              <View style={styles.matchCodeSection}>
                {/* Create Match */}
                <Pressable onPress={handleCreateMatch} style={styles.createMatchBtn}>
                  <LinearGradient
                    colors={['rgba(255,140,0,0.2)', 'rgba(255,140,0,0.08)']}
                    style={styles.createMatchGradient}
                  >
                    <Text style={styles.createMatchIcon}>📤</Text>
                    <Text style={styles.createMatchText}>CREATE MATCH</Text>
                  </LinearGradient>
                </Pressable>

                {generatedCode !== '' && (
                  <View style={styles.generatedCodeBox}>
                    <Text style={styles.generatedCodeLabel}>YOUR MATCH CODE</Text>
                    <Text style={styles.generatedCode}>{generatedCode}</Text>
                    <Text style={styles.generatedCodeHint}>Share this code with your opponent</Text>
                  </View>
                )}

                {/* Divider */}
                <View style={styles.matchDivider}>
                  <View style={styles.matchDividerLine} />
                  <Text style={styles.matchDividerText}>OR</Text>
                  <View style={styles.matchDividerLine} />
                </View>

                {/* Join Match */}
                <View style={styles.joinMatchRow}>
                  <TextInput
                    style={styles.codeInput}
                    placeholder="ENTER CODE"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={matchCode}
                    onChangeText={(text) => setMatchCode(text.toUpperCase().slice(0, 6))}
                    maxLength={6}
                    autoCapitalize="characters"
                  />
                  <Pressable
                    onPress={() => { haptics.tap(); }}
                    style={[styles.joinMatchBtn, matchCode.length < 6 && styles.joinMatchBtnDisabled]}
                  >
                    <Text style={styles.joinMatchBtnText}>JOIN</Text>
                  </Pressable>
                </View>
              </View>
            </SectionCard>
          )}

          {/* Bottom spacer */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ══ BOTTOM BUTTONS (pinned) ══ */}
        <View style={styles.startWrap}>
          <GlossyButton
            label="START MATCH"
            variant="red"
            iconRight="▶"
            onPress={startCustomGame}
            disabled={isInvalidCombo}
          />
          <GlossyButton
            label="BOARD EDITOR"
            variant="navy"
            icon="🎨"
            onPress={() => navigation.navigate('BoardEditor')}
            style={{ marginTop: 8 }}
          />
        </View>
      </View>
    </ScreenBackground>
  );
}

// ═══════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 30,
    color: '#ffffff',
    letterSpacing: 3,
    textShadowColor: 'rgba(231,76,60,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 13,
    color: 'rgba(200,220,255,0.5)',
    marginTop: 2,
    letterSpacing: 1,
  },

  // ── Section Card ──
  sectionCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  sectionIcon: {
    fontSize: 16,
  },
  sectionTitle: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 2,
  },

  // ── Setting Row ──
  settingRow: {
    marginBottom: 10,
  },
  settingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  settingIcon: {
    fontSize: 13,
  },
  settingLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  optionBtn: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 44,
  },
  optionBtnActive: {
    backgroundColor: 'rgba(255,140,0,0.15)',
    borderColor: colors.orange,
  },
  optionText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 12,
    color: colors.textSecondary,
  },
  optionTextActive: {
    color: colors.orange,
  },
  warningText: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 11,
    color: '#ff6b6b',
    textAlign: 'center',
    marginTop: -2,
    marginBottom: 6,
  },

  // ── Modifier Toggle ──
  modifierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  modifierRowActive: {
    backgroundColor: 'rgba(255,140,0,0.06)',
    borderColor: 'rgba(255,140,0,0.2)',
  },
  modifierIcon: {
    fontSize: 20,
    width: 30,
    textAlign: 'center',
  },
  modifierInfo: {
    flex: 1,
  },
  modifierName: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  modifierNameActive: {
    color: colors.orange,
  },
  modifierDesc: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },

  // ── Opponent Description ──
  opponentDescRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  opponentDescIcon: {
    fontSize: 22,
  },
  opponentDescText: {
    flex: 1,
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  // ── Match Code Section ──
  matchCodeSection: {
    gap: 10,
  },
  createMatchBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  createMatchGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.3)',
  },
  createMatchIcon: {
    fontSize: 16,
  },
  createMatchText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 13,
    color: colors.orange,
    letterSpacing: 2,
  },
  generatedCodeBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,140,0,0.08)',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,140,0,0.2)',
  },
  generatedCodeLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: 6,
  },
  generatedCode: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 36,
    color: colors.orange,
    letterSpacing: 8,
    textShadowColor: 'rgba(255,140,0,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  generatedCodeHint: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 6,
  },
  matchDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  matchDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  matchDividerText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 2,
  },
  joinMatchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  codeInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 18,
    color: '#ffffff',
    letterSpacing: 6,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  } as any,
  joinMatchBtn: {
    backgroundColor: 'rgba(26,188,156,0.15)',
    borderRadius: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.teal,
  },
  joinMatchBtnDisabled: {
    opacity: 0.4,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  joinMatchBtnText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 14,
    color: colors.teal,
    letterSpacing: 2,
  },

  // ── Start Wrap ──
  startWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 14,
    paddingTop: 8,
    backgroundColor: 'rgba(10,14,39,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
});
