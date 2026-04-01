import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

const PHONE_WIDTH = 390;
const PHONE_HEIGHT = 844;
const FRAME_RADIUS = 44;
const NOTCH_WIDTH = 160;
const NOTCH_HEIGHT = 34;

interface PhoneFrameProps {
  children: React.ReactNode;
}

/**
 * Wraps the app in an iPhone-shaped frame when running on web.
 * On native, renders children directly with no wrapper.
 */
export function PhoneFrame({ children }: PhoneFrameProps) {
  // Only show the frame on web
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={styles.desktop}>
      {/* Phone housing */}
      <View style={styles.phone}>
        {/* Top bezel with notch */}
        <View style={styles.topBezel}>
          <View style={styles.notch}>
            <View style={styles.camera} />
          </View>
        </View>

        {/* Status bar */}
        <View style={styles.statusBar}>
          <Text style={styles.statusTime}>9:41</Text>
          <View style={styles.statusRight}>
            <Text style={styles.statusIcon}>📶</Text>
            <Text style={styles.statusIcon}>🔋</Text>
          </View>
        </View>

        {/* App content */}
        <View style={styles.screen}>
          {children}
        </View>

        {/* Home indicator */}
        <View style={styles.homeIndicatorWrap}>
          <View style={styles.homeIndicator} />
        </View>
      </View>

      {/* App info text below phone */}
      <Text style={styles.infoText}>Drop4 — Mobile Preview</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  desktop: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    // Subtle dot grid background
    ...(Platform.OS === 'web' ? {
      backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
      backgroundSize: '24px 24px',
    } as any : {}),
  },
  phone: {
    width: PHONE_WIDTH,
    height: PHONE_HEIGHT,
    borderRadius: FRAME_RADIUS,
    backgroundColor: '#000000',
    borderWidth: 3,
    borderColor: '#333',
    overflow: 'hidden',
    position: 'relative',
    // Phone shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 40,
    elevation: 30,
  },
  topBezel: {
    height: NOTCH_HEIGHT,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 10,
  },
  notch: {
    width: NOTCH_WIDTH,
    height: NOTCH_HEIGHT,
    backgroundColor: '#000',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
  },
  camera: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#1a1a2e',
    borderWidth: 2,
    borderColor: '#333',
    marginTop: 6,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 2,
    paddingBottom: 4,
    backgroundColor: '#000',
    zIndex: 5,
  },
  statusTime: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statusRight: {
    flexDirection: 'row',
    gap: 4,
  },
  statusIcon: {
    fontSize: 12,
  },
  screen: {
    flex: 1,
    overflow: 'hidden',
  },
  homeIndicatorWrap: {
    height: 20,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeIndicator: {
    width: 134,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#666',
  },
  infoText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
    marginTop: 16,
    fontWeight: '500',
    letterSpacing: 1,
  },
});
