/**
 * Character3DCreatorScreen — 3D Character Customization
 *
 * Premium in-app character creator using react-three-fiber.
 * Tabs: Outfit, Body, Skin, Hair, Outfit Colors
 *
 * All changes save to characterStore and persist across sessions.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Character3D } from '../components/3d/Character3D';
import { ScreenBackground } from '../components/ui/ScreenBackground';
import { HSLColorPicker } from '../components/ui/HSLColorPicker';
import { PressScale } from '../components/animations';
import {
  useCharacterStore,
  FREE_HAIR_COLORS,
  PREMIUM_HAIR_COLORS,
  FREE_OUTFIT_PACKS,
  PREMIUM_OUTFIT_PACKS,
  type OutfitId,
} from '../stores/characterStore';
import { useShopStore } from '../stores/shopStore';
import { useCareerStore } from '../stores/careerStore';
import { OUTFITS, OUTFIT_IDS, PACKS, type Species } from '../data/outfitRegistry';
import { OUTFIT_SHOP_ITEMS } from '../data/cosmeticsShopCatalog';
import { PETS, PET_IDS, type PetId } from '../data/petRegistry';
import { usePetStore } from '../stores/petStore';
import { HUMAN_EMOTES } from '../data/animationRegistry';
import { haptics } from '../services/haptics';
import { playSound } from '../services/audio';
import { colors } from '../theme/colors';
import { fonts, weight } from '../theme/typography';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Character3DCreator'>;

type Tab = 'outfit' | 'body' | 'skin' | 'hair' | 'colors' | 'pets' | 'emotes';

const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'outfit', icon: '👕', label: 'Outfit' },
  { id: 'body',   icon: '💪', label: 'Body' },
  { id: 'skin',   icon: '🎨', label: 'Skin' },
  { id: 'hair',   icon: '💇', label: 'Hair' },
  { id: 'colors', icon: '🌈', label: 'Colors' },
  { id: 'pets',   icon: '🐕', label: 'Pets' },
  { id: 'emotes', icon: '💃', label: 'Emotes' },
];

// Skin tone swatches (free — any color picker)
const SKIN_TONES = [
  '#fce0c5', '#f8d0ae', '#f4c196', '#ecb084', '#dcb088',
  '#d4a374', '#c69368', '#b07e56', '#96654a', '#7a513e',
  '#5e3e2e', '#422a1f', '#2c1a13',
  // Fantasy skin tones
  '#b0d490', '#90c8d4', '#d490c8', '#c8d490',
];

export function Character3DCreatorScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('outfit');
  const [colorPickerFor, setColorPickerFor] = useState<'skin' | 'hair' | null>(null);
  const [previewEmoteId, setPreviewEmoteId] = useState<string | null>(null);

  // Auto-clear preview emote after 3s so the character returns to idle
  useEffect(() => {
    if (!previewEmoteId) return;
    const t = setTimeout(() => setPreviewEmoteId(null), 3000);
    return () => clearTimeout(t);
  }, [previewEmoteId]);

  const cust = useCharacterStore((s) => s.customization);
  const unlockedHair = useCharacterStore((s) => s.unlockedHairColors);
  const unlockedPacks = useCharacterStore((s) => s.unlockedOutfitPacks);

  const setOutfit = useCharacterStore((s) => s.setOutfit);
  const setSkinColor = useCharacterStore((s) => s.setSkinColor);
  const setHairColor = useCharacterStore((s) => s.setHairColor);
  const setOutfitColors = useCharacterStore((s) => s.setOutfitColors);
  const setBodyType = useCharacterStore((s) => s.setBodyType);
  const setBodySize = useCharacterStore((s) => s.setBodySize);
  const setMuscle = useCharacterStore((s) => s.setMuscle);
  const unlockHairColor = useCharacterStore((s) => s.unlockHairColor);
  const unlockOutfitPack = useCharacterStore((s) => s.unlockOutfitPack);

  const coins = useShopStore((s) => s.coins);
  const spendCoins = useShopStore((s) => s.spendCoins);

  const currentOutfit = OUTFITS[cust.outfitId] ?? OUTFITS['modern_civilians_01'] ?? OUTFITS[OUTFIT_IDS[0]];
  const previewEmote = previewEmoteId ? HUMAN_EMOTES.find((e) => e.id === previewEmoteId) : null;

  // ── Purchase handlers ────────────────────────────────────────
  const handlePurchaseHair = (id: string, hex: string, price: number) => {
    if (unlockedHair.includes(id)) {
      setHairColor(hex);
      haptics.tap();
      return;
    }
    if (spendCoins(price)) {
      unlockHairColor(id);
      setHairColor(hex);
      haptics.win();
      playSound('coin');
    } else {
      haptics.error();
    }
  };

  const handlePurchasePack = (pack: typeof PREMIUM_OUTFIT_PACKS[number]) => {
    if (unlockedPacks.includes(pack.id) || pack.price === 0) {
      setOutfitColors(pack.colors);
      haptics.tap();
      return;
    }
    if (spendCoins(pack.price)) {
      unlockOutfitPack(pack.id);
      setOutfitColors(pack.colors);
      haptics.win();
      playSound('coin');
    } else {
      haptics.error();
    }
  };

  return (
    <ScreenBackground>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          accessibilityHint="Returns to the previous screen"
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.title}>CUSTOMIZE</Text>
        <View style={styles.coinBadge}>
          <Text style={styles.coinEmoji}>🪙</Text>
          <Text style={styles.coinValue}>{coins.toLocaleString()}</Text>
        </View>
      </View>

      {/* 3D Preview */}
      <View style={styles.previewArea}>
        <Character3D
          width={300}
          height={400}
          bodyGlb={currentOutfit.glb}
          skinColor={cust.skinColor}
          hairColor={cust.hairColor}
          outfitColors={cust.outfitColors}
          bodyType={cust.bodyType}
          bodySize={cust.bodySize}
          muscle={cust.muscle}
          mode="creator"
          cameraDistance={3.5}
          cameraHeight={1.0}
          animationGlb={previewEmoteId ? previewEmote?.glb : undefined}
          animationLoop={!previewEmoteId}
        />
      </View>

      {/* Tab bar */}
      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <PressScale key={t.id} onPress={() => { haptics.tap(); setActiveTab(t.id); }}>
            <View style={[styles.tab, activeTab === t.id && styles.tabActive]}>
              <Text style={styles.tabIcon}>{t.icon}</Text>
              <Text style={[styles.tabLabel, activeTab === t.id && styles.tabLabelActive]}>{t.label}</Text>
            </View>
          </PressScale>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner} showsVerticalScrollIndicator={false}>
        {activeTab === 'outfit' && (
          <OutfitTab currentId={cust.outfitId} onSelect={setOutfit} />
        )}
        {activeTab === 'body' && (
          <BodyTab
            bodyType={cust.bodyType} bodySize={cust.bodySize} muscle={cust.muscle}
            onBodyType={setBodyType} onBodySize={setBodySize} onMuscle={setMuscle}
          />
        )}
        {activeTab === 'skin' && (
          <SkinTab currentColor={cust.skinColor} onSelect={setSkinColor} onPickCustom={() => setColorPickerFor('skin')} />
        )}
        {activeTab === 'hair' && (
          <HairTab
            currentColor={cust.hairColor}
            unlocked={unlockedHair}
            coins={coins}
            onFreeSelect={setHairColor}
            onPremiumPurchase={handlePurchaseHair}
            onPickCustom={() => setColorPickerFor('hair')}
          />
        )}
        {activeTab === 'colors' && (
          <ColorsTab
            unlockedPacks={unlockedPacks}
            coins={coins}
            onApplyPack={handlePurchasePack}
          />
        )}
        {activeTab === 'pets' && <PetsTab />}
        {activeTab === 'emotes' && <EmotesTab onPlay={setPreviewEmoteId} />}
      </ScrollView>

      {/* HSL Color Picker Modal */}
      <HSLColorPicker
        visible={colorPickerFor !== null}
        initialColor={colorPickerFor === 'skin' ? cust.skinColor : cust.hairColor}
        title={colorPickerFor === 'skin' ? 'Pick Skin Tone' : 'Pick Hair Color'}
        onClose={() => setColorPickerFor(null)}
        onConfirm={(hex) => {
          if (colorPickerFor === 'skin') setSkinColor(hex);
          else if (colorPickerFor === 'hair') setHairColor(hex);
        }}
      />
    </ScreenBackground>
  );
}

