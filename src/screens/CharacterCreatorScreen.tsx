import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { CharacterRenderer } from '../components/ui/CharacterRenderer';
import { GlossyButton } from '../components/ui/GlossyButton';
import {
  useCharacterStore,
  HAIR_OPTIONS, TOP_OPTIONS, BOTTOM_OPTIONS, SHOES_OPTIONS, COLOR_OPTIONS,
  Gender,
} from '../stores/characterStore';
import { haptics } from '../services/haptics';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CharacterCreator'>;
};

type Category = 'gender' | 'hair' | 'skin' | 'top' | 'bottom' | 'shoes' | 'color';

const CATEGORIES: { key: Category; label: string; icon: string }[] = [
  { key: 'gender', label: 'Gender', icon: '👤' },
  { key: 'hair', label: 'Hair', icon: '💇' },
  { key: 'skin', label: 'Skin', icon: '🎨' },
  { key: 'top', label: 'Top', icon: '👕' },
  { key: 'bottom', label: 'Bottom', icon: '👖' },
  { key: 'shoes', label: 'Shoes', icon: '👟' },
  { key: 'color', label: 'Colors', icon: '🌈' },
];

const ITEM_NAMES: Record<string, string> = {
  // Hair
  short: 'Short', afro: 'Afro', 'locs-front': 'Locs', braids: 'Braids', bun: 'Bun', locs: 'Locs',
  // Tops
  'white-tee': 'White Tee', hoodie: 'Hoodie', bomber: 'Bomber', 'crop-top': 'Crop Top',
  // Bottoms
  jeans: 'Jeans', shorts: 'Shorts', cargo: 'Cargo', joggers: 'Joggers', skirt: 'Skirt',
  // Shoes
  sneakers: 'Sneakers', barefoot: 'Barefoot', af1: 'AF1s', jordans: 'Jordans', platforms: 'Platforms',
};

const SKIN_TONE_COLORS = ['#FFDBB4', '#D4A574', '#C68642', '#8D5524', '#5C3A1E', '#3B2314'];

const COLOR_DISPLAY: Record<string, { name: string; color: string }> = {
  none: { name: 'Default', color: '#ffffff' },
  red: { name: 'Red', color: '#e74c3c' },
  blue: { name: 'Blue', color: '#3498db' },
  green: { name: 'Green', color: '#27ae3d' },
  purple: { name: 'Purple', color: '#9b59b6' },
  gold: { name: 'Gold', color: '#f1c40f' },
  pink: { name: 'Pink', color: '#e84393' },
  black: { name: 'Black', color: '#2c3e50' },
};

function ItemButton({ label, isSelected, isLocked, onPress }: {
  label: string; isSelected: boolean; isLocked: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => { if (!isLocked) { haptics.tap(); onPress(); } }}
      style={[styles.itemBtn, isSelected && styles.itemBtnSelected, isLocked && styles.itemBtnLocked]}
    >
      <Text style={[styles.itemLabel, isSelected && styles.itemLabelSelected]}>
        {label}
      </Text>
      {isLocked && <Text style={styles.lockIcon}>🔒</Text>}
    </Pressable>
  );
}

function ColorButton({ color, isSelected, onPress }: {
  color: string; isSelected: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => { haptics.tap(); onPress(); }}
      style={[styles.colorBtn, isSelected && styles.colorBtnSelected]}
    >
      <View style={[styles.colorSwatch, { backgroundColor: color }]} />
    </Pressable>
  );
}

