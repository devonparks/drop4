/**
 * HSLColorPicker — Modal color picker with hue slider + saturation/lightness grid.
 *
 * Uses HSL to give the player full color control without needing a native color
 * picker. Shows live preview, accepts hex input, and outputs hex on confirm.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { PressScale } from '../animations';
import { haptics } from '../../services/haptics';
import { colors } from '../../theme/colors';
import { fonts, weight } from '../../theme/typography';

interface Props {
  visible: boolean;
  initialColor: string;
  title?: string;
  onClose: () => void;
  onConfirm: (hex: string) => void;
}

// ── HSL ↔ Hex utils ──

function hexToHSL(hex: string): [number, number, number] {
  const m = hex.replace('#', '').match(/.{2}/g);
  if (!m || m.length < 3) return [0, 0, 50];
  const r = parseInt(m[0], 16) / 255;
  const g = parseInt(m[1], 16) / 255;
  const b = parseInt(m[2], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      case b: h = ((r - g) / d + 4); break;
    }
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100, ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const to255 = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${to255(r)}${to255(g)}${to255(b)}`;
}

// ── Rainbow preset swatches ──

const PRESET_HUES = [
  { hex: '#e63946', name: 'Red' },
  { hex: '#f77f00', name: 'Orange' },
  { hex: '#f4c430', name: 'Yellow' },
  { hex: '#8ac926', name: 'Lime' },
  { hex: '#2ecc71', name: 'Green' },
  { hex: '#06d6a0', name: 'Mint' },
  { hex: '#1abc9c', name: 'Teal' },
  { hex: '#3498db', name: 'Blue' },
  { hex: '#5856d6', name: 'Indigo' },
  { hex: '#9b59b6', name: 'Purple' },
  { hex: '#e84393', name: 'Pink' },
  { hex: '#ffffff', name: 'White' },
  { hex: '#a0a0a8', name: 'Grey' },
  { hex: '#1a1a20', name: 'Black' },
];

// ── Component ──

export function HSLColorPicker({ visible, initialColor, title = 'Pick a Color', onClose, onConfirm }: Props) {
  const [hsl, setHsl] = useState<[number, number, number]>(() => hexToHSL(initialColor));
  const currentHex = hslToHex(hsl[0], hsl[1], hsl[2]);

  const stepHue = (dir: number) => {
    haptics.tap();
    setHsl(([h, s, l]) => [(h + dir * 15 + 360) % 360, s, l]);
  };
  const stepSat = (dir: number) => {
    haptics.tap();
    setHsl(([h, s, l]) => [h, Math.max(0, Math.min(100, s + dir * 10)), l]);
  };
  const stepLight = (dir: number) => {
    haptics.tap();
    setHsl(([h, s, l]) => [h, s, Math.max(5, Math.min(95, l + dir * 10))]);
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(180)} style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close color picker"
        />
        <Animated.View entering={SlideInDown.springify().damping(14)} style={styles.card}>
          <Text style={styles.title}>{title}</Text>

          {/* Live preview */}
          <View style={styles.previewWrap}>
            <View style={[styles.previewColor, { backgroundColor: currentHex }]}>
              <Text style={styles.previewHex}>{currentHex.toUpperCase()}</Text>
            </View>
          </View>

          {/* Preset hues */}
          <Text style={styles.sectionLabel}>PRESETS</Text>
          <View style={styles.presetRow}>
            {PRESET_HUES.map((p) => {
              const selected = currentHex.toLowerCase() === p.hex.toLowerCase();
              return (
                <PressScale
                  key={p.hex}
                  onPress={() => { haptics.tap(); setHsl(hexToHSL(p.hex)); }}
                  accessibilityLabel={`${p.name} preset`}
                  accessibilityHint={selected ? 'Currently selected' : 'Pick this preset color'}
                  accessibilityState={{ selected }}
                >
                  <View style={[styles.presetSwatch, { backgroundColor: p.hex }, selected && styles.presetSwatchActive]} />
                </PressScale>
              );
            })}
          </View>

          {/* Sliders */}
          <SliderBar label="Hue"  value={hsl[0]} max={360} gradient={['#ff0000', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ff0000']} onMinus={() => stepHue(-1)} onPlus={() => stepHue(1)} />
          <SliderBar label="Saturation" value={hsl[1]} max={100} gradient={[hslToHex(hsl[0], 0, hsl[2]), hslToHex(hsl[0], 100, hsl[2])]} onMinus={() => stepSat(-1)} onPlus={() => stepSat(1)} />
          <SliderBar label="Lightness" value={hsl[2]} max={100} gradient={['#000000', hslToHex(hsl[0], hsl[1], 50), '#ffffff']} onMinus={() => stepLight(-1)} onPlus={() => stepLight(1)} />

          {/* Actions */}
          <View style={styles.actionRow}>
            <PressScale
              onPress={() => { haptics.tap(); onClose(); }}
              accessibilityLabel="Cancel"
              accessibilityHint="Close without changing the color"
            >
              <View style={styles.cancelBtn}>
                <Text style={styles.cancelText}>CANCEL</Text>
              </View>
            </PressScale>
            <PressScale
              onPress={() => { haptics.win(); onConfirm(currentHex); onClose(); }}
              accessibilityLabel={`Apply color ${currentHex.toUpperCase()}`}
            >
              <LinearGradient colors={['#ff8c00', '#cc5500']} style={styles.confirmBtn}>
                <Text style={styles.confirmText}>APPLY</Text>
              </LinearGradient>
            </PressScale>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function SliderBar({ label, value, max, gradient, onMinus, onPlus }: {
  label: string; value: number; max: number; gradient: string[];
  onMinus: () => void; onPlus: () => void;
}) {
  const pct = (value / max) * 100;
  return (
    <View style={styles.sliderRow}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={styles.sliderValue}>{Math.round(value)}</Text>
      </View>
      <View style={styles.sliderControls}>
        <PressScale onPress={onMinus} accessibilityLabel={`Decrease ${label.toLowerCase()}`}>
          <View style={styles.stepBtn}><Text style={styles.stepIcon}>−</Text></View>
        </PressScale>
        <View style={styles.sliderTrack}>
          <LinearGradient colors={gradient as any} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill as any} />
          <View style={[styles.sliderThumb, { left: `${pct}%` }]} />
        </View>
        <PressScale onPress={onPlus} accessibilityLabel={`Increase ${label.toLowerCase()}`}>
          <View style={styles.stepBtn}><Text style={styles.stepIcon}>+</Text></View>
        </PressScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  card: {
    width: '100%', maxWidth: 360, backgroundColor: '#0d1030',
    borderRadius: 24, padding: 20, gap: 14,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 20,
  },
  title: {
    fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 20,
    color: '#fff', letterSpacing: 1, textAlign: 'center',
  },
  previewWrap: { alignItems: 'center' },
  previewColor: {
    width: 120, height: 60, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  previewHex: {
    fontFamily: fonts.body, fontWeight: weight.black, fontSize: 14,
    color: '#fff', letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
  sectionLabel: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 11,
    color: colors.orange, letterSpacing: 1.5, marginTop: 4,
  },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  presetSwatch: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
  },
  presetSwatchActive: {
    borderColor: '#fff', borderWidth: 2.5,
  },
  sliderRow: { gap: 4 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sliderLabel: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 13, color: '#fff', letterSpacing: 0.5 },
  sliderValue: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 13, color: colors.orange },
  sliderControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,140,0,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,140,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  stepIcon: {
    fontFamily: fonts.heading, fontWeight: weight.bold,
    fontSize: 22, color: colors.orange, lineHeight: 24,
  },
  sliderTrack: {
    flex: 1, height: 12, borderRadius: 6, overflow: 'hidden',
    position: 'relative', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  sliderThumb: {
    position: 'absolute', top: -2, width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#fff', marginLeft: -7,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4, shadowRadius: 3, elevation: 3,
    borderWidth: 2, borderColor: 'rgba(0,0,0,0.3)',
  },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelText: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 13,
    color: colors.textSecondary, letterSpacing: 1,
  },
  confirmBtn: {
    flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center',
    shadowColor: '#ff8c00', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 6,
  },
  confirmText: {
    fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 14,
    color: '#fff', letterSpacing: 1.5,
  },
});