// ══ Outfit Tab ══════════════════════════════════════════════════

// Per-outfit color hints (matches Modern Civilians visual variations)
const OUTFIT_HINTS: Record<string, [string, string, string]> = {
  modern_civilians_01: ['#3a4a5e', '#4a5a75', '#2a2a30'], // navy hoodie + jeans
  modern_civilians_02: ['#7a3838', '#3a3a40', '#1a1a20'], // red tee + black
  modern_civilians_03: ['#e8e0d0', '#3a3a40', '#1a1a20'], // white tank + black
  modern_civilians_04: ['#5e4830', '#3a4a5e', '#2a2a30'], // brown varsity + navy
  modern_civilians_05: ['#1a3a5e', '#1a1a20', '#1a1a20'], // blue puffer
  modern_civilians_06: ['#e84393', '#3a3a40', '#3a3a40'], // pink crop + dark
  modern_civilians_07: ['#3a8a3a', '#2a2a30', '#2a2a30'], // green graphic
  modern_civilians_08: ['#f4f4f8', '#2a4a8a', '#1a1a20'], // white button-up + jeans
  modern_civilians_09: ['#5e3a8a', '#3a3a40', '#1a1a20'], // purple sweat
  modern_civilians_10: ['#1a1a1a', '#3a3a40', '#0a0a0a'], // black leather
  modern_civilians_11: ['#a83a3a', '#3a3a40', '#5e3a3a'], // red flannel
  modern_civilians_12: ['#3a4a5e', '#3a4a5e', '#2a2a30'], // long sleeve navy
};

