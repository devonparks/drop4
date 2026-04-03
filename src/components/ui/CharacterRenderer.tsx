import React from 'react';
import { View, Image, StyleSheet, ImageSourcePropType } from 'react-native';
import { useCharacterStore, CharacterConfig, Gender } from '../../stores/characterStore';

// All character layer images must be statically required for React Native bundler
const LAYERS: Record<string, Record<string, ImageSourcePropType>> = {
  // Male body layers
  'male/body/head': require('../../assets/images/character-layers/male/body/head.png'),
  'male/body/neck': require('../../assets/images/character-layers/male/body/neck.png'),
  'male/body/face': require('../../assets/images/character-layers/male/body/face.png'),
  'male/body/ears': require('../../assets/images/character-layers/male/body/ears.png'),
  'male/body/eyewhite': require('../../assets/images/character-layers/male/body/eyewhite.png'),
  'male/body/irides': require('../../assets/images/character-layers/male/body/irides.png'),
  'male/body/eyebrow': require('../../assets/images/character-layers/male/body/eyebrow.png'),
  'male/body/eyelash': require('../../assets/images/character-layers/male/body/eyelash.png'),
  'male/body/nose': require('../../assets/images/character-layers/male/body/nose.png'),
  'male/body/mouth': require('../../assets/images/character-layers/male/body/mouth.png'),
  'male/body/legs': require('../../assets/images/character-layers/male/body/legs.png'),
  // Male clothing
  'male/hair/short': require('../../assets/images/character-layers/male/hair/short.png'),
  'male/hair/afro': require('../../assets/images/character-layers/male/hair/afro.png'),
  'male/hair/locs-front': require('../../assets/images/character-layers/male/hair/locs-front.png'),
  'male/top/white-tee': require('../../assets/images/character-layers/male/top/white-tee.png'),
  'male/top/hoodie': require('../../assets/images/character-layers/male/top/hoodie.png'),
  'male/bottom/jeans': require('../../assets/images/character-layers/male/bottom/jeans.png'),
  'male/bottom/shorts': require('../../assets/images/character-layers/male/bottom/shorts.png'),
  'male/shoes/sneakers': require('../../assets/images/character-layers/male/shoes/sneakers.png'),
  'male/shoes/barefoot': require('../../assets/images/character-layers/male/shoes/barefoot.png'),
  // Female body layers
  'female/body/head': require('../../assets/images/character-layers/female/body/head.png'),
  'female/body/neck': require('../../assets/images/character-layers/female/body/neck.png'),
  'female/body/face': require('../../assets/images/character-layers/female/body/face.png'),
  'female/body/ears': require('../../assets/images/character-layers/female/body/ears.png'),
  'female/body/eyewhite': require('../../assets/images/character-layers/female/body/eyewhite.png'),
  'female/body/irides': require('../../assets/images/character-layers/female/body/irides.png'),
  'female/body/eyebrow': require('../../assets/images/character-layers/female/body/eyebrow.png'),
  'female/body/eyelash': require('../../assets/images/character-layers/female/body/eyelash.png'),
  'female/body/nose': require('../../assets/images/character-layers/female/body/nose.png'),
  'female/body/mouth': require('../../assets/images/character-layers/female/body/mouth.png'),
  'female/body/arms': require('../../assets/images/character-layers/female/body/arms.png'),
  // Female clothing
  'female/hair/braids': require('../../assets/images/character-layers/female/hair/braids.png'),
  'female/hair/bun': require('../../assets/images/character-layers/female/hair/bun.png'),
  'female/hair/afro': require('../../assets/images/character-layers/female/hair/afro.png'),
  'female/hair/locs': require('../../assets/images/character-layers/female/hair/locs.png'),
  'female/top/white-tee': require('../../assets/images/character-layers/female/top/white-tee.png'),
  'female/top/hoodie': require('../../assets/images/character-layers/female/top/hoodie.png'),
  'female/top/bomber': require('../../assets/images/character-layers/female/top/bomber.png'),
  'female/top/crop-top': require('../../assets/images/character-layers/female/top/crop-top.png'),
  'female/bottom/jeans': require('../../assets/images/character-layers/female/bottom/jeans.png'),
  'female/bottom/cargo': require('../../assets/images/character-layers/female/bottom/cargo.png'),
  'female/bottom/joggers': require('../../assets/images/character-layers/female/bottom/joggers.png'),
  'female/bottom/skirt': require('../../assets/images/character-layers/female/bottom/skirt.png'),
  'female/shoes/af1': require('../../assets/images/character-layers/female/shoes/af1.png'),
  'female/shoes/jordans': require('../../assets/images/character-layers/female/shoes/jordans.png'),
  'female/shoes/platforms': require('../../assets/images/character-layers/female/shoes/platforms.png'),
} as any;

