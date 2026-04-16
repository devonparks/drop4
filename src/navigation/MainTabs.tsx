import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/HomeScreen';
import { ShopScreen } from '../screens/ShopScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ChallengesScreen } from '../screens/ChallengesScreen';
import { CollectionScreen } from '../screens/CollectionScreen';
import { haptics } from '../services/haptics';
import { useChallengeStore } from '../stores/challengeStore';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';

const Tab = createBottomTabNavigator();

function TabIcon({ icon, label, focused, badgeCount }: { icon: string; label: string; focused: boolean; badgeCount?: number }) {
  return (
    <View style={styles.tabItem}>
      <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>{icon}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
      {focused && <View style={styles.activeIndicator} />}
      {badgeCount !== undefined && badgeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeCount}</Text>
        </View>
      )}
    </View>
  );
}

function RanksTab() {
  return <ChallengesScreen />;
}

function AchievementsTab() {
  return <ProfileScreen />;
}

// Reactive tab icon — subscribes to store so badge updates in real-time
function ChallengesTabIcon({ focused }: { focused: boolean }) {
  const claimable = useChallengeStore(s =>
    s.challenges.filter(c => c.progress >= c.target && !c.completed).length
  );
  return <TabIcon icon="🎯" label="Challenges" focused={focused} badgeCount={claimable} />;
}

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: colors.textMuted,
      }}
      screenListeners={{
        tabPress: () => {
          haptics.tap();
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" label="Home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Challenges"
        component={RanksTab}
        options={{
          tabBarIcon: ({ focused }) => <ChallengesTabIcon focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Collection"
        component={CollectionScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="🎒" label="Collection" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={AchievementsTab}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" label="Profile" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Shop"
        component={ShopScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="🛍" label="Shop" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(8,10,30,0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    height: Platform.OS === 'ios' ? 80 : 72,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    ...(Platform.OS === 'web' ? {
      backdropFilter: 'blur(20px)',
    } as any : {}),
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minWidth: 50,
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.4,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
  },
  tabLabelActive: {
    color: colors.orange,
  },
  activeIndicator: {
    position: 'absolute',
    top: -8,
    width: 20,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.orange,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.red,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: 'rgba(8,10,30,0.95)',
  },
  badgeText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: '#ffffff',
  },
});