const SPECIES_CHIPS: { id: 'all' | Species; label: string; icon: string }[] = [
  { id: 'all',      label: 'All',      icon: '\u{1F465}' },
  { id: 'human',    label: 'Human',    icon: '\u{1F464}' },
  { id: 'elves',    label: 'Elf',      icon: '\u{1F9DD}' },
  { id: 'goblin',   label: 'Goblin',   icon: '\u{1F47A}' },
  { id: 'skeleton', label: 'Skeleton', icon: '\u{1F480}' },
  { id: 'zombie',   label: 'Zombie',   icon: '\u{1F9DF}' },
];

// Quick shop item lookup by id (for price + rarity)
const SHOP_BY_ID: Record<string, typeof OUTFIT_SHOP_ITEMS[number]> = {};
for (const it of OUTFIT_SHOP_ITEMS) SHOP_BY_ID[it.id] = it;

function OutfitTab({ currentId, onSelect }: { currentId: OutfitId; onSelect: (id: OutfitId) => void }) {
  const [species, setSpecies] = useState<'all' | Species>('all');
  const [packFilter, setPackFilter] = useState<string | 'all'>('all');
  const ownedOutfits = useCharacterStore((s) => s.ownedOutfits);
  const unlockOutfit = useCharacterStore((s) => s.unlockOutfit);
  const coins = useShopStore((s) => s.coins);
  const spendCoins = useShopStore((s) => s.spendCoins);
  const unlockedSpecies = useCareerStore((s) => s.unlockedSpecies);

  // Filter outfits by species + pack
  const filteredOutfits = OUTFIT_IDS.filter((id) => {
    const o = OUTFITS[id];
    if (species !== 'all' && o.species !== species) return false;
    if (packFilter !== 'all' && o.pack !== packFilter) return false;
    return true;
  });

  // Packs available for the selected species
  const availablePacks = PACKS.filter((p) => species === 'all' || p.species === species);

  const handleTap = (id: string) => {
    const owned = ownedOutfits.includes(id);
    if (owned) {
      onSelect(id as OutfitId);
      haptics.tap();
      return;
    }
    const shopItem = SHOP_BY_ID[id];
    const price = shopItem?.price ?? 500;
    if (price === 0) {
      unlockOutfit(id);
      onSelect(id as OutfitId);
      haptics.win();
      playSound('purchase');
      return;
    }
    if (coins < price) { haptics.error(); return; }
    if (spendCoins(price)) {
      unlockOutfit(id);
      onSelect(id as OutfitId);
      haptics.win();
      playSound('purchase');
    }
  };

  return (
    <View>
      <Text style={styles.sectionTitle}>OUTFITS</Text>
      <Text style={styles.sectionSub}>{filteredOutfits.length} of {OUTFIT_IDS.length} outfits</Text>

      {/* Species chips — locked species show a padlock and refuse selection */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }} contentContainerStyle={{ gap: 6, paddingRight: 20 }}>
        {SPECIES_CHIPS.map((sp) => {
          const isLocked = sp.id !== 'all' && !unlockedSpecies.includes(sp.id);
          return (
            <PressScale key={sp.id} onPress={() => {
              if (isLocked) { haptics.error(); return; }
              haptics.tap();
              setSpecies(sp.id);
              setPackFilter('all');
            }}>
              <View style={[
                petsStyles.packChip,
                species === sp.id && petsStyles.packChipActive,
                isLocked && { opacity: 0.45 },
              ]}>
                <Text style={[petsStyles.packChipText, species === sp.id && petsStyles.packChipTextActive]}>
                  {isLocked ? '\u{1F512} ' : sp.icon + ' '}{sp.label}
                </Text>
              </View>
            </PressScale>
          );
        })}
      </ScrollView>

      {/* Pack chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 6, paddingRight: 20 }}>
        <PressScale onPress={() => { haptics.tap(); setPackFilter('all'); }}>
          <View style={[petsStyles.packChip, packFilter === 'all' && petsStyles.packChipActive]}>
            <Text style={[petsStyles.packChipText, packFilter === 'all' && petsStyles.packChipTextActive]}>All Packs</Text>
          </View>
        </PressScale>
        {availablePacks.map((p) => (
          <PressScale key={`${p.species}_${p.pack}`} onPress={() => { haptics.tap(); setPackFilter(p.pack); }}>
            <View style={[petsStyles.packChip, packFilter === p.pack && petsStyles.packChipActive]}>
              <Text style={[petsStyles.packChipText, packFilter === p.pack && petsStyles.packChipTextActive]}>{p.label}</Text>
            </View>
          </PressScale>
        ))}
      </ScrollView>

      {/* Grid */}
      <View style={styles.grid}>
        {filteredOutfits.map((id) => {
          const outfit = OUTFITS[id];
          const isEquipped = id === currentId;
          const owned = ownedOutfits.includes(id);
          const shopItem = SHOP_BY_ID[id];
          const price = shopItem?.price ?? 500;
          return (
            <PressScale key={id} onPress={() => handleTap(id)}>
              <View style={[styles.outfitCard, isEquipped && styles.outfitCardActive]}>
                <LinearGradient
                  colors={isEquipped ? ['rgba(255,140,0,0.25)', 'rgba(255,140,0,0.08)'] : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
                  style={styles.outfitCardInner}
                >
                  <Text style={styles.outfitNum}>{String(outfit.index).padStart(2, '0')}</Text>
                  <Text style={styles.outfitName} numberOfLines={1}>{outfit.packLabel}</Text>
                  {isEquipped ? (
                    <Text style={styles.equippedPill}>EQUIPPED</Text>
                  ) : owned ? (
                    <Text style={petsStyles.ownedPill}>OWNED</Text>
                  ) : price === 0 ? (
                    <Text style={petsStyles.freePill}>FREE</Text>
                  ) : (
                    <Text style={petsStyles.pricePill}>{price}🪙</Text>
                  )}
                </LinearGradient>
              </View>
            </PressScale>
          );
        })}
      </View>
    </View>
  );
}