function getLayer(gender: Gender, category: string, item: string): ImageSourcePropType | null {
  const key = `${gender}/${category}/${item}`;
  return LAYERS[key] || null;
}

// Skin tone tints (applied to face/body layers)
const SKIN_TONES = [
  undefined,               // 0: no tint (default light)
  '#D4A574',               // 1: light brown
  '#C68642',               // 2: medium
  '#8D5524',               // 3: brown
  '#5C3A1E',               // 4: dark brown
  '#3B2314',               // 5: deep
];

interface CharacterRendererProps {
  size: number;             // Container size in px
  headOnly?: boolean;       // Only render head (for profile pic / small avatars)
  config?: CharacterConfig; // Override config (for previewing changes)
  style?: any;
}

export function CharacterRenderer({ size, headOnly = false, config: overrideConfig, style }: CharacterRendererProps) {
  const storeConfig = useCharacterStore(s => s.config);
  const config = overrideConfig || storeConfig;
  const { gender, skinTone, hair, top, bottom, shoes } = config;

  // Body layers to render (ordered bottom to top)
  const bodyLayers = gender === 'male'
    ? ['body/legs', 'body/neck', 'body/head', 'body/face', 'body/ears', 'body/eyewhite', 'body/irides', 'body/eyebrow', 'body/eyelash', 'body/nose', 'body/mouth']
    : ['body/arms', 'body/neck', 'body/head', 'body/face', 'body/ears', 'body/eyewhite', 'body/irides', 'body/eyebrow', 'body/eyelash', 'body/nose', 'body/mouth'];

  const headLayers = ['body/head', 'body/face', 'body/ears', 'body/eyewhite', 'body/irides', 'body/eyebrow', 'body/eyelash', 'body/nose', 'body/mouth'];

  const layersToRender = headOnly ? headLayers : bodyLayers;
  const skinTint = SKIN_TONES[skinTone];
  const skinLayerNames = ['body/head', 'body/face', 'body/ears', 'body/neck', 'body/legs', 'body/arms'];

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {/* Body/head layers */}
      {layersToRender.map((layerName, i) => {
        const source = getLayer(gender, layerName.split('/')[0], layerName.split('/')[1]);
        if (!source) return null;
        const isSkin = skinLayerNames.includes(layerName);
        return (
          <Image
            key={layerName}
            source={source}
            style={[styles.layer, { zIndex: i }]}
            resizeMode="contain"
            tintColor={isSkin && skinTint ? skinTint : undefined}
          />
        );
      })}

      {/* Clothing layers (only in full body mode) */}
      {!headOnly && (
        <>
          {/* Bottom */}
          {getLayer(gender, 'bottom', bottom) && (
            <Image
              source={getLayer(gender, 'bottom', bottom)!}
              style={[styles.layer, { zIndex: 20 }]}
              resizeMode="contain"
            />
          )}
          {/* Shoes */}
          {getLayer(gender, 'shoes', shoes) && (
            <Image
              source={getLayer(gender, 'shoes', shoes)!}
              style={[styles.layer, { zIndex: 21 }]}
              resizeMode="contain"
            />
          )}
          {/* Top */}
          {getLayer(gender, 'top', top) && (
            <Image
              source={getLayer(gender, 'top', top)!}
              style={[styles.layer, { zIndex: 22 }]}
              resizeMode="contain"
            />
          )}
        </>
      )}

      {/* Hair (always on top) */}
      {getLayer(gender, 'hair', hair) && (
        <Image
          source={getLayer(gender, 'hair', hair)!}
          style={[styles.layer, { zIndex: 30 }]}
          resizeMode="contain"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
});
