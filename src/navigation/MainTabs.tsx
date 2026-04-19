import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Image, ImageSourcePropType } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeScreen } from '../screens/HomeScreen';
import { ShopScreen } from '../screens/ShopScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ChallengesScreen } from '../screens/ChallengesScreen';
import { CollectionScreen } from '../screens/CollectionScreen';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { useChallengeStore } from '../stores/challengeStore';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';

const Tab = createBottomTabNavigator();

// Flux-generated tab icon pack — replaces the emoji set. See docs/ART_WORKFLOW.md
// for how to regenerate. Source prompts in docs/ui-asset-manifest.json.
const TAB_ICON_SOURCES: Record<string, ImageSourcePropType> = {
  home: require('../assets/images/ui/tab-home.png'),
  challenges: require('../assets/images/ui/tab-challenges.png'),
  collection: require('../assets/images/ui/tab-collection.png'),
  profile: require('../assets/images/ui/tab-profile.png'),
  shop: require('../assets/images/ui/tab-shop.png'),
};

function TabIcon({ iconKey, label, focused, badgeCount }: { iconKey: keyof typeof TAB_ICON_SOURCES; label: string; focused: boolean; badgeCount?: number }) {
  // Scale-pop on focus change. Bounces up then settles so the tap feels
  // like the button is answering the user. ~300ms total feel.
  const scale = useSharedValue(focused ? 1.06 : 1);
  useEffect(() => {
    if (focused) {
      scale.value = 1.18;
      scale.value = withSpring(1.06, { damping: 8, stiffness: 180 });
    } else {
      scale.value = withSpring(1, { damping: 12, stiffness: 220 });
    }
  }, [focused, scale]);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconSource = TAB_ICON_SOURCES[iconKey];

  return (
    <Animated.View style={[styles.tabItem, animStyle]}>
      <Image
        source={iconSource}
        style={[styles.tabIconImg, !focused && styles.tabIconImgInactive]}
        resizeMode="contain"
      />
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
      {focused && <View style={styles.activeIndicator} />}
      {badgeCount !== undefined && badgeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeCount}</Text>
        </View>
      )}
    </Animated.View>
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
  return <TabIcon iconKey="challenges" label="Challenges" focused={focused} badgeCount={claimable} />;
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
          playSound('tab_switch');
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon iconKey="home" label="Home" focused={focused} />,
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
          tabBarIcon: ({ focused }) => <TabIcon iconKey="collection" label="Collection" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={AchievementsTab}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon iconKey="profile" label="Profile" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Shop"
        component={ShopScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon iconKey="shop" label="Shop" focused={focused} />,
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
  // Flux-generated PNG tab icons replace the emoji set. Sized smaller than
  // the emoji (28 vs 20px font) because the painted icons have built-in
  // padding and read fine at this size.
  tabIconImg: {
    width: 30,
    height: 30,
  },
  tabIconImgInactive: {
    opacity: 0.45,
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