// ══ Body Tab ════════════════════════════════════════════════════

// Body type presets (one-tap common builds)
const BODY_PRESETS = [
  { id: 'athletic_m', name: 'Athletic M', icon: '💪', bodyType: 10, bodySize: 50, muscle: 70 },
  { id: 'slim_m',     name: 'Slim M',     icon: '🏃', bodyType: 15, bodySize: 30, muscle: 40 },
  { id: 'heavy_m',    name: 'Heavy M',    icon: '🐻', bodyType: 10, bodySize: 85, muscle: 55 },
  { id: 'buff_m',     name: 'Buff M',     icon: '🏋️', bodyType: 5,  bodySize: 60, muscle: 95 },
  { id: 'athletic_f', name: 'Athletic F', icon: '🤸', bodyType: 85, bodySize: 50, muscle: 65 },
  { id: 'slim_f',     name: 'Slim F',     icon: '💃', bodyType: 90, bodySize: 25, muscle: 35 },
  { id: 'curvy_f',    name: 'Curvy F',    icon: '🌺', bodyType: 92, bodySize: 70, muscle: 45 },
  { id: 'strong_f',   name: 'Strong F',   icon: '🥇', bodyType: 80, bodySize: 55, muscle: 85 },
];

function BodyTab({ bodyType, bodySize, muscle, onBodyType, onBodySize, onMuscle }: {
  bodyType: number; bodySize: number; muscle: number;
  onBodyType: (v: number) => void; onBodySize: (v: number) => void; onMuscle: (v: number) => void;
}) {
  const applyPreset = (p: typeof BODY_PRESETS[number]) => {
    haptics.win();
    onBodyType(p.bodyType);
    onBodySize(p.bodySize);
    onMuscle(p.muscle);
  };

  return (
    <View>
      <Text style={styles.sectionTitle}>QUICK PRESETS</Text>
      <Text style={styles.sectionSub}>One-tap body types</Text>
      <View style={styles.presetsGrid}>
        {BODY_PRESETS.map((p) => (
          <PressScale key={p.id} onPress={() => applyPreset(p)}>
            <View style={styles.presetCard}>
              <Text style={styles.presetIcon}>{p.icon}</Text>
              <Text style={styles.presetName}>{p.name}</Text>
            </View>
          </PressScale>
        ))}
      </View>

      <Text style={styles.sectionTitle}>FINE-TUNE</Text>
      <Text style={styles.sectionSub}>Custom sliders</Text>

      <SliderRow
        label="Gender"
        leftLabel="Masculine"
        rightLabel="Feminine"
        value={bodyType}
        onChange={onBodyType}
      />
      <SliderRow
        label="Build"
        leftLabel="Skinny"
        rightLabel="Heavy"
        value={bodySize}
        onChange={onBodySize}
      />
      <SliderRow
        label="Muscle"
        leftLabel="Lean"
        rightLabel="Buff"
        value={muscle}
        onChange={onMuscle}
      />
    </View>
  );
}

