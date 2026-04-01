import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/HomeScreen';
import { ShopScreen } from '../screens/ShopScreen';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';

const Tab = createBottomTabNavigator();

function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  return (
    <View style={styles.tabItem}>
      <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>{icon}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
      {/* Notification badge example for Inbox */}
      {label === 'Inbox' && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>2</Text>
        </View>
      )}
    </View>
  );
}

function FriendsTab() {
  return <PlaceholderScreen title="Friends" icon="👥" subtitle="Add friends and see who's online. Coming in Phase 3!" />;
}

function RanksTab() {
  return <PlaceholderScreen title="Ranks" icon="👑" subtitle="Global leaderboards and seasonal rankings. Coming in Phase 3!" />;
}

function AchievementsTab() {
  return <PlaceholderScreen title="Achievements" icon="⭐" subtitle="Track your milestones and showcase your best achievements." />;
}

function InboxTab() {
  return <PlaceholderScreen title="Inbox" icon="📬" subtitle="Match invites, friend requests, and rewards will appear here." />;
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
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="🏠" label="Home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Friends"
        component={FriendsTab}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="👥" label="Friends" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Ranks"
        component={RanksTab}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="👑" label="Ranks" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Achievements"
        component={AchievementsTab}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="⭐" label="Achievements" focused={focused} />,
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
    backgroundColor: colors.bgDark,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    height: 70,
    paddingBottom: 8,
    paddingTop: 8,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabIcon: {
    fontSize: 22,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontFamily: fonts.body,
    fontWeight: weight.semibold,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  tabLabelActive: {
    color: colors.orange,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: colors.red,
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: fonts.body,
    fontWeight: weight.bold,
    fontSize: 9,
    color: '#ffffff',
  },
});
