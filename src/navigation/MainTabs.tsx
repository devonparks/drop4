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
import { CustomizeScreen } from '../screens/CustomizeScreen';
import { MissionsScreen } from '../screens/MissionsScreen';
import { CareerMapScreen } from '../screens/CareerMapScreen';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { useChallengeStore } from '../stores/challengeStore';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';

const Tab = createBottomTabNavigator();

// Flux-generated tab icon pack — replaces the emoji set. See docs/ART_WORKFLOW.md
// for how to regenerate. Source prompts in docs/ui-asset-manifest.json.
//
// 5-tab structure: Home / Career / Customize / Missions / Shop.
// Career promoted to a top-level tab so the 36-level campaign + city map
// is one tap from anywhere (was Home → PLAY → ModePick → Career, two
// taps and a needless decision screen). Career sits between Home and
// Customize because Home → Career → equip → spend is the dominant
// session loop. Profile accessed via the top-right portrait in TopBar.
const TAB_ICON_SOURCES: Record<string, ImageSourcePropType> = {
  home: require('../assets/images/ui/tab-home.png'),
  career: require('../assets/images/ui/tab-career.png'),
  customize: require('../assets/images/ui/tab-customize.png'),
  missions: require('../assets/images/ui/tab-missions.png'),
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
      {/* Focused glow ring — a soft orange halo behind the active tab
          icon so the selected tab reads unmistakably. Only renders
          when focused so inactive tabs stay visually quiet. */}
      {focused && <View pointerEvents="none" style={styles.tabFocusGlow} />}
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

// Reactive tab icon — subscribes to store so badge updates in real-time.
// Used by the Missions tab for the "you have unclaimed rewards" red dot.
function MissionsTabIcon({ focused }: { focused: boolean }) {
  const claimable = useChallengeStore(s =>
    s.challenges.filter(c => c.progress >= c.target && !c.completed).length
  );
  return <TabIcon iconKey="missions" label="Missions" focused={focused} badgeCount={claimable} />;
}

export function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
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
      {/* Tab order per Devon: Missions | Career | Home | Customize | Shop.
          Home is centered (position 3) so it's the thumb's natural anchor.
          Missions far left, Customize to the right of Home, Shop far right. */}
      <Tab.Screen
        name="Missions"
        component={MissionsScreen}
        options={{
          tabBarIcon: ({ focused }) => <MissionsTabIcon focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Career"
        component={CareerMapScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon iconKey="career" label="Career" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon iconKey="home" label="Home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Customize"
        component={CustomizeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon iconKey="customize" label="Customize" focused={focused} />,
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
    backgroundColor: 'rgba(8,10,30,0.85)',
    borderTopWidth: 1.5,
    // Warm gold top border — reads as premium, matches the card-rim
    // + TopBar pill-rim treatment used elsewhere.
    borderTopColor: 'rgba(255,210,120,0.45)',
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
      // Subtle inset gold top-edge highlight on web for a premium
      // embossed-metal feel matching TopBar + mode cards.
      boxShadow: 'inset 0 1px 0 rgba(255,240,200,0.25), 0 -4px 16px rgba(0,0,0,0.5)',
    } as any : {}),
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    minWidth: 50,
  },
  // Soft orange halo behind the active tab icon. On web we also use
  // a filter: blur to feather the edges for a premium neon-sign feel.
  tabFocusGlow: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    top: -2,
    backgroundColor: 'rgba(255,140,0,0.18)',
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    ...(Platform.OS === 'web' ? ({ filter: 'blur(2px)' } as any) : {}),
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