function SliderRow({ label, leftLabel, rightLabel, value, onChange }: {
  label: string; leftLabel: string; rightLabel: string; value: number; onChange: (v: number) => void;
}) {
  const handleStep = (direction: number) => {
    haptics.tap();
    const newVal = Math.max(0, Math.min(100, value + direction * 10));
    onChange(newVal);
  };

  return (
    <View style={styles.sliderRow}>
      <View style={styles.sliderHeader}>
        <Text style={styles.sliderLabel}>{label}</Text>
        <Text style={styles.sliderValue}>{Math.round(value)}</Text>
      </View>
      <View style={styles.sliderEndLabels}>
        <Text style={styles.sliderEndLabel}>{leftLabel}</Text>
        <Text style={styles.sliderEndLabel}>{rightLabel}</Text>
      </View>
      <View style={styles.sliderRowControls}>
        <PressScale onPress={() => handleStep(-1)}>
          <View style={styles.stepBtn}><Text style={styles.stepIcon}>−</Text></View>
        </PressScale>
        <View style={styles.sliderTrack}>
          <View style={[styles.sliderFill, { width: `${value}%` }]} />
          <View style={[styles.sliderThumb, { left: `${value}%` }]} />
        </View>
        <PressScale onPress={() => handleStep(1)}>
          <View style={styles.stepBtn}><Text style={styles.stepIcon}>+</Text></View>
        </PressScale>
      </View>
    </View>
  );
}

// ══ Skin Tab ════════════════════════════════════════════════════

