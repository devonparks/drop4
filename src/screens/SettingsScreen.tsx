import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, Linking } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { TopBar } from '../components/ui/TopBar';
import { useShopStore } from '../stores/shopStore';
import { toggleMute, getMuted } from '../services/audio';
import { haptics } from '../services/haptics';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'>;
};

function SettingToggle({ label, value, onToggle, icon }: {
  label: string; value: boolean; onToggle: () => void; icon: string;
}) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingIcon}>{icon}</Text>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={() => { haptics.tap(); onToggle(); }}
        trackColor={{ false: 'rgba(255,255,255,0.1)', true: 'rgba(255,140,0,0.4)' }}
        thumbColor={value ? colors.orange : '#666'}
      />
    </View>
  );
}

function SettingLink({ label, icon, onPress }: { label: string; icon: string; onPress: () => void }) {
  return (
    <Pressable onPress={() => { haptics.tap(); onPress(); }} style={styles.settingRow}>
      <Text style={styles.settingIcon}>{icon}</Text>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export function SettingsScreen({ navigation }: Props) {
  const { coins, gems, level } = useShopStore();
  const [soundOn, setSoundOn] = useState(!getMuted());
  const [hapticsOn, setHapticsOn] = useState(true);
  const [notificationsOn, setNotificationsOn] = useState(true);

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

        <Text style={styles.title}>SETTINGS</Text>

        {/* Audio */}
        <Text style={styles.sectionTitle}>AUDIO</Text>
        <View style={styles.section}>
          <SettingToggle
            label="Sound Effects"
            value={soundOn}
            onToggle={() => { toggleMute(); setSoundOn(!soundOn); }}
            icon="🔊"
          />
          <SettingToggle
            label="Haptic Feedback"
            value={hapticsOn}
            onToggle={() => setHapticsOn(!hapticsOn)}
            icon="📳"
          />
        </View>

        {/* Notifications */}
        <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
        <View style={styles.section}>
          <SettingToggle
            label="Push Notifications"
            value={notificationsOn}
            onToggle={() => setNotificationsOn(!notificationsOn)}
            icon="🔔"
          />
        </View>

        {/* About */}
        <Text style={styles.sectionTitle}>ABOUT</Text>
        <View style={styles.section}>
          <SettingLink label="Rate Drop4" icon="⭐" onPress={() => {}} />
          <SettingLink label="Share with Friends" icon="📤" onPress={() => {}} />
          <SettingLink label="Privacy Policy" icon="🔒" onPress={() => {}} />
          <SettingLink label="Terms of Service" icon="📄" onPress={() => {}} />
        </View>

        {/* Version */}
        <View style={styles.footer}>
          <Text style={styles.version}>Drop4 v1.0.0</Text>
          <Text style={styles.copyright}>Created by Devon Parks</Text>
        </View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.heading,
    fontWeight: weight.bold,
    fontSize: 24,
    color: '#ffffff',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 2,
    paddingHorizontal: 20,
    marginBottom: 6,
    marginTop: 12,
  },
  section: {
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    gap: 12,
  },
  settingIcon: {
    fontSize: 20,
  },
  settingLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 15,
    color: '#ffffff',
    flex: 1,
  },
  chevron: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 20,
    color: colors.textSecondary,
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: 24,
  },
  version: {
    fontFamily: fonts.body,
    fontWeight: weight.medium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  copyright: {
    fontFamily: fonts.body,
    fontWeight: weight.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
});
