import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform, Image, ImageSourcePropType, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { createMaterialTopTabNavigator, MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
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

// Material Top Tab Navigator — supports horizontal swipe between tabs
// natively (the gesture lives on the screen content, not just the tab
// bar). We position the tab bar at the BOTTOM via a custom `tabBar`
// renderer so the bar still feels like a phone bottom-nav bar but the
// player can swipe Home → Career → Customize → etc by dragging the
// screen sideways.
const Tab = createMaterialTopTabNavigator();

// 5-tab structure: Missions | Career | Home | Customize | Shop.
// Career promoted to a top-level tab so the 36-level campaign + city map
// is one tap from anywhere. Home is centered (position 3) — natural
// thumb anchor. Profile accessed via the top-right portrait in TopBar.
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

// Maps a route name to its iconKey + label config. Keeps the per-tab
// rendering logic out of the route definitions and centralizes "this
// tab gets a custom MissionsTabIcon" branch.
const TAB_META: Record<string, { iconKey: keyof typeof TAB_ICON_SOURCES; label: string; useReactiveBadge?: boolean }> = {
  Missions:  { iconKey: 'missions',  label: 'Missions',  useReactiveBadge: true },
  Career:    { iconKey: 'career',    label: 'Career' },
  Home:      { iconKey: 'home',      label: 'Home' },
  Customize: { iconKey: 'customize', label: 'Customize' },
  Shop:      { iconKey: 'shop',      label: 'Shop' },
};

// Custom bottom-positioned tab bar. The Material Top Tabs navigator
// hands us the navigation state + a function to switch tabs; we render
// the same TabIcon UI as the old createBottomTabNavigator did. The
// difference vs the previous bottom-tabs setup is that swipe gestures
// across the SCREEN content now drive the tab change too — that's
// built in to the underlying tab-view, not something we wired here.
function BottomTabBar({ state, navigation }: MaterialTopTabBarProps) {
  return (
    <View style={styles.tabBar} pointerEvents="box-none">
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const meta = TAB_META[route.name];
        const onPress = () => {
          haptics.tap();
          playSound('tab_switch');
          if (!focused) {
            navigation.navigate(route.name);
          }
        };
        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={meta?.label ?? route.name}
            style={styles.tabPressable}
          >
            {meta?.useReactiveBadge ? (
              <MissionsTabIcon focused={focused} />
            ) : (
              <TabIcon
                iconKey={meta?.iconKey ?? 'home'}
                label={meta?.label ?? route.name}
                focused={focused}
              />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      tabBarPosition="bottom"
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        // Swipe between tabs is enabled by default. lazy: false keeps
        // every tab mounted so cross-tab state (character, store) is
        // consistent and swipes don't show a loading flash.
        lazy: false,
        swipeEnabled: true,
        animationEnabled: true,
      }}
    >
      {/* Tab order: Missions | Career | Home | Customize | Shop.
          Home centered (position 3) — natural thumb anchor. */}
      <Tab.Screen name="Missions" component={MissionsScreen} />
      <Tab.Screen name="Career" component={CareerMapScreen} />
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Customize" component={CustomizeScreen} />
      <Tab.Screen name="Shop" component={ShopScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
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
  tabPressable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