function SkinTab({ currentColor, onSelect, onPickCustom }: {
  currentColor: string;
  onSelect: (hex: string) => void;
  onPickCustom: () => void;
}) {
  return (
    <View>
      <Text style={styles.sectionTitle}>SKIN TONE</Text>
      <Text style={styles.sectionSub}>All colors free — pick anything</Text>
      <View style={styles.colorGrid}>
        {SKIN_TONES.map((hex) => (
          <PressScale key={hex} onPress={() => { haptics.tap(); onSelect(hex); }}>
            <View style={[styles.colorSwatch, { backgroundColor: hex }, currentColor === hex && styles.colorSwatchActive]}>
              {currentColor === hex && <Text style={styles.checkMark}>✓</Text>}
            </View>
          </PressScale>
        ))}
        {/* Custom color picker button */}
        <PressScale onPress={() => { haptics.tap(); onPickCustom(); }}>
          <View style={styles.customColorBtn}>
            <LinearGradient
              colors={['#ff4e8a', '#ffad5a', '#ffee5a', '#5aff8a', '#5aaaff', '#b45aff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill as any}
            />
            <Text style={styles.customColorIcon}>🎨</Text>
          </View>
        </PressScale>
      </View>
    </View>
  );
}

// ══ Hair Tab ════════════════════════════════════════════════════

function HairTab({ currentColor, unlocked, coins, onFreeSelect, onPremiumPurchase, onPickCustom }: {
  currentColor: string;
  unlocked: string[];
  coins: number;
  onFreeSelect: (hex: string) => void;
  onPremiumPurchase: (id: string, hex: string, price: number) => void;
  onPickCustom: () => void;
}) {
  const unlockedHex = PREMIUM_HAIR_COLORS.filter(c => unlocked.includes(c.id)).map(c => c.hex);
  const isCustomColor = !FREE_HAIR_COLORS.includes(currentColor) && !unlockedHex.includes(currentColor);

  return (
    <View>
      <Text style={styles.sectionTitle}>NATURAL COLORS</Text>
      <Text style={styles.sectionSub}>Free</Text>
      <View style={styles.colorGrid}>
        {FREE_HAIR_COLORS.map((hex) => (
          <PressScale key={hex} onPress={() => { haptics.tap(); onFreeSelect(hex); }}>
            <View style={[styles.colorSwatch, { backgroundColor: hex }, currentColor === hex && styles.colorSwatchActive]}>
              {currentColor === hex && <Text style={styles.checkMark}>✓</Text>}
            </View>
          </PressScale>
        ))}
      </View>

      <Text style={styles.sectionTitle}>PREMIUM COLORS</Text>
      <Text style={styles.sectionSub}>Unlock with coins</Text>
      <View style={styles.colorGrid}>
        {PREMIUM_HAIR_COLORS.map((c) => {
          const isUnlocked = unlocked.includes(c.id);
          const isEquipped = currentColor === c.hex;
          const canAfford = coins >= c.price;
          return (
            <PressScale key={c.id} onPress={() => onPremiumPurchase(c.id, c.hex, c.price)}>
              <View style={[styles.premiumColorSwatch, { backgroundColor: c.hex }, isEquipped && styles.colorSwatchActive]}>
                {isEquipped && <Text style={styles.checkMark}>✓</Text>}
                {!isUnlocked && (
                  <View style={styles.premiumOverlay}>
                    <Text style={styles.premiumPrice}>🪙{c.price}</Text>
                  </View>
                )}
              </View>
            </PressScale>
          );
        })}
      </View>

      <Text style={styles.sectionTitle}>CUSTOM COLOR</Text>
      <Text style={styles.sectionSub}>{isCustomColor ? 'Currently using a custom color' : 'Pick any color with the full HSL picker'}</Text>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <PressScale onPress={() => { haptics.tap(); onPickCustom(); }}>
          <View style={styles.customColorBtn}>
            <LinearGradient
              colors={['#ff4e8a', '#ffad5a', '#ffee5a', '#5aff8a', '#5aaaff', '#b45aff']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill as any}
            />
            <Text style={styles.customColorIcon}>🎨</Text>
          </View>
        </PressScale>
        {isCustomColor && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={[styles.currentColorDot, { backgroundColor: currentColor }]} />
            <Text style={styles.currentColorHex}>{currentColor.toUpperCase()}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ══ Outfit Colors Tab ═══════════════════════════════════════════

function ColorsTab({ unlockedPacks, coins, onApplyPack }: {
  unlockedPacks: string[];
  coins: number;
  onApplyPack: (pack: typeof PREMIUM_OUTFIT_PACKS[number] | typeof FREE_OUTFIT_PACKS[number]) => void;
}) {
  return (
    <View>
      <Text style={styles.sectionTitle}>FREE COLORWAYS</Text>
      <Text style={styles.sectionSub}>Apply to current outfit</Text>
      <View style={styles.packGrid}>
        {FREE_OUTFIT_PACKS.map((pack) => (
          <PackCard key={pack.id} pack={pack} unlocked coins={coins} onPress={() => onApplyPack(pack)} />
        ))}
      </View>

      <Text style={styles.sectionTitle}>PREMIUM PACKS</Text>
      <Text style={styles.sectionSub}>Themed color bundles</Text>
      <View style={styles.packGrid}>
        {PREMIUM_OUTFIT_PACKS.map((pack) => {
          const isUnlocked = unlockedPacks.includes(pack.id);
          return <PackCard key={pack.id} pack={pack} unlocked={isUnlocked} coins={coins} onPress={() => onApplyPack(pack)} />;
        })}
      </View>
    </View>
  );
}

function PackCard({ pack, unlocked, coins, onPress }: {
  pack: typeof PREMIUM_OUTFIT_PACKS[number] | typeof FREE_OUTFIT_PACKS[number];
  unlocked: boolean;
  coins: number;
  onPress: () => void;
}) {
  // Preview the pack's colors as swatches
  const swatchColors = Object.values(pack.colors).slice(0, 4);
  const canAfford = coins >= pack.price;
  return (
    <PressScale onPress={onPress}>
      <View style={styles.packCard}>
        <View style={styles.packSwatchRow}>
          {swatchColors.length > 0 ? (
            swatchColors.map((hex, i) => (
              <View key={i} style={[styles.packSwatch, { backgroundColor: hex }]} />
            ))
          ) : (
            <Text style={styles.packEmpty}>Default Synty</Text>
          )}
        </View>
        <Text style={styles.packName}>{pack.name}</Text>
        {unlocked ? (
          <Text style={styles.packOwned}>APPLY</Text>
        ) : (
          <View style={[styles.packPrice, !canAfford && { opacity: 0.5 }]}>
            <Text style={styles.packPriceText}>🪙 {pack.price}</Text>
          </View>
        )}
      </View>
    </PressScale>
  );
}

// ══ Styles ══════════════════════════════════════════════════════

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 8,
  },
  backBtn: { padding: 8, marginRight: 8 },
  backIcon: { fontSize: 32, color: '#fff', fontWeight: '300' },
  title: {
    flex: 1, fontFamily: fonts.heading, fontWeight: weight.black,
    fontSize: 22, color: '#fff', letterSpacing: 2,
  },
  coinBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.25)',
  },
  coinEmoji: { fontSize: 14 },
  coinValue: {
    fontFamily: fonts.body, fontWeight: weight.bold,
    fontSize: 13, color: colors.coinGold,
  },

  previewArea: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 4,
  },

  tabRow: {
    flexDirection: 'row', paddingHorizontal: 10, gap: 4,
    marginBottom: 8, marginTop: 4,
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4,
    borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)',
    minWidth: 60,
  },
  tabActive: {
    backgroundColor: 'rgba(255,140,0,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,140,0,0.4)',
  },
  tabIcon: { fontSize: 20, marginBottom: 2 },
  tabLabel: { fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.5 },
  tabLabelActive: { color: colors.orange },

  content: { flex: 1 },
  contentInner: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },

  sectionTitle: {
    fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 13,
    color: '#fff', letterSpacing: 1.5, marginBottom: 2, marginTop: 12,
  },
  sectionSub: {
    fontFamily: fonts.body, fontWeight: weight.regular, fontSize: 11,
    color: colors.textMuted, marginBottom: 10,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  outfitCard: {
    borderRadius: 12, overflow: 'hidden', width: 100,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  outfitHintRow: {
    flexDirection: 'row', gap: 3, marginBottom: 4, height: 6,
  },
  outfitHintSwatch: {
    flex: 1, borderRadius: 2,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)',
  },
  outfitCardActive: {
    borderColor: 'rgba(255,140,0,0.6)',
  },
  outfitCardInner: {
    padding: 10, alignItems: 'center', gap: 2, minHeight: 72,
    justifyContent: 'center',
  },
  outfitNum: {
    fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 18,
    color: colors.orange, letterSpacing: 1,
  },
  outfitName: {
    fontFamily: fonts.body, fontWeight: weight.semibold, fontSize: 10,
    color: '#fff', textAlign: 'center',
  },
  equippedPill: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 8,
    color: colors.coinGold, letterSpacing: 0.8, marginTop: 2,
  },

  sliderRow: { marginBottom: 18 },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sliderLabel: {
    fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 14,
    color: '#fff', letterSpacing: 0.5,
  },
  sliderValue: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 14,
    color: colors.orange,
  },
  sliderEndLabels: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 2, marginBottom: 8,
  },
  sliderEndLabel: {
    fontFamily: fonts.body, fontWeight: weight.medium, fontSize: 10,
    color: colors.textMuted,
  },
  sliderRowControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,140,0,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,140,0,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  stepIcon: {
    fontFamily: fonts.heading, fontWeight: weight.bold, fontSize: 24,
    color: colors.orange, lineHeight: 28,
  },
  sliderTrack: {
    flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 4, position: 'relative', overflow: 'visible',
  },
  sliderFill: {
    position: 'absolute', top: 0, left: 0, bottom: 0,
    backgroundColor: colors.orange, borderRadius: 4,
  },
  sliderThumb: {
    position: 'absolute', top: -4, width: 16, height: 16,
    borderRadius: 8, backgroundColor: '#fff', marginLeft: -8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 3, elevation: 3,
  },

  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colorSwatch: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  colorSwatchActive: {
    borderColor: colors.orange, borderWidth: 3,
  },
  checkMark: {
    fontFamily: fonts.body, fontWeight: weight.black, fontSize: 18,
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
  premiumColorSwatch: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden', position: 'relative',
  },
  premiumOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  premiumPrice: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 10,
    color: colors.coinGold,
  },

  packGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  packCard: {
    width: 100, backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12, padding: 10, gap: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  packSwatchRow: { flexDirection: 'row', gap: 3, height: 20 },
  packSwatch: { flex: 1, borderRadius: 3 },
  packEmpty: {
    fontFamily: fonts.body, fontWeight: weight.medium, fontSize: 9,
    color: colors.textMuted, alignSelf: 'center',
  },
  packName: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 11,
    color: '#fff', marginTop: 4,
  },
  packPrice: {
    backgroundColor: 'rgba(255,215,0,0.15)', borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 3, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)',
  },
  packPriceText: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 10,
    color: colors.coinGold,
  },
  packOwned: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 10,
    color: colors.green, letterSpacing: 1, textAlign: 'center',
    backgroundColor: 'rgba(39,174,61,0.12)', borderRadius: 6, paddingVertical: 3,
  },

  // ── Body preset grid ──
  presetsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8,
  },
  presetCard: {
    width: 82, paddingVertical: 10, paddingHorizontal: 6,
    borderRadius: 12, backgroundColor: 'rgba(255,140,0,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,140,0,0.2)',
    alignItems: 'center', gap: 4,
  },
  presetIcon: { fontSize: 22 },
  presetName: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 10,
    color: colors.orange, letterSpacing: 0.3, textAlign: 'center',
  },

  // ── Custom color picker button ──
  customColorBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#fff', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  customColorIcon: {
    fontSize: 18,
    textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2,
  },
  currentColorDot: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
  },
  currentColorHex: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 11,
    color: colors.textSecondary, letterSpacing: 0.5,
  },
});