export function CharacterCreatorScreen({ navigation }: Props) {
  const { config, updateConfig, setGender, randomize, isUnlocked } = useCharacterStore();
  const [activeCategory, setActiveCategory] = useState<Category>('hair');

  const renderCategoryContent = () => {
    switch (activeCategory) {
      case 'gender':
        return (
          <View style={styles.optionsRow}>
            <ItemButton label="Male" isSelected={config.gender === 'male'} isLocked={false}
              onPress={() => setGender('male')} />
            <ItemButton label="Female" isSelected={config.gender === 'female'} isLocked={false}
              onPress={() => setGender('female')} />
          </View>
        );

      case 'hair':
        return (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionsScroll}>
            {HAIR_OPTIONS[config.gender].map(id => (
              <ItemButton key={id} label={ITEM_NAMES[id] || id}
                isSelected={config.hair === id} isLocked={false}
                onPress={() => updateConfig({ hair: id })} />
            ))}
          </ScrollView>
        );

      case 'skin':
        return (
          <View style={styles.optionsRow}>
            {SKIN_TONE_COLORS.map((color, i) => (
              <ColorButton key={i} color={color}
                isSelected={config.skinTone === i}
                onPress={() => updateConfig({ skinTone: i })} />
            ))}
          </View>
        );

      case 'top':
        return (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionsScroll}>
            {TOP_OPTIONS[config.gender].map(id => (
              <ItemButton key={id} label={ITEM_NAMES[id] || id}
                isSelected={config.top === id} isLocked={false}
                onPress={() => updateConfig({ top: id })} />
            ))}
          </ScrollView>
        );

      case 'bottom':
        return (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionsScroll}>
            {BOTTOM_OPTIONS[config.gender].map(id => (
              <ItemButton key={id} label={ITEM_NAMES[id] || id}
                isSelected={config.bottom === id} isLocked={false}
                onPress={() => updateConfig({ bottom: id })} />
            ))}
          </ScrollView>
        );

      case 'shoes':
        return (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.optionsScroll}>
            {SHOES_OPTIONS[config.gender].map(id => (
              <ItemButton key={id} label={ITEM_NAMES[id] || id}
                isSelected={config.shoes === id} isLocked={false}
                onPress={() => updateConfig({ shoes: id })} />
            ))}
          </ScrollView>
        );

      case 'color':
        return (
          <View style={styles.colorSection}>
            <Text style={styles.colorSectionLabel}>Top Color</Text>
            <View style={styles.optionsRow}>
              {Object.entries(COLOR_DISPLAY).map(([key, { color }]) => (
                <ColorButton key={key} color={color}
                  isSelected={config.topColor === key}
                  onPress={() => updateConfig({ topColor: key })} />
              ))}
            </View>
            <Text style={[styles.colorSectionLabel, { marginTop: 12 }]}>Bottom Color</Text>
            <View style={styles.optionsRow}>
              {Object.entries(COLOR_DISPLAY).map(([key, { color }]) => (
                <ColorButton key={key} color={color}
                  isSelected={config.bottomColor === key}
                  onPress={() => updateConfig({ bottomColor: key })} />
              ))}
            </View>
          </View>
        );
    }
  };

  return (
    <ScreenBackground>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>{'<'}</Text>
          </Pressable>
          <Text style={styles.title}>CHARACTER</Text>
          <Pressable onPress={() => { haptics.tap(); randomize(); }} style={styles.randomBtn}>
            <Text style={styles.randomText}>🎲</Text>
          </Pressable>
        </View>

        {/* Character Preview */}
        <View style={styles.previewArea}>
          <LinearGradient
            colors={['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.01)', 'transparent']}
            style={styles.previewGlow}
          >
            <CharacterRenderer size={220} />
          </LinearGradient>
        </View>

        {/* Category tabs */}
        <View style={styles.categoryBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {CATEGORIES.map(cat => (
              <Pressable
                key={cat.key}
                onPress={() => { haptics.tap(); setActiveCategory(cat.key); }}
                style={[styles.categoryTab, activeCategory === cat.key && styles.categoryTabActive]}
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text style={[styles.categoryLabel, activeCategory === cat.key && styles.categoryLabelActive]}>
                  {cat.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Options for selected category */}
        <View style={styles.optionsArea}>
          {renderCategoryContent()}
        </View>

        {/* Done button */}
        <View style={styles.doneWrap}>
          <GlossyButton
            label="DONE"
            variant="orange"
            onPress={() => navigation.goBack()}
          />
        </View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  backText: { fontSize: 18, color: '#fff', fontWeight: '700' },
  title: {
    fontFamily: fonts.heading, fontWeight: weight.bold,
    fontSize: 22, color: '#ffffff', letterSpacing: 2,
  },
  randomBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,140,0,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,140,0,0.3)',
  },
  randomText: { fontSize: 20 },
  previewArea: {
    alignItems: 'center', justifyContent: 'center',
    height: 240, marginVertical: 4,
  },
  previewGlow: {
    width: 240, height: 240,
    borderRadius: 120, alignItems: 'center', justifyContent: 'center',
  },
  categoryBar: { marginBottom: 4 },
  categoryScroll: {
    paddingHorizontal: 12, gap: 6,
  },
  categoryTab: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12, flexDirection: 'row',
    alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'transparent',
  },
  categoryTabActive: {
    backgroundColor: 'rgba(255,140,0,0.12)',
    borderColor: 'rgba(255,140,0,0.4)',
  },
  categoryIcon: { fontSize: 16 },
  categoryLabel: {
    fontFamily: fonts.body, fontWeight: weight.semibold,
    fontSize: 12, color: colors.textSecondary,
  },
  categoryLabelActive: { color: colors.orange },
  optionsArea: {
    flex: 1, paddingHorizontal: 16,
    justifyContent: 'center',
  },
  optionsRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 8, justifyContent: 'center',
  },
  optionsScroll: {
    gap: 8, paddingVertical: 4,
  },
  itemBtn: {
    paddingHorizontal: 18, paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', position: 'relative',
    minWidth: 80,
  },
  itemBtnSelected: {
    backgroundColor: 'rgba(255,140,0,0.15)',
    borderColor: colors.orange,
  },
  itemBtnLocked: { opacity: 0.4 },
  itemLabel: {
    fontFamily: fonts.body, fontWeight: weight.semibold,
    fontSize: 14, color: colors.textSecondary,
  },
  itemLabelSelected: { color: colors.orange },
  lockIcon: { position: 'absolute', top: 2, right: 4, fontSize: 10 },
  colorBtn: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 2, borderColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  colorBtnSelected: {
    borderColor: colors.orange,
  },
  colorSwatch: {
    width: 28, height: 28, borderRadius: 14,
  },
  colorSection: {},
  colorSectionLabel: {
    fontFamily: fonts.body, fontWeight: weight.semibold,
    fontSize: 12, color: colors.textSecondary,
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 6,
  },
  doneWrap: {
    paddingHorizontal: 24, paddingBottom: 12,
  },
});