// ══ Pets Tab ════════════════════════════════════════════════════

function PetsTab() {
  const activePetId = usePetStore((s) => s.activePetId);
  const ownedPets = usePetStore((s) => s.ownedPets);
  const setActivePet = usePetStore((s) => s.setActivePet);
  const purchasePet = usePetStore((s) => s.purchasePet);
  const coins = useShopStore((s) => s.coins);
  const spendCoins = useShopStore((s) => s.spendCoins);

  const handleTap = (id: PetId) => {
    const pet = PETS[id];
    if (ownedPets.includes(id)) {
      setActivePet(id);
      haptics.tap();
      return;
    }
    if (coins < pet.price) {
      haptics.error();
      return;
    }
    const result = purchasePet(id, coins);
    if (result.ok) {
      spendCoins(result.cost);
      haptics.win();
      playSound('purchase');
    }
  };

  return (
    <View style={{ gap: 12 }}>
      <Text style={petsStyles.helpText}>
        Pets walk beside you on every screen. Tap to equip, or unlock with coins.
      </Text>
      <View style={petsStyles.cardGrid}>
        {PET_IDS.map((id) => {
          const pet = PETS[id];
          const owned = ownedPets.includes(id);
          const active = activePetId === id;
          const locked = !owned && !!pet.unlockVia && pet.rarity === 'legendary';
          return (
            <PressScale key={id} onPress={() => handleTap(id)}>
              <View style={[petsStyles.petCard, active && petsStyles.petCardActive, locked && petsStyles.petCardLocked]}>
                <Text style={petsStyles.petEmoji}>{emojiForPet(id)}</Text>
                <Text style={petsStyles.petName} numberOfLines={1}>{pet.name}</Text>
                <Text style={petsStyles.petPrice}>
                  {owned ? (active ? 'ACTIVE' : 'OWNED') : locked ? '🔒' : `${pet.price}🪙`}
                </Text>
              </View>
            </PressScale>
          );
        })}
      </View>
    </View>
  );
}

function emojiForPet(id: PetId): string {
  const e: Partial<Record<PetId, string>> = {
    dog_labrador: '🦮', dog_golden_retrieve: '🐕', dog_shiba: '🐕', dog_dalmatian: '🐕‍🦺',
    dog_husky: '🐺', dog_wolf: '🐺', dog_coyote: '🐺', dog_fox: '🦊',
    dog_hellhound: '👹', dog_robot: '🤖', dog_scifi: '🛸',
  };
  return e[id] ?? '🐕';
}

// ══ Emotes Tab ══════════════════════════════════════════════════

function EmotesTab({ onPlay }: { onPlay: (id: string) => void }) {
  const ownedEmotes = useShopStore((s) => s.ownedEmotes);
  const coins = useShopStore((s) => s.coins);
  const purchaseEmote = useShopStore((s) => s.purchaseEmote);

  const handleTap = (id: string, price: number) => {
    if (ownedEmotes.includes(id) || price === 0) {
      // Preview the emote on the 3D character
      haptics.tap();
      onPlay(id);
      return;
    }
    if (coins < price) {
      haptics.error();
      return;
    }
    purchaseEmote(id, price);
    // Auto-play after purchase so the player sees what they bought
    onPlay(id);
    haptics.win();
    playSound('purchase');
  };

  return (
    <View style={{ gap: 10 }}>
      <Text style={petsStyles.helpText}>
        Unlock dances, taunts, and celebrations. Owned emotes fit your 6-slot wheel.
      </Text>
      <View style={petsStyles.emoteGrid}>
        {HUMAN_EMOTES.map((e) => {
          const owned = ownedEmotes.includes(e.id);
          const price = e.price ?? 500;
          return (
            <PressScale key={e.id} onPress={() => handleTap(e.id, price)}>
              <View style={[petsStyles.emoteCard, owned && petsStyles.petCardActive]}>
                <Text style={petsStyles.emoteIcon}>{iconForEmote(e.category)}</Text>
                <View style={petsStyles.emoteMeta}>
                  <Text style={petsStyles.emoteName} numberOfLines={1}>{e.name}</Text>
                  <Text style={petsStyles.emoteCategory}>{e.category.toUpperCase()}</Text>
                </View>
                <Text style={petsStyles.petPrice}>
                  {owned ? '✓' : `${price}🪙`}
                </Text>
              </View>
            </PressScale>
          );
        })}
      </View>
    </View>
  );
}

function iconForEmote(cat: string): string {
  switch (cat) {
    case 'dance': return '💃';
    case 'taunt': return '😤';
    case 'greet': return '👋';
    default: return '✨';
  }
}

const petsStyles = StyleSheet.create({
  helpText: {
    fontFamily: fonts.body, fontSize: 12, color: colors.textSecondary,
    textAlign: 'center', letterSpacing: 0.3,
  },
  cardGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  emoteGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between',
  },
  petCard: {
    width: 100, aspectRatio: 0.85, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    padding: 8, alignItems: 'center', justifyContent: 'space-between',
  },
  petCardActive: {
    borderColor: colors.orange, backgroundColor: 'rgba(255,140,0,0.1)',
  },
  petCardLocked: { opacity: 0.55 },
  petEmoji: { fontSize: 34 },
  petName: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 11,
    color: '#fff', textAlign: 'center',
  },
  petPrice: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 10,
    color: colors.orange, letterSpacing: 0.5,
  },
  emoteCard: {
    width: 160, borderRadius: 14, padding: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  emoteIcon: { fontSize: 22 },
  emoteMeta: { flex: 1 },
  emoteName: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 12, color: '#fff',
  },
  emoteCategory: {
    fontFamily: fonts.body, fontSize: 10, color: colors.textSecondary,
  },
  packChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  packChipActive: {
    backgroundColor: 'rgba(255,140,0,0.25)',
    borderColor: colors.orange,
  },
  packChipText: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 11,
    color: colors.textSecondary, letterSpacing: 0.3,
  },
  packChipTextActive: {
    color: '#fff',
  },
  ownedPill: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 9,
    color: colors.textSecondary, letterSpacing: 0.8,
  },
  freePill: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 10,
    color: '#4ade80', letterSpacing: 0.5,
  },
  pricePill: {
    fontFamily: fonts.body, fontWeight: weight.bold, fontSize: 10,
    color: colors.orange, letterSpacing: 0.5,
  },
});
